# SheetApp — Security & Compliance Findings Register

Maintained per compliance-audit recommendation (2026-10-21 review → see §2).
This file is the durable record for findings, risk acceptances, and their
evidence. Every entry: status, owner, evidence artifact, review date.

- **Owner of this register:** app owner (repository maintainer)
- **Update rule:** status/owner/date changes land in the same commit as the
  change they describe. Never edit a status without evidence reference.

---

## 1. Prior security audits (remediated)

External security audit — 7 findings (2 high / 5 medium), remediated and
deployed; verified by the test files named below (run `npm test`).

| ID | Finding | Fix location | Verified by | Status |
|----|---------|--------------|-------------|--------|
| H1 | Identity linking could claim an email owned by a different sign-in identity; concurrent-create produced P2002 500s; `emailVerified` stamped from unverified claims | `src/lib/auth/guards.ts` (AccountAccessDeniedError, P2002 absorb-by-clerkId, Backend-API-verified email only) | `tests/security-hardening.test.ts` | Remediated |
| H2 | `loadUpload` SSRF: fetched arbitrary user-supplied URLs; fail-open on unknown hosts | `src/lib/storage.ts` (strict `*.blob.vercel-storage.com` allowlist, authenticated private reads, delete containment, public-host canary) | `tests/storage.test.ts` | Remediated |
| M4 | Account deletion leaked data: non-transactional DB deletes, Clerk identity removed first (unrecoverable on partial failure) | `src/actions/settings.ts` (single `$transaction`, blob cleanup post-commit, Clerk deleted last) | — (manual smoke at cutover, see CHG-001) | Remediated |
| M5 | `PLATFORM_ADMIN_CLERK_IDS` parsing failed on whitespace/newline separators | `src/lib/auth/guards.ts` (`split(/[\s,]+/)`, warn-once when empty in production) | `tests/security-hardening.test.ts` | Remediated |
| — | `emailVerified` honesty (never derived from unverified claims) | `src/lib/auth/guards.ts` | `tests/security-hardening.test.ts` | Remediated |
| — | `/api/assistant` rate limit keyed globally, not per user | `src/app/api/assistant/route.ts` (`assistant:u:${userId}` / `assistant:ip:${ip}`) | API-test pass (53 checks, 0 fail, 2026-10-21) | Remediated |
| — | No security-path test coverage | `tests/security-hardening.test.ts`, `tests/storage.test.ts`, `tests/invitation.test.ts`, `tests/upload-finalize.test.ts` | `npm test` (101 tests / 17 files) | Remediated |

Earlier hardening round referenced in session history as C1/C2/H4/M2
(invitation email binding + cookie hardening included): **titles/details not
retained** — recorded here as an evidence gap of the same class as §2 F4.

---

## 2. Compliance audit — 2026-10-21 (assessed: SOC 2 CC-series, ISO 27001:2022
Annex A, GDPR/PIPA technical safeguards)

**Overall verdict at audit time: NOT COMPLIANT** (governing finding F1).

