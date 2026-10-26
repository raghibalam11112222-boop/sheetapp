import type { NextRequest } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/auth/firebase-token";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  type SessionCookieOptions,
} from "@/lib/auth/session-cookie";
import {
  AccountAccessDeniedError,
  resolveFirebaseUser,
} from "@/lib/auth/guards";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * Session bridge between the Firebase client SDK and SheetApp server.
 *
 * The client signs in with Firebase Authentication (email/password or Google
 * popup), then hands the freshly minted ID token to this endpoint:
 *
 *   POST   { idToken }  → verify, provision/link the DB user, set the
 *                         httpOnly cookie `sheetapp_fb_session`
 *   DELETE             → clear the cookie
 *
 * Everything downstream (guards.ts, proxy.ts) verifies that cookie locally
 * with `jose` against Google's public keys — no Firebase Admin SDK and no
 * service-account secret exists anywhere in the deployment.
 *
 * A `<SessionSync/>` component re-POSTs the token whenever the Firebase SDK
 * rotates it (roughly hourly), so the cookie stays perpetually fresh while
 * any tab is open. If a visitor returns after the cookie expired, the sign-in
 * page's "session recovery" effect re-establishes it transparently.
 *
 * Lives at a static path on purpose: static segments always outrank the
 * legacy `/api/auth/[...all]` catch-all stub, so both coexist and stale
 * better-auth clients keep getting their 410.
 */

export const runtime = "nodejs";
// Prisma user bridge touches the DB.
const MAX_TOKEN_REPOSTS = 30; // generous: SDK rotation + multi-tab reloads

export async function POST(request: NextRequest): Promise<Response> {
  let body: { idToken?: unknown };
  try {
    body = (await request.json()) as { idToken?: unknown };
  } catch {
    return Response.json({ error: "Send your Firebase ID token as JSON." }, { status: 400 });
  }

  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  if (!idToken) {
    return Response.json({ error: "Missing idToken." }, { status: 400 });
  }

  // Cheap dos guard — fake tokens each cost one JWKS verification.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`auth:token:${ip}`, { limit: MAX_TOKEN_REPOSTS, windowMs: 60_000 })) {
    return Response.json({ error: "Too many attempts." }, { status: 429 });
  }

  let verified;
  try {
    // Signature (Google's public keys), issuer and audience are all checked.
    verified = await verifyFirebaseIdToken(idToken);
  } catch (err) {
    console.warn("[SheetApp] firebase session rejected", err);
    return Response.json({ error: "Invalid or expired sign-in token." }, { status: 401 });
  }

  // Bridge: link legacy row, create new user + workspace, absorb sign-up
  // races. Legacy-linking rules are identical to the previous Clerk flow —
  // existing rows are only linked when the identity's email is verified and
  // not claimed by another sign-in identity.
  try {
    const user = await resolveFirebaseUser(verified.claims);
    // Cookie lifetime mirrors the token's remaining validity (capped at the
    // token hour, minus tolerance) — SessionSync re-POSTs long before expiry.
    const lifetimeSeconds = verified.exp * 1000 - Date.now();
    const maxAge = Math.max(60, Math.min(Math.floor(lifetimeSeconds / 1000), 3600) - 30);
    return withSessionCookie(Response.json({ ok: true, userId: user.id }), {
      value: idToken,
      maxAge,
    });
  } catch (err) {
    if (err instanceof AccountAccessDeniedError) {
      return Response.json({ error: err.message }, { status: 403 });
    }
    console.error("[SheetApp] firebase session provisioning failed", err);
    return Response.json(
      { error: "Account setup failed — please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(): Promise<Response> {
  return withSessionCookie(Response.json({ ok: true }), { value: "", maxAge: 0 });
}

function withSessionCookie(
  res: Response,
  cookie: { value: string; maxAge: number }
): Response {
  const headers = new Headers(res.headers);
  headers.append(
    "set-cookie",
    serializeSetCookie(SESSION_COOKIE, cookie.value, sessionCookieOptions(cookie.maxAge))
  );
  return new Response(res.body, { status: res.status, headers });
}

/** Minimal RFC 6265 serializer (cookie value is a JWT: only URL-safe chars). */
function serializeSetCookie(
  name: string,
  value: string,
  opts: SessionCookieOptions
): string {
  let cookie = `${name}=${value}; Path=${opts.path}; Max-Age=${opts.maxAge}; SameSite=Lax; HttpOnly`;
  if (opts.secure) cookie += "; Secure";
  return cookie;
}
