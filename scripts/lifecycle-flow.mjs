import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";
const TS = Date.now();
const A_PASS = "e2e-password-123";
const M_EMAIL = `lc-${TS}@example.com`;
const V_EMAIL = `lcv-${TS}@example.com`;
const PASS = "e2e-password-123";
const checks = [];
const ok = (c, m) => {
  checks.push(`${c ? "  OK  " : " FAIL "}${m}`);
  if (!c) process.exitCode = 1;
};

const b = await chromium.launch({ channel: "msedge", headless: true });

// ---------- Admin: fresh org with data ----------
// (the long-lived e2e org is over FREE seats from prior test users)
const a = await b.newPage({ viewport: { width: 1280, height: 900 } });
a.setDefaultTimeout(60000);
await a.goto(`${BASE}/sign-up`, { waitUntil: "domcontentloaded" });
await a.waitForTimeout(3000);
await a.getByLabel("Full name").fill("Adam Admin");
await a.getByLabel("Work email").fill(`lca-${TS}@example.com`);
await a.getByLabel("Password").fill(A_PASS);
await a.getByRole("button", { name: /create account/i }).click();
await a.getByRole("heading", { name: "Let's turn your spreadsheet into an app." }).waitFor({ timeout: 60000 });
await a.getByRole("button", { name: "Customers", exact: true }).click();
await a.getByRole("button", { name: "Continue" }).click();
await a.waitForURL(/\/onboarding\/upload/);
await a.getByRole("heading", { name: "Upload your spreadsheet" }).waitFor({ timeout: 30000 });
await a.locator('input[type="file"]').setInputFiles(".data/e2e-fixture.xlsx");
await a.getByText("e2e-fixture.xlsx").waitFor({ timeout: 15000 });
await a.getByRole("button", { name: "Analyze spreadsheet" }).click();
await a.waitForURL("**/onboarding/review/**", { timeout: 120000 });
await a.getByRole("heading", { name: "We understood your spreadsheet." }).waitFor({ timeout: 60000 });
await a.getByRole("button", { name: "Generate My App" }).click();
await a.waitForURL(`${BASE}/dashboard`, { timeout: 120000 });
await a.getByText("E2e Fixture Operations").first().waitFor({ timeout: 60000 });
ok(true, "admin workspace ready");

// ---------- Member signs up + invited + accepts ----------
const m = await b.newPage({ viewport: { width: 1280, height: 900 } });
m.setDefaultTimeout(60000);
await m.goto(`${BASE}/sign-up`, { waitUntil: "domcontentloaded" });
await m.waitForTimeout(3000);
await m.getByLabel("Full name").fill("Lily Cycle");
await m.getByLabel("Work email").fill(M_EMAIL);
await m.getByLabel("Password").fill(PASS);
await m.getByRole("button", { name: /create account/i }).click();
await m.getByRole("heading", { name: "Let's turn your spreadsheet into an app." }).waitFor({ timeout: 60000 });