| ID | Severity | Finding | Status | Owner | Evidence / next action | Review |
|----|----------|---------|--------|-------|------------------------|--------|
| F1 | CRITICAL | Production authentication runs on a Clerk **development instance** (shared OAuth creds, dev-browser sessions, no env segregation, 100-user cap, no vendor SLA; vendor prohibits this config) | **OPEN** — blocked on domain decision (buy owned domain → cutover via CHG-001, or formally accept dev-instance risk) | App owner | CHG-001; Clerk docs prohibit `*.vercel.app` production | On domain decision |
| F2 | CRITICAL | Cutover lockout/hijack: every DB row carries a dev-instance `clerkId`; `guards.ts` hard-denies an email linked to a *different* identity → mass lockout at cutover; careless `clerkId` blanking opens a first-registrant-wins race | **OPEN** — plan required before cutover | App owner | CHG-001 §Risk F2 (staged re-link + preemption test) | Before cutover |
| F3 | HIGH | No git history: zero commits → no baseline, no rollback tag, no change-management trail (SOC 2 CC8.1 / ISO A.8.32) | **Remediated 2026-10-21** — initial commit + tag `pre-clerk-cutover` | App owner | git history; tag | At each cutover |
| F4 | HIGH | Remediation evidence lived only in chat history (7-finding register, 53-check API pass, audit report not retained) | **OPEN (mitigating)** — this register + `docs/changes/CHG-001-clerk-prod-cutover.md` created 2026-10-21; CI artifacts start once a remote exists | App owner | This file; `.github/workflows/ci.yml` (lint→typecheck→test→build) | 2027-01-21 |
| F5 | MEDIUM | `PLATFORM_ADMIN_CLERK_IDS` names a dev-instance user ID → `/admin` closes to everyone after cutover; literal ID was in `.env.example` | **OPEN (partially remediated)** — `.env.example` scrubbed to placeholder 2026-10-21; Vercel secret replacement sequenced in CHG-001 step 6 | App owner | `.env.example`; `guards.ts` fail-closed parsing | At cutover |
| F6 | MEDIUM | No Content-Security-Policy; acceptance was a code comment only. **HSTS verified present 2026-10-21** in live responses (`max-age=63072000; includeSubDomains; preload`, Vercel edge) — repo config omits it, edge supplies it | **PARTIALLY REMEDIATED** — report-only CSP deployed 2026-10-21 (probe: `Content-Security-Policy-Report-Only` served); enforce after shakedown window | App owner | Live header probes 2026-10-21 (HSTS + CSP); `next.config.ts` | 2027-01-21 |
| F7 | MEDIUM | Rate limiting is per-serverless-instance (population ceiling ≈ 10 × N instances) | **ACCEPTED (formalized here)** — mitigation = Upstash/Redis before any SOC 2 Type II observation window | App owner | `src/lib/security/rate-limit.ts` comments | 2027-01-21 |
| F8 | MEDIUM | Production npm advisories: **3 high** (`deepmerge-ts` via Prisma 6 chain, GHSA-ggr8-5vv4-36mx) — session-history claim of "8 high" was dev-inclusive | **Remediated 2026-10-21** — Prisma 6.19.3 → **7.10.1** (stable; 8.x is RC-only) + non-breaking `npm audit fix` → `npm audit --omit=dev` **0 vulns** AND full `npm audit` **0 vulns**. Upgrade included: `prisma-client` generator (output `src/generated/prisma`), `@prisma/adapter-pg` driver adapter in `src/lib/db.ts`, root `prisma.config.ts`, build script now runs `prisma generate` | App owner | Post-upgrade `npm audit` output (0/0); gates: tsc0/lint0/101 tests/build0 | — |
| F9 | MEDIUM | Cross-border personal-data flows (Supabase Seoul DB → Vercel Blob Singapore → Clerk US) with no documented transfer basis; applicability depends on KR/EU users being in scope | **OPEN** (privacy/legal workstream) | App owner (legal input) | Data-flow facts above; needs transfer basis or scoping statement | 2027-01-21 |
| F10 | LOW | Credential hygiene: production `DATABASE_URL` password appeared in local session transcripts (not in repo files) | **Remediated 2026-10-21** — rotated via Management API `PATCH /v1/projects/{ref}/database/password` (never printed to transcript); Vercel Production + Preview env updated first (rollback snapshot taken); connect verified (Supavisor first-attempt retry quirk); confirmed by successful `prisma migrate deploy` on deployment `sheetapp-19fugy111` | App owner | This entry; deployment build log | — |

---

## 3. Risk acceptances (owner + expiry required)

| Risk | Acceptance | Owner | Review/expiry |
|------|------------|-------|---------------|
| No CSP | Report-only deployed 2026-10-21; promote to enforce after shakedown window shows no unintended violations | App owner | 2027-01-21 |
| Per-instance rate limits | Accepted until shared store (Upstash) lands | App owner | 2027-01-21 |
| Dev-instance auth in production (F1) | **Time-bound interim only** — valid solely until domain decision executes; not accepted for audit scopes | App owner | On domain decision |

---

## 4. Evidence index

| Artifact | Location | Retention |
|----------|----------|-----------|
| Test suite (101 tests / 17 files) | `tests/`, CI workflow `.github/workflows/ci.yml` | Repo history from initial commit on |
| Live header probe (HSTS present, CSP absent) | Recorded in §2 F6 | This register |
| Cutover change record | `docs/changes/CHG-001-clerk-prod-cutover.md` | Repo |
| Prior 7-finding audit report + 53-check API pass | **NOT retained** (gap, F4) | Request re-export if auditor asks |
