import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  verifyFirebaseIdToken,
  type FirebaseClaims,
} from "@/lib/auth/firebase-token";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { prisma } from "@/lib/db";
import { ensureOrganizationForUser } from "@/lib/auth/workspace";
import { can, type Permission, type Role, PermissionError } from "@/lib/auth/permissions";

export const ACTIVE_ORG_COOKIE = "sheetapp_active_org";

export class AuthRequiredError extends Error {
  constructor() {
    super("You need to sign in to continue.");
    this.name = "AuthRequiredError";
  }
}

/**
 * Sign-in is authenticated at Firebase, but this identity is not allowed to
 * resolve to a user row (email already claimed by another sign-in identity,
 * or the legacy row's email isn't verified). Thrown deliberately instead of
 * falling through to user.create — which would violate the unique-email
 * constraint (P2002) and 500 every page for this identity. Deliberately NOT
 * AuthRequiredError: requireOrg would redirect it to /sign-in and loop with
 * an active Firebase session.
 */
export class AccountAccessDeniedError extends Error {
  constructor(reason: string) {
    super(`Account access denied: ${reason}`);
    this.name = "AccountAccessDeniedError";
  }
}

export interface FirebaseSession {
  user: { id: string; email: string; name: string; image?: string | null };
  // Firebase sessions are stateless; the uid acts as the stable external
  // session marker (no prisma session row under Firebase Auth).
  session: { token: string };
  claims: FirebaseClaims;
}

/**
 * Reads the httpOnly cookie set at sign-in (`POST /api/auth/firebase`) and
 * verifies the Firebase ID token locally against Google's public keys.
 * Returns null when signed out (no cookie, invalid/expired token) — callers
 * treat that the same way they treated a null Clerk session, so behavior and
 * all call sites stay unchanged.
 */
export async function readSessionClaims(): Promise<FirebaseClaims | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { claims } = await verifyFirebaseIdToken(token);
    return claims;
  } catch (err) {
    // Common visitor pattern: a tab picked up the request between the client
    // SDK refreshing the token and the SessionSync re-post. Log, don't crash.
    // Text is generic and infrequent so logs stay informative without noise.
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[SheetApp] session cookie rejected (expired/rotating token) — treating as signed out",
        err
      );
    }
    return null;
  }
}

/** Cheap identity probe — no DB access (landing page + public API routes). */
export async function getSessionUid(): Promise<string | null> {
  return (await readSessionClaims())?.uid ?? null;
}

/**
 * Firebase-backed identity → internal `user` row bridge.
 *
 * 1) existing link via firebaseUid
 * 2) legacy better-auth row with same email → link it ONLY when the ID
 *    token's email claim is verified (Firebase marks Google-provider emails
 *    verified; email/password requires the user to complete the verification
 *    flow). A token's email claim alone is never enough to bind an existing
 *    account, and a row already claimed by a different identity is never
 *    re-linked. Both refusal cases throw AccountAccessDeniedError (never
 *    fall through to create — that would hit the unique-email constraint
 *    and 500 the app).
 * 3) brand new identity → create row + initial workspace + signup event
 */
export async function resolveFirebaseUser(claims: FirebaseClaims) {
  const uid = claims.uid;
  const email = claims.email;
  let name = claims.name || email;
  let image = claims.picture;

  // 1) existing link via firebaseUid
  let dbUser = await prisma.user.findUnique({ where: { firebaseUid: uid } });
  if (dbUser) {
    // Firebase lets users change their display name/photo without a new
    // token claim — refresh the profile fields on every hit where they
    // drifted (e.g. first request after an account-settings edit).
    if (name.slice(0, 120) !== dbUser.name || image !== dbUser.image) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { name: name.slice(0, 120), image },
      });
    }
    return dbUser;
  }

  // 2) legacy better-auth row with same email → verified-link only
  let emailVerified = false;
  if (!dbUser) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      if (byEmail.firebaseUid) {
        console.error(
          `[SheetApp] sign-in denied (email claimed by another identity) uid=${uid} email=${email}`
        );
        throw new AccountAccessDeniedError("email is linked to a different sign-in identity");
      }
      emailVerified = claims.emailVerified;
      if (!emailVerified) {
        console.error(
          `[SheetApp] sign-in denied (unverified legacy email) uid=${uid} email=${email}`
        );
        throw new AccountAccessDeniedError("legacy email address is not verified");
      }
      dbUser = await prisma.user.update({
        where: { id: byEmail.id },
        data: { firebaseUid: uid, name: name.slice(0, 120), image, emailVerified: true },
      });
      try {
        const orgId = await ensureOrganizationForUser(dbUser.id);
        const { logAudit } = await import("@/lib/analytics/track");
        await logAudit({
          orgId,
          actorUserId: dbUser.id,
          action: "auth.firebase_account_linked",
          entityType: "user",
          entityId: dbUser.id,
          metadata: { firebaseUid: uid, email },
        });
      } catch (err) {
        // Audit must never block sign-in, but it must not vanish silently
        // either — this event is the first thing an investigation checks.
        console.error("[SheetApp] failed to audit firebase account link", err);
      }
      return dbUser;
    }
  }

  // 3) brand new user → create + workspace
  try {
    // emailVerified mirrors the token claim — Firebase only marks the email
    // verified after its own verification flow / Google sign-in.
    dbUser = await prisma.user.create({
      data: { firebaseUid: uid, name: name.slice(0, 120), email, image, emailVerified },
    });
  } catch (err) {
    // Absorb the concurrent-first-request race (two tabs / RSC prefetch +
    // navigation both creating the same identity): the unique firebaseUid/
    // email constraint fires, so reload the row the winner created.
    const again =
      (await prisma.user.findUnique({ where: { firebaseUid: uid } })) ??
      (await prisma.user.findUnique({ where: { email } }));
    if (!again) throw err;
    dbUser = again;
    name = name || dbUser.name;
    image = image ?? dbUser.image;
    return dbUser;
  }

  const { createInitialWorkspace } = await import("@/lib/auth/workspace");
  await createInitialWorkspace(dbUser.id, dbUser.name || dbUser.email);
  try {
    const { track } = await import("@/lib/analytics/track");
    await track("signup", { userId: dbUser.id });
  } catch {
    // analytics must never block auth
  }

  return dbUser;
}

