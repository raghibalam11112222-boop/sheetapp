/**
 * End-to-end smoke test of the complete main user flow (app.txt §1):
 *
 *   Landing → Sign up → Onboarding (use case) → Upload → Analysis →
 *   Schema preview → Confirm → Generate → Dashboard → Data table →
 *   Create record → Team invite → Settings
 *
 * Uses playwright-core driving the locally installed Microsoft Edge
 * (no browser download required). Start the dev server first:
 *
 *   npm run dev
 *   node scripts/e2e-flow.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const TIMEOUT = 120_000;

let stepNo = 0;
const problems = [];
const pageErrors = [];

function step(name) {
  stepNo += 1;
  console.log(`\n[${stepNo}] ${name}`);
}
function ok(msg) {
  console.log(`    ✓ ${msg}`);
}
function fail(msg) {
  problems.push(msg);
  console.log(`    ✗ ${msg}`);
}
function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

function buildFixture() {
  const XLSX = require("xlsx");
  const customers = [
    { Name: "Acme Co", Email: "ap@acme.com", Status: "Active", Revenue: 12400 },
    { Name: "Nova Ltd", Email: "billing@nova.com", Status: "Active", Revenue: 8200 },
    { Name: "Globex", Email: "", Status: "Churned", Revenue: 4100 },
    { Name: "Initech", Email: "hi@initech.com", Status: "Active", Revenue: 15900 },
    { Name: "Umbrella", Email: "a@umb.com", Status: "Churned", Revenue: 2300 },
    { Name: "Stark", Email: "pepper@stark.com", Status: "Active", Revenue: 22100 },
    { Name: "Wayne", Email: "al@wayne.com", Status: "Active", Revenue: 9800 },
    { Name: "Acme Co", Email: "ap@acme.com", Status: "Active", Revenue: 12400 }, // duplicate
  ];
  const orders = [
    { Customer: "Acme Co", Amount: 500, Ordered: "2026-09-01" },
    { Customer: "Nova Ltd", Amount: 1200, Ordered: "2026-09-03" },
    { Customer: "Globex", Amount: 300, Ordered: "2026-09-05" },
    { Customer: "Initech", Amount: 2400, Ordered: "2026-09-11" },
    { Customer: "Stark", Amount: 990, Ordered: "2026-09-14" },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customers), "Customers");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orders), "Orders");
  const file = path.join(process.cwd(), ".data", "e2e-fixture.xlsx");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  XLSX.writeFile(wb, file);
  return file;
}

async function main() {
  const fixture = buildFixture();

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  try {
    step("Landing page");
    const landing = await page.goto(BASE, { waitUntil: "domcontentloaded" });
    assert(landing?.status() === 200, `GET / → ${landing?.status()}`);
    const hero = await page.getByRole("heading", { level: 1 }).textContent();
    assert(/spreadsheet/i.test(hero ?? ""), `hero headline: "${hero?.trim().slice(0, 60)}…"`);

    step("Sign up");
    await page.getByRole("link", { name: "Get Started", exact: true }).click();
    await page.waitForURL("**/sign-up");
    const email = `e2e-${Date.now()}@example.com`;
    await page.getByLabel("Full name").fill("E2E Tester");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password").fill("e2e-password-123");
    await page.getByRole("button", { name: /create account/i }).click();
    await page.waitForURL("**/onboarding");
    assert(true, `signed up ${email} → ${new URL(page.url()).pathname}`);

    step("Onboarding step 1 — choose use case");
    await page.getByRole("button", { name: /customers/i }).click();
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL("**/onboarding/upload*");
    assert(page.url().includes("useCase=customers"), "use case carried into upload step");

    step("Upload + analysis");
    await page.setInputFiles('input[type="file"]', fixture);
    await page.getByRole("button", { name: /analyze spreadsheet/i }).click();
    await page.waitForURL("**/onboarding/review/**", { timeout: TIMEOUT });
    assert(true, `analysis complete → ${new URL(page.url()).pathname}`);

    step("Schema preview (AI understanding)");
    await page.getByText("We understood your spreadsheet.").waitFor();
    const cardCount = await page.locator("table").count();
    assert(cardCount >= 2, `entity cards rendered (${cardCount} field tables)`);
    const hasIssues = await page.getByText(/We found \d+ issue/i).isVisible().catch(() => false);
    assert(hasIssues, "data quality summary ('We found N issues') visible");
    const hasEntities = await page.getByText(/We found \d+ business entit/i).isVisible().catch(() => false);
    assert(hasEntities, "business entities summary ('We found N business entities') visible");
    const hasRelationships = await page.getByText("Relationships", { exact: true }).isVisible().catch(() => false);
    if (hasRelationships) {
      const chainVisible =
        (await page.getByText("Customers", { exact: true }).count()) > 0 &&
        (await page.getByText("Orders", { exact: true }).count()) > 0;
      assert(chainVisible, "relationship chain shows linked entities (Customers ↓ Orders)");
    } else {
      assert(true, "no relationships detected for fixture (chains hidden)");
    }

    step("User confirmation → Generate app");
    await page.getByRole("button", { name: /generate my app/i }).click();
    await page.waitForURL("**/dashboard", { timeout: TIMEOUT });
    assert(true, "generated app → /dashboard");

    step("Generated dashboard");
    await page.getByText("Applications", { exact: true }).first().waitFor();
    const recordStat = await page.locator("text=Records").count();
    assert(recordStat > 0, "stats cards rendered");

    step("Open generated table (manage data)");
    await page.getByRole("link", { name: /^customers/i }).first().click();
    await page.waitForURL("**/tables/**");
    const tableUrl = page.url();
    // Allow the client-side transition to settle before counting rows.
    await page.waitForFunction(
      () =>
        document.querySelectorAll("tbody tr").length > 0 ||
        document.body.innerText.includes("No records"),
      { timeout: TIMEOUT }
    );
    const rowCount = await page.locator("tbody tr").count();
    assert(rowCount >= 5, `imported rows visible (${rowCount} in view)`);

    step("Create record");
    await page.getByRole("link", { name: /add customer|new record/i }).first().click();
    await page.waitForURL("**/new");
    await page.getByLabel("Name").fill("E2E Test Record");
    await page.getByLabel("Status").selectOption("Active");
    await page.getByLabel("Revenue").fill("4321");
    await page.getByRole("button", { name: /create customer|create record/i }).click();
    // Creation redirects back to the table page; the new row should be listed.
    await page.waitForURL(/\/tables\/[^/]+$/, { timeout: TIMEOUT });
    await page.getByText("E2E Test Record").first().waitFor({ timeout: TIMEOUT });
    assert(true, "record created and listed in data table");

    step("Record appears in table + edit/delete available");
    await page.goto(tableUrl);
    await page.getByText("E2E Test Record").first().waitFor();
    assert(true, "new record listed in data table");
    await page.getByText("E2E Test Record").first().click();
    await page.waitForURL(/\/tables\/[^/]+\/[^/]+$/);
    assert(await page.getByRole("link", { name: /^edit$/i }).isVisible().catch(() => false), "edit control present");
    assert(await page.getByRole("button", { name: /delete/i }).isVisible().catch(() => false), "delete control present");

    step("Invite team member");
    await page.goto(`${BASE}/team`);
    await page.getByText("Invite teammate").first().waitFor({ timeout: TIMEOUT });
    const inviteEmail = `teammate-${Date.now()}@example.com`;
    await page.getByLabel("Email").fill(inviteEmail);
    await page.getByRole("button", { name: /create invitation/i }).click();
    // Wait for the roundtrip: share link appears immediately, pending row after refresh.
    await page.getByText(/\/invite\//).first().waitFor({ timeout: TIMEOUT });
    assert(true, `invitation created for ${inviteEmail} (invite link shown)`);
    await page.getByText(inviteEmail).first().waitFor({ timeout: TIMEOUT });
    assert(true, "pending invitation listed");

    step("Settings — rename workspace");
    await page.goto(`${BASE}/settings`);
    await page.getByLabel("Workspace name").fill("E2E Workspace Renamed");
    await page.locator("form").filter({ has: page.getByLabel("Workspace name") })
      .getByRole("button", { type: "submit" }).click();
    await page.getByText("Workspace updated").first().waitFor({ timeout: TIMEOUT });
    await page.reload();
    const saved = await page.getByLabel("Workspace name").inputValue();
    assert(saved === "E2E Workspace Renamed", `workspace name persisted ("${saved}")`);

    step("Secondary pages load");
    for (const route of ["/apps", "/data", "/billing", "/workflows", "/admin"]) {
      const res = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      assert(res?.status() === 200, `GET ${route} → ${res?.status()}`);
    }

    step("Browser errors");
    assert(pageErrors.length === 0, pageErrors.length === 0 ? "no uncaught page errors" : `page errors: ${pageErrors.join(" | ")}`);
  } finally {
    await browser.close();
  }

  console.log("\n──────────────────────────────────────");
  if (problems.length === 0) {
    console.log(`FLOW OK — ${stepNo} steps passed`);
  } else {
    console.log(`FLOW FAILED — ${problems.length} problem(s):`);
    problems.forEach((p) => console.log(`  - ${p}`));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("E2E crashed:", err);
  process.exit(1);
});
