/**
 * The httpOnly cookie that carries the Firebase Authentication ID token.
 *
 * Cookie options are deliberately shared as pure data (no next/headers or
 * NextResponse imports) so the same constants are safe to import from the
 * Edge runtime (`src/proxy.ts`) as well as Node route handlers and server
 * components:
 *
 * - Set/clear: `POST/DELETE /api/auth/firebase` (Node, NextResponse.cookies).
 * - Read: `getSession()` in guards (Node, next/headers) and `src/proxy.ts`
 *   (Edge, NextRequest.cookies).
 */

/** The ID token itself (RS256 JWT, ~1 h lifetime) — never client-readable. */
export const SESSION_COOKIE = "sheetapp_fb_session";

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
}

/**
 * Options for setting/clearing the session cookie. `maxAge` should mirror the
 * verified token's remaining lifetime (`exp - now`) so the cookie can never
 * outlive the token it carries; the Firebase SDK refreshes the token and the
 * `<SessionSync/>` component re-posts it well before expiry.
 *
 * `secure` is relaxed in development because Next dev may serve plain HTTP —
 * production always runs behind HTTPS on Vercel.
 */
export function sessionCookieOptions(maxAgeSeconds: number): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
