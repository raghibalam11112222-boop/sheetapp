/**
 * Section 5 — Authentication end-to-end verification.
 *
 * Covers: sign up, login, logout, password reset, protected routes,
 * post-registration redirect to onboarding, and session stability
 * (no bounce loops). Requires dev server on :3000 + DB running.
 *
 * Usage: node scripts/auth-flow.mjs
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.APP_URL || "http://localhost:3000";
const LOG = path.join(ROOT, ".data", "dev-out.log");
const stamp = Date.now();
const EMAIL = `auth5-${stamp}@example.com`;
const PASS = "e2e-password-123";
const PASS2 = "e2e-password-456";

const checks = [];
const ok = (c, m) => {
  checks.push(`${c ? "  OK  " : " FAIL "}${m}`);
  if (!c) process.exitCode = 1;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext();
const p = await ctx.newPage();
p.setDefaultTimeout(45000);
const errors = [];
p.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 120)));

// ---------- 1. SIGN UP -> onboarding ----------
await p.goto(`${BASE}/sign-up`, { waitUntil: "networkidle" });
await p.getByLabel("Full name").fill("Auth Five");
await p.getByLabel("Work email").fill(EMAIL);
await p.getByLabel("Password").fill(PASS);
await p.getByRole("button", { name: /create account/i }).click();
await p.getByRole("heading", { name: "Let's turn your spreadsheet into an app." }).waitFor();
ok(p.url().endsWith("/onboarding"), "sign-up redirects to /onboarding");
await sleep(5000);
ok(p.url().endsWith("/onboarding"), "session stable on /onboarding (no bounce after 5s)");
ok((await p.locator("body").innerText()).includes("What does your business use this spreadsheet for?"), "onboarding content rendered");

// ---------- 2. onboarding -> upload -> dashboard renders ----------
await p.getByRole("button", { name: "Continue" }).click();
await p.waitForURL(/\/onboarding\/upload/);
ok(/\/onboarding\/upload/.test(p.url()), "continue reaches upload step");
await p.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await sleep(3000);
const dashText = await p.locator("body").innerText();
ok(p.url().endsWith("/dashboard"), "dashboard URL stable");
ok(dashText.includes(EMAIL), "dashboard renders session-backed shell (user email)");
ok(dashText.length > 150, `dashboard body non-blank (${dashText.length} chars)`);

// ---------- 3. LOGOUT ----------
await p.getByRole("button", { name: new RegExp(EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click();
await p.getByRole("menuitem", { name: "Sign out" }).click();
await p.waitForURL(`${BASE}/`);
ok(p.url() === `${BASE}/`, "logout lands on public landing page");

// ---------- 4. PROTECTED ROUTES redirect when logged out ----------
for (const route of ["/dashboard", "/data", "/tables", "/settings", "/billing", "/onboarding"]) {
  const r = await p.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  // proxy 307 -> /sign-in?next=... ; browser follows
  ok(p.url().startsWith(`${BASE}/sign-in`), `${route} logged-out -> sign-in (got ${p.url()})`);
  void r;
}

// ---------- 5. LOGIN honors next ----------
await p.goto(`${BASE}/sign-in?next=${encodeURIComponent("/dashboard")}`, { waitUntil: "networkidle" });
await p.getByLabel("Email").fill(EMAIL);
await p.getByLabel("Password").fill(PASS);
await p.getByRole("button", { name: /sign in/i }).click();
await p.waitForURL(`${BASE}/dashboard`);
ok(p.url().endsWith("/dashboard"), "login honors ?next=/dashboard");
await sleep(3000);
ok((await p.locator("body").innerText()).includes(EMAIL), "post-login dashboard renders session");

// ---------- 6. PASSWORD RESET ----------
// log out first so reset-link login state is clean
await p.getByRole("button", { name: new RegExp(EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click();
await p.getByRole("menuitem", { name: "Sign out" }).click();
await p.waitForURL(`${BASE}/`);
const logLinesBefore = fs.existsSync(LOG) ? fs.readFileSync(LOG, "utf8").split("\n").length : 0;
await p.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle" });
await p.getByLabel("Email").fill(EMAIL);
const resetRespP = p
  .waitForResponse((r) => r.url().includes("request-password-reset"), { timeout: 15000 })
  .catch(() => null);
p.on("request", (req) => {
  if (req.url().includes("request-password-reset")) {
    console.log(`    [reset payload: ${req.postData()}]`);
  }
});
await p.getByRole("button", { name: /send reset link/i }).click();
const resetResp = await resetRespP;
if (resetResp) {
  console.log(`    [reset api: ${resetResp.status()} ${(await resetResp.text()).slice(0, 120)}]`);
} else {
  console.log("    [reset api: no request fired]");
}
await p.getByRole("heading", { name: "Check your inbox" }).waitFor({ timeout: 15000 });
ok(true, "reset request accepted (check-inbox screen)");
// extract the dev reset link from the server log
let resetUrl = null;
for (let i = 0; i < 20 && !resetUrl; i++) {
  await sleep(1000);
  const tail = fs
    .readFileSync(LOG, "utf8")
    .split("\n")
    .slice(logLinesBefore)
    .filter((l) => l.includes("Password reset link:"));
  if (tail.length) {
    const m = tail[tail.length - 1].match(/https?:\/\/\S+/);
    if (m) resetUrl = m[0].replace("http://localhost:3000", BASE);
  }
}
ok(Boolean(resetUrl), "reset link printed to server log (dev, no SMTP)");
if (!resetUrl) {
  console.log(checks.join("\n"));
  console.log("\nRESULT: FAILED (no reset link — likely rate-limited, retry in a minute)");
  await browser.close();
  process.exit(1);
}
await p.goto(resetUrl, { waitUntil: "networkidle" });
await p.getByRole("heading", { name: "Choose a new password" }).waitFor();
await p.getByLabel("New password").fill(PASS2);
await p.getByLabel("Confirm password").fill(PASS2);
await p.getByRole("button", { name: "Update password" }).click();
await sleep(2000);
// login with the NEW password
await p.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
await p.getByLabel("Email").fill(EMAIL);
await p.getByLabel("Password").fill(PASS2);
await p.getByRole("button", { name: /sign in/i }).click();
await p.waitForURL(`${BASE}/dashboard`);
ok(p.url().endsWith("/dashboard"), "login works with new password after reset");

ok(errors.length === 0, errors.length ? "errors: " + errors.join(" | ") : "no page errors");
console.log(checks.join("\n"));
console.log(process.exitCode ? "\nRESULT: FAILED" : "\nRESULT: ALL PASSED");
await browser.close();
