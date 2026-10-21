import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
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
 * Sign-in is authenticated at Clerk, but this identity is not allowed to
 * resolve to a user row (email already claimed by another Clerk identity, or
 * the legacy row's email isn't verified). Thrown deliberately instead of
 * falling through to user.create — which would violate the unique-email
 * constraint (P2002) and 500 every page for this identity. Deliberately NOT
 * AuthRequiredError: requireOrg would redirect it to /sign-in and loop with
 * an active Clerk session.
 */
export class AccountAccessDeniedError extends Error {
  constructor(reason: string) {
    super(`Account access denied: ${reason}`);
    this.name = "AccountAccessDeniedError";
  }
}

interface ClerkSession {
  user: { id: string; email: string; name: string; image?: string | null };
  // Clerk manages sessions server-side; the clerkId acts as the stable
  // external session marker (no prisma session row under Clerk).
  session: { token: string };
}

/**
 * Clerk-backed session. Resolves the Clerk user to the internal `user` row
 * (upsert by clerkId, link legacy better-auth rows by email), ensuring org
 * membership. Returns null when signed out — same contract as before, so all
 * callers keep working.
 */
export async function getSession(): Promise<ClerkSession | null> {
  const { userId: clerkId, sessionClaims } = await auth();
  if (!clerkId) return null;

  // Fast path: read identity from the session JWT (verified locally, no
  // network). Only fall back to the Clerk Backend API when the token
  // doesn't carry an email claim (non-standard token config).
  const claimEmail = typeof sessionClaims?.email === "string" ? sessionClaims.email : "";
  const claimName = typeof sessionClaims?.name === "string" ? sessionClaims.name : "";
  const claimImage =
    typeof sessionClaims?.picture === "string" ? (sessionClaims.picture as string) : null;

  let email = claimEmail;
  let name = claimName;
  let image = claimImage;
  let clerkUser: Awaited<ReturnType<typeof currentUser>> = null;
  if (!email) {
    clerkUser = await currentUser();
    if (!clerkUser) return null;
    const cu = clerkUser;
    email =
      cu.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId)?.emailAddress ??
      cu.emailAddresses[0]?.emailAddress ??
      "";
    if (!email) return null;
    name =
      cu.fullName ??
      [cu.firstName, cu.lastName].filter(Boolean).join(" ") ??
      email;
    image = cu.imageUrl ?? null;
  }
  if (!name) name = email;

  // 1) existing link via clerkId
  let dbUser = await prisma.user.findUnique({ where: { clerkId } });
  // 2) legacy better-auth row with same email → link it ONLY after the Clerk
  //    Backend API confirms that exact email is verified. A session-JWT email
  //    claim alone is never enough to bind an existing account, and a row
  //    already claimed by a different Clerk ID is never re-linked. Both
  //    refusal cases throw AccountAccessDeniedError (never fall through to
  //    create — that would hit the unique-email constraint and 500 the app).
  let emailVerified = false;
  if (!dbUser) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      if (byEmail.clerkId) {
        console.error(
          `[SheetApp] sign-in denied (email claimed by another identity) clerkId=${clerkId} email=${email}`
        );
        throw new AccountAccessDeniedError("email is linked to a different sign-in identity");
      }
      const verifiedUser = clerkUser ?? (await currentUser());
      const matched =
        verifiedUser?.emailAddresses.find(
          (a) => a.emailAddress.toLowerCase() === email.toLowerCase()
        ) ?? null;
      emailVerified = Boolean(matched?.verification?.status === "verified");
      if (!emailVerified) {
        console.error(
          `[SheetApp] sign-in denied (unverified legacy email) clerkId=${clerkId} email=${email}`
        );
        throw new AccountAccessDeniedError("legacy email address is not verified");
      }
      dbUser = await prisma.user.update({
        where: { id: byEmail.id },
        data: { clerkId, name, image, emailVerified: true },
      });
      try {
        const orgId = await ensureOrganizationForUser(dbUser.id);
        const { logAudit } = await import("@/lib/analytics/track");
        await logAudit({
          orgId,
          actorUserId: dbUser.id,
          action: "auth.clerk_account_linked",
          entityType: "user",
          entityId: dbUser.id,
          metadata: { clerkId, email },
        });
      } catch (err) {
        // Audit must never block sign-in, but it must not vanish silently
        // either — this event is the first thing an investigation checks.
        console.error("[SheetApp] failed to audit clerk account link", err);
      }
    }
  }
  // 3) brand new user → create + workspace
  if (!dbUser) {
    let created = false;
    try {
      // emailVerified only when the Backend API actually confirmed it —
      // never stamped from an unverified session claim.
      dbUser = await prisma.user.create({
        data: { clerkId, name: name.slice(0, 120), email, image, emailVerified },
      });
      created = true;
    } catch (err) {
      // Absorb the concurrent-first-request race (two tabs / RSC prefetch +
      // navigation both creating the same identity): the unique clerkId/
      // email constraint fires, so reload the row the winner created.
      const again = await prisma.user.findUnique({ where: { clerkId } });
      if (!again) throw err;
      dbUser = again;
    }
    if (created) {
      const { createInitialWorkspace } = await import("@/lib/auth/workspace");
      await createInitialWorkspace(dbUser.id, dbUser.name || dbUser.email);
      try {
        const { track } = await import("@/lib/analytics/track");
        await track("signup", { userId: dbUser.id });
      } catch {
        // analytics must never block auth
      }
    }
  }

  return {
    user: { id: dbUser.id, email: dbUser.email, name: dbUser.name, image: dbUser.image },
    session: { token: clerkId },
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
 * Backed by the PLATFORM_ADMIN_CLERK_IDS env var (comma-separated Clerk user
 * IDs). When the var is unset or empty, nobody is a platform admin — the
 * admin surface is closed by default. Org-role "ADMIN" never grants access.
 */
let warnedMissingAdminIds = false;

export function isPlatformAdmin(clerkId: string | null | undefined): boolean {
  if (!clerkId) return false;
  const raw = process.env.PLATFORM_ADMIN_CLERK_IDS ?? "";
  // Split on commas AND whitespace: a newline from dashboard edits must not
  // silently break the allowlist (or, worse, smuggle a "1\n2" as one id).
  const ids = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0 && process.env.NODE_ENV === "production" && !warnedMissingAdminIds) {
    warnedMissingAdminIds = true;
    console.warn(
      "[SheetApp] PLATFORM_ADMIN_CLERK_IDS is unset — the /admin surface is closed for everyone."
    );
  }
  return ids.includes(clerkId);
}

/** For pages: redirects to sign-in (or dashboard) when not a platform admin. */
export async function requirePlatformAdmin(): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!isPlatformAdmin(userId)) redirect("/dashboard");
}

export { can };
