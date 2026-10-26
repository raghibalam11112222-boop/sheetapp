import { NextResponse, type NextRequest } from "next/server";
import { verifyFirebaseIdTokenLenient } from "@/lib/auth/firebase-token";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";

// Same protected surface as before the Firebase swap (previously Clerk's
// createRouteMatcher + auth.protect). The proxy is an optimistic edge guard:
// real authorization still happens per-request in guards.ts.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/apps",
  "/data",
  "/tables",
  "/team",
  "/settings",
  "/billing",
  "/workflows",
  "/admin",
  "/onboarding",
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Verifies the Firebase ID token carried by the httpOnly session cookie
 * (locally, against Google's public keys — no server-hosted auth service
 * call). Redirects invalid sessions on protected routes to /sign-in with a
 * `next` continuation, mirroring clerkMiddleware's auth.protect behavior.
 *
 * The verify is deliberate about tolerance: a token up to five minutes past
 * expiry is still accepted so in-flight SDK refreshes don't bounce visitors
 * mid-navigation. Sessions that fail here self-heal on the sign-in page:
 * its recovery effect re-POSTs the fresh token from the client SDK and
 * returns the user where they were going.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!isProtectedRoute(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await verifyFirebaseIdTokenLenient(token);
      return NextResponse.next();
    } catch {
      // fall through to the redirect below
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = "";
  if (pathname !== "/dashboard") {
    url.searchParams.set("next", `${pathname}${search}`);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