await a.goto(`${BASE}/team`, { waitUntil: "domcontentloaded" });
await a.getByText("Invite teammate").first().waitFor({ timeout: 30000 });
await a.getByLabel("Email").fill(M_EMAIL);
await a.getByLabel("Role").selectOption("MEMBER");
await a.getByRole("button", { name: /create invitation/i }).click();
await a.getByText(/\/invite\//).first().waitFor({ timeout: 30000 });
const mLink = (await a.getByText(/\/invite\//).first().innerText()).trim();
await m.goto(mLink, { waitUntil: "domcontentloaded" });
await m.getByRole("button", { name: /accept invitation/i }).click();
await m.waitForURL(`${BASE}/dashboard`, { timeout: 60000 });
ok(true, "member joined shared workspace");

// ---------- Edit record (member creates + edits own) ----------
await m.getByRole("link", { name: /^customers/i }).first().click();
await m.waitForURL("**/tables/**");
await m.waitForFunction(() => document.querySelectorAll("tbody tr").length > 0, { timeout: 60000 });
await m.getByRole("link", { name: "Add Customer" }).click();
await m.waitForURL("**/new");
await m.getByLabel("Name").fill("Lifecycle Record");
await m.getByLabel("Status").selectOption("Active");
await m.getByLabel("Revenue").fill("100");
await m.getByRole("button", { name: /create customer|create record/i }).click();
await m.waitForURL(/\/tables\/[^/]+$/, { timeout: 60000 });
await m.getByText("Lifecycle Record").first().click();
await m.waitForURL(/\/tables\/[^/]+\/(?!new$)[^/]+$/);
await m.getByRole("link", { name: "Edit" }).click();
await m.waitForURL(/edit=1/);
await m.getByLabel("Revenue").fill("101");
await m.getByRole("button", { name: /save/i }).click();
await m.waitForFunction(() => document.body.innerText.includes("101"), { timeout: 30000 });
ok(true, "Edit record (member edited own record)");

// ---------- Search + Delete record (admin) ----------
await a.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await a.getByRole("link", { name: /^customers/i }).first().click();
await a.waitForURL("**/tables/**");
await a.waitForFunction(() => document.querySelectorAll("tbody tr").length > 0, { timeout: 60000 });
await a.getByPlaceholder("Search records…").fill("Lifecycle");
await a.waitForFunction(() => document.querySelectorAll("tbody tr").length === 1, { timeout: 30000 });
ok(true, "Search record (admin found it)");
await a.getByRole("button", { name: "Delete record" }).first().click();
await a.getByRole("button", { name: /^delete$/i }).last().click();
await a.waitForFunction(() => document.querySelectorAll("tbody tr").length === 0, { timeout: 30000 });
ok(true, "Delete record (admin removed it)");

// ---------- Invite team member (admin invites viewer) ----------
await a.goto(`${BASE}/team`, { waitUntil: "domcontentloaded" });
await a.getByText("Invite teammate").first().waitFor({ timeout: 30000 });
await a.getByLabel("Email").fill(V_EMAIL);
await a.getByLabel("Role").selectOption("VIEWER");
await a.getByRole("button", { name: /create invitation/i }).click();
await a.getByText(V_EMAIL).first().waitFor({ timeout: 30000 });
ok(true, "Invite team member (viewer invited)");

// ---------- Change permission (member -> viewer) ----------
const memberRow = a.locator("table tbody tr", { hasText: "Lily Cycle" });
await memberRow.locator("select").selectOption("VIEWER");
await a.waitForTimeout(3000);
ok(true, "Change permission (member demoted to viewer)");

// demoted user loses write UI live
await m.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await m.getByRole("link", { name: /^customers/i }).first().click();
await m.waitForURL("**/tables/**");
await m.waitForTimeout(2500);
ok((await m.getByRole("link", { name: "Add Customer" }).count()) === 0, "demoted viewer: no Add button");
await m.goto(m.url().split("?")[0] + "/new", { waitUntil: "domcontentloaded" }).catch(() => {});
await m.waitForTimeout(2000);
ok(!m.url().endsWith("/new"), "demoted viewer: blocked from new-record form");

// ---------- Logout ----------
await m.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await m.getByRole("button", { name: new RegExp(M_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click();
await m.getByRole("menuitem", { name: "Sign out" }).click();
await m.waitForURL(`${BASE}/`, { timeout: 30000 });
ok(true, "Logout (lands on public page)");

// ---------- Login again ----------
await m.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
await m.waitForTimeout(2000);
await m.getByLabel("Email").fill(M_EMAIL);
await m.getByLabel("Password").fill(PASS);
await m.getByRole("button", { name: /sign in/i }).click();
await m.waitForURL(`${BASE}/dashboard`, { timeout: 60000 });
ok(true, "Login again (viewer session works)");

// ---------- protected throughout (logged out) ----------
await m.getByRole("button", { name: new RegExp(M_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click();
await m.getByRole("menuitem", { name: "Sign out" }).click();
await m.waitForURL(`${BASE}/`, { timeout: 30000 });
for (const route of ["/dashboard", "/tables", "/team", "/settings", "/billing", "/workflows", "/admin", "/onboarding", "/apps", "/data"]) {
  await m.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  await m.waitForTimeout(1200);
  ok(m.url().startsWith(`${BASE}/sign-in`), `protected logged-out: ${route}`);
}

console.log(checks.join("\n"));
console.log(process.exitCode ? "\nRESULT: FAILED" : "\nRESULT: ALL PASSED");
await b.close();
