# CHG-001 — Clerk authentication cutover: development → production instance

- **Status:** DRAFT / BLOCKED — precondition P1 (owned domain) undecided
- **Raised:** 2026-10-21
- **Author:** engineering (opencode session)
- **Approvers:** app owner (required before execution)
- **Related:** `docs/compliance/findings-register.md` §2 (F1, F2, F5, F10)

---

## 1. Scope

Switch production sign-in from the Clerk **development instance**
(`shining-oriole-8866.clerk.accounts.dev`, `pk_test`/`sk_test` keys currently in
Vercel Production) to the Clerk **production instance** (`pk_live`/`sk_live`,
first-party FAPI subdomain on an owned domain).

Out of scope: preview stays on test keys (Clerk forbids production keys on
host-provided preview domains); local dev unchanged.

## 2. Preconditions (all required, evidence attached here)

| # | Precondition | Evidence required | State |
|---|--------------|-------------------|-------|
| P1 | Owned root domain purchased and attached to Vercel production | `npx vercel domains ls` lists it; HTTPS 200 on apex | **PENDING user decision** |
| P2 | Clerk production instance: dead domains `clerk./accounts.sheetapp-three.vercel.app` removed, owned domain added, DNS CNAMEs validated, certificates deployed | Clerk Domains page healthy; TLS probe of `clerk.<domain>` succeeds | Not started |
| P3 | Live keys extracted: `npx clerk@latest env pull --instance prod` | Decoded publishable key FAPI host ends in owned domain; key prefixes `pk_live_`/`sk_live_` | Not started |
| P4 | Re-link plan for F2 tested (§4) | Test-run log attached below | Not started |

## 3. Steps (in order; each has a success signal)

1. Buy domain (~$10/yr) → attach in Vercel → production domain serves app (200).
2. Clerk dashboard: clean production-instance domains, add owned domain, add
   CNAME records shown by Clerk (DNS-only if Cloudflare-proxied). Deploy
   certificates. *Success: TLS probe green.*
3. Pull live keys (P3). Record key fingerprints here (never full secrets):
   `pk_live: __________` `sk_live fingerprint: __________`
4. Provision the production-instance admin account (sign up once) → obtain new
   `user_...` ID → stage new `PLATFORM_ADMIN_CLERK_IDS` value.
5. Execute F2 re-link plan (§4) against a staging DB copy — attach log.
6. **Env swap (Production only):** set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` +
   `CLERK_SECRET_KEY` to live values; set `PLATFORM_ADMIN_CLERK_IDS` to the new
   prod-instance ID; rotate `DATABASE_URL` password (F10). Preview/Development
   untouched. *Evidence: redacted env-diff pasted below.*
7. Deploy (`npx vercel@latest --prod` from a commit at/after tag
   `pre-clerk-cutover`).
8. Smoke checklist (§6) executed and signed.
9. Post-cutover access review: enumerate prod-instance users, reconcile,
   revoke strays.

**Rollback:** restore the previous Production env values (dev-instance keys +
old admin ID) and redeploy. App code is instance-agnostic, so rollback returns
the system to its exact pre-change state (dev instance, working sign-in).
Rollback owner: app owner. Previous values are recoverable from Vercel env
revision history / `vercel env pull` taken before step 6 — take that snapshot
as step 6a and attach it (redacted) here.

## 4. Risk F2 — lockout & pre-hijack race (must be solved before step 6)

**Fact (verified in code):** `src/lib/auth/guards.ts` claims a legacy row by
email only when the row has no `clerkId`; if `clerkId` is set to a *different*
identity it throws `AccountAccessDeniedError`. Every row currently holds a
dev-instance `clerkId`, so at cutover every existing user is denied on first
login. Blanking `clerkId` indiscriminately lets the first account registered
with a victim's email on the new instance inherit their workspace.

**Plan:**
1. Production Clerk instance: enforce email verification (required), and
   restrict sign-up methods as needed — record dashboard settings here: `______`.
2. On staging copy, per affected user row, clear `clerkId` **only** together
   with the verified-email re-link path already in `guards.ts` (Backend-API
   verification must confirm the claimant owns the email).
3. Preemption test: attempt to register a victim email *before* the victim
   does; confirm the victim's workspace is NOT accessible to the attacker
   (expected: attacker's account is empty; victim re-links via verified email
   and regains the workspace).
4. Attach test log here; sign-off by app owner before production step 6.
5. Production data step: scripted `clerkId` clear (same verified-link path
   applies at first sign-in) — run immediately before the env swap.

**User communication (CC8.1 / courtesy):** pre-cutover notice — "you will be
asked to sign in again; accounts are re-created on the new auth system; if your
data is missing, contact support" + support playbook for the denial case
(`AccountAccessDeniedError` message). Send log recorded here: `______`.

## 5. Rollback & risks summary

- Rollback path exists and is cheap (§3) — no data migration is irreversible
  if step 4's staging test passed.
- Top residual risks if executed sloppily: mass lockout (F2), admin lockout
  (F5 fail-closed), sign-in outage from half-provisioned DNS/TLS (probe before
  swap).

## 6. Smoke checklist (sign after step 7)

| # | Check | Result | Tester / date |
|---|-------|--------|---------------|
| 1 | Landing page loads (200) | ☐ | |
| 2 | Email sign-up + sign-in on production instance (user appears in prod-instance user list) | ☐ | |
| 3 | Session cookie is `__client` (production architecture), survives reload | ☐ | |
| 4 | Existing user re-link: old email signs in and sees prior workspace (F2) | ☐ | |
| 5 | Spreadsheet upload → review page (direct-to-Blob path) | ☐ | |
| 6 | Invitation accept flow | ☐ | |
| 7 | `/admin` opens for new prod-instance admin ID; 404/redirect for others | ☐ | |
| 8 | Account deletion (transactional, Clerk-last) | ☐ | |
| 9 | `/api/assistant` responds; rate limit returns 429 at 11th call/min | ☐ | |
| 10 | CI green on the release commit | ☐ | |

## 7. Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Executor | | | |
| Approver (app owner) | | | |
