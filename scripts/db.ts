/**
 * Local PostgreSQL lifecycle helper.
 *
 *   npm run db:setup    ensure cluster running + migrate (used by dev/build/test)
 *   npm run db:migrate  same as setup
 *   tsx scripts/db.ts stop|status|reset
 *
 * Uses the PostgreSQL binaries shipped with the `embedded-postgres` platform
 * package, launched through `pg_ctl` so the cluster keeps running
 * independently of this process (no daemon needed).
 *
 * If DATABASE_URL already points at an external PostgreSQL server, nothing is
 * started locally and migrations are simply applied to that server.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, ".data", "pg");
const LOG_FILE = path.join(ROOT, ".data", "postgres.log");

const EMBEDDED = {
  user: process.env.EMBEDDED_PG_USER ?? "sheetapp",
  password: process.env.EMBEDDED_PG_PASSWORD ?? "sheetapp",
  port: Number(process.env.EMBEDDED_PG_PORT ?? 5433),
  database: process.env.EMBEDDED_PG_DATABASE ?? "sheetapp",
};

const EMBEDDED_URL = `postgresql://${EMBEDDED.user}:${EMBEDDED.password}@127.0.0.1:${EMBEDDED.port}/${EMBEDDED.database}`;

// ---------------------------------------------------------------------------
// env helpers
// ---------------------------------------------------------------------------

function loadEnvFile(file: string) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1];
    let value = m[2] ?? "";
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function loadEnv() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
}

function writeEnvUrl(url: string) {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(ROOT, file);
    let content = fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
    if (/^DATABASE_URL=/m.test(content)) {
      content = content.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${url}`);
    } else {
      content = `DATABASE_URL=${url}\n${content}`;
    }
    fs.writeFileSync(full, content, "utf8");
  }
}

function isEmbeddedUrl(url: string | undefined): boolean {
  if (!url) return true;
  return url.includes(`127.0.0.1:${EMBEDDED.port}`) || url.includes(`localhost:${EMBEDDED.port}`);
}

// ---------------------------------------------------------------------------
// binaries
// ---------------------------------------------------------------------------

const PLATFORM_PKGS: Record<string, string> = {
  "win32-x64": "windows-x64",
  "win32-ia32": "windows-ia32",
  "darwin-x64": "darwin-x64",
  "darwin-arm64": "darwin-arm64",
  "linux-x64": "linux-x64",
  "linux-arm64": "linux-arm64",
  "linux-ia32": "linux-ia32",
  "linux-arm": "linux-arm",
};

function binDir(): string {
  const key = `${process.platform}-${process.arch}`;
  const pkgName = PLATFORM_PKGS[key];
  if (!pkgName) {
    throw new Error(`Unsupported platform for embedded PostgreSQL: ${key}`);
  }
  const candidates = [
    path.join(ROOT, "node_modules", "embedded-postgres", "node_modules", "@embedded-postgres", pkgName, "native", "bin"),
    path.join(ROOT, "node_modules", "@embedded-postgres", pkgName, "native", "bin"),
  ];
  const dir = candidates.find((c) => fs.existsSync(c));
  if (!dir) {
    throw new Error(`PostgreSQL binaries missing for ${pkgName}. Run: npm install`);
  }
  return dir;
}

function bin(name: string): string {
  const p = path.join(binDir(), `${name}.exe`);
  if (!fs.existsSync(p)) {
    throw new Error(`PostgreSQL binary not found: ${p}. Run: npm install`);
  }
  return p;
}

function run(cmd: string, args: string[], opts: { allowFail?: boolean } = {}) {
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: "pipe", encoding: "utf8", windowsHide: true });
  if (res.error) {
    throw new Error(`Failed to launch ${path.basename(cmd)}: ${res.error.message}`);
  }
  if (res.status !== 0 && !opts.allowFail) {
    const out = `${res.stdout ?? ""}${res.stderr ?? ""}`.trim();
    throw new Error(`Command failed (${path.basename(cmd)} ${args.join(" ")}) [exit ${res.status}]:\n${out}`);
  }
  return res;
}

// ---------------------------------------------------------------------------
// cluster
// ---------------------------------------------------------------------------

async function canConnect(url: string, timeoutMs = 1500): Promise<boolean> {
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: timeoutMs });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

function clusterExists(): boolean {
  return fs.existsSync(path.join(DATA_DIR, "PG_VERSION"));
}

async function initialiseCluster() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  const pwFile = path.join(path.dirname(DATA_DIR), ".pgpw");
  fs.writeFileSync(pwFile, EMBEDDED.password, "utf8");
  run(bin("initdb"), [
    "-D", DATA_DIR,
    "-U", EMBEDDED.user,
    "--pwfile", pwFile,
    "--auth=scram-sha-256",
    "-E", "UTF8",
    "--locale=C",
  ]);
  fs.rmSync(pwFile, { force: true });
}

function startCluster() {
  run(bin("pg_ctl"), [
    "-D", DATA_DIR,
    "-l", LOG_FILE,
    "-o", `-p ${EMBEDDED.port} -c listen_addresses=127.0.0.1 -c log_min_duration_statement=-1`,
    "-w",
    "-t", "60",
    "start",
  ]);
}

function stopCluster() {
  run(bin("pg_ctl"), ["-D", DATA_DIR, "-m", "fast", "-w", "-t", "30", "stop"], { allowFail: true });
}

function clusterRunning(): boolean {
  if (!clusterExists()) return false;
  const res = run(bin("pg_ctl"), ["-D", DATA_DIR, "status"], { allowFail: true });
  return res.status === 0;
}

async function ensureDatabase(url: string) {
  const adminUrl = url.replace(/\/[^/?]+(\?|$)/, "/postgres$1");
  const client = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 3000 });
  await client.connect();
  try {
    const name = new URL(url).pathname.replace(/^\//, "").split("?")[0];
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
      console.log(`Created database "${name}"`);
    }
  } finally {
    await client.end().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// prisma
// ---------------------------------------------------------------------------

function prismaCli(args: string[]) {
  const cli = path.join(ROOT, "node_modules", "prisma", "build", "index.js");
  if (!fs.existsSync(cli)) {
    throw new Error("Prisma CLI not found. Run: npm install");
  }
  run(process.execPath, [cli, ...args]);
}

function prismaGenerate() {
  prismaCli(["generate"]);
}

function prismaMigrateDeploy() {
  prismaCli(["migrate", "deploy"]);
}

// ---------------------------------------------------------------------------
// commands
// ---------------------------------------------------------------------------

async function ensure() {
  loadEnv();

  if (!isEmbeddedUrl(process.env.DATABASE_URL)) {
    console.log("→ Using external DATABASE_URL");
    prismaGenerate();
    prismaMigrateDeploy();
    return;
  }

  if (!clusterExists()) {
    console.log("→ Initialising embedded PostgreSQL cluster…");
    initialiseCluster();
  }
  if (!clusterRunning()) {
    console.log("→ Starting embedded PostgreSQL…");
    startCluster();
  } else {
    console.log("→ Embedded PostgreSQL already running");
  }

  writeEnvUrl(EMBEDDED_URL);
  process.env.DATABASE_URL = EMBEDDED_URL;

  if (!(await canConnect(EMBEDDED_URL, 5000))) {
    throw new Error(`PostgreSQL started but is not accepting connections on port ${EMBEDDED.port}`);
  }

  await ensureDatabase(EMBEDDED_URL);
  prismaGenerate();
  prismaMigrateDeploy();
  console.log("✓ Database ready");
}

async function reset() {
  loadEnv();
  if (!clusterRunning()) {
    console.log("→ Starting embedded PostgreSQL…");
    startCluster();
  }
  const adminUrl = EMBEDDED_URL.replace(/\/[^/?]+(\?|$)/, "/postgres$1");
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS "${EMBEDDED.database}" WITH (FORCE)`);
    console.log("Dropped database");
  } finally {
    await client.end();
  }
  await ensureDatabase(EMBEDDED_URL);
  process.env.DATABASE_URL = EMBEDDED_URL;
  writeEnvUrl(EMBEDDED_URL);
  prismaMigrateDeploy();
  console.log("✓ Database reset complete");
}

async function main() {
  const cmd = process.argv[2] ?? "ensure";
  switch (cmd) {
    case "ensure":
    case "setup":
    case "migrate":
      await ensure();
      break;
    case "start":
      loadEnv();
      if (!clusterExists()) initialiseCluster();
      if (!clusterRunning()) startCluster();
      writeEnvUrl(EMBEDDED_URL);
      await ensureDatabase(EMBEDDED_URL);
      console.log("✓ Database running");
      break;
    case "stop":
      stopCluster();
      console.log("✓ Database stopped");
      break;
    case "status":
      console.log(clusterRunning() ? "running" : "stopped");
      break;
    case "reset":
      await reset();
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