/**
 * Firebase-backed session. Resolves the verified ID-token claims to the
 * internal `user` row (see resolveFirebaseUser), ensuring org membership
 * readiness. Returns null when signed out — same contract as before, so all
 * callers keep working.
 */
export async function getSession(): Promise<FirebaseSession | null> {
  const claims = await readSessionClaims();
  if (!claims) return null;

  const dbUser = await resolveFirebaseUser(claims);

  return {
    user: { id: dbUser.id, email: dbUser.email, name: dbUser.name, image: dbUser.image },
    session: { token: claims.uid },
    claims,
  };
}

/** For pages: redirects unauthenticated visitors to the sign-in screen. */
export async function requirePageUser() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  return session.user;
}

export async function resolveActiveOrgId(userId: string): Promise<string> {
  const jar = await cookies();
  const requested = jar.get(ACTIVE_ORG_COOKIE)?.value;
  if (requested) {
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: requested, userId } },
      select: { organizationId: true },
    });
    if (membership) return membership.organizationId;
  }
  return ensureOrganizationForUser(userId);
}

export interface OrgContext {
  userId: string;
  userEmail: string;
  userName: string;
  orgId: string;
  role: Role;
  /** Firebase uid (claims.uid), for surface flags like platform-admin. */
  firebaseUid: string;
}

async function loadOrgContext(): Promise<OrgContext> {
  const session = await getSession();
  if (!session?.user) throw new AuthRequiredError();
  const user = session.user;
  const orgId = await resolveActiveOrgId(user.id);
  const membership = await prisma.membership.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
    select: { role: true },
  });
  if (!membership) throw new AuthRequiredError();
  return {
    userId: user.id,
    userEmail: user.email,
    userName: user.name || user.email,
    orgId,
    role: membership.role as Role,
    firebaseUid: session.claims.uid,
  };
}

/** For pages: redirects to sign-in when unauthenticated. */
export async function requireOrg(): Promise<OrgContext> {
  try {
    return await loadOrgContext();
  } catch (err) {
    if (err instanceof AuthRequiredError) redirect("/sign-in");
    throw err;
  }
}

/** For server actions / API routes: throws instead of redirecting. */
export async function requireActionOrg(): Promise<OrgContext> {
  return loadOrgContext();
}

export async function requirePermissionOn(
  permission: Permission
): Promise<OrgContext> {
  const ctx = await requireActionOrg();
  if (!can(ctx.role, permission)) throw new PermissionError();
  return ctx;
}

/**
 * Platform-level operators (the SheetApp team), NOT workspace admins.
 *
 * Backed by the PLATFORM_ADMIN_FIREBASE_IDS env var (comma-separated Firebase
 * uids). When the var is unset or empty, nobody is a platform admin — the
 * admin surface is closed by default. Org-role "ADMIN" never grants access.
 */
let warnedMissingAdminIds = false;

export function isPlatformAdmin(firebaseUid: string | null | undefined): boolean {
  if (!firebaseUid) return false;
  const raw = process.env.PLATFORM_ADMIN_FIREBASE_IDS ?? "";
  // Split on commas AND whitespace: a newline from dashboard edits must not
  // silently break the allowlist (or, worse, smuggle a "1\n2" as one id).
  const ids = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0 && process.env.NODE_ENV === "production" && !warnedMissingAdminIds) {
    warnedMissingAdminIds = true;
    console.warn(
      "[SheetApp] PLATFORM_ADMIN_FIREBASE_IDS is unset — the /admin surface is closed for everyone."
    );
  }
  return ids.includes(firebaseUid);
}

/** For pages: redirects to sign-in (or dashboard) when not a platform admin. */
export async function requirePlatformAdmin(): Promise<void> {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  if (!isPlatformAdmin(session.claims.uid)) redirect("/dashboard");
}

export { can };
