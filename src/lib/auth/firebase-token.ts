import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/**
 * Firebase Authentication ID-token verification — server-side, WITHOUT the
 * firebase-admin SDK.
 *
 * Firebase Auth issues RS256-signed JWTs whose public keys are published at
 * `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`.
 * Verifying locally means no service-account private key ever lives in the
 * deployment (smaller secret surface) and verification stays fast (keys are
 * cached in-process). Uses Google's public keys with standard Issuer/Audience
 * checks: `iss = https://securetoken.google.com/<projectId>`,
 * `aud = <projectId>`.
 *
 * Works in both runtimes (Node server components/actions AND the Edge
 * runtime used by `src/proxy.ts`): `jose` rides on WebCrypto, which Edge
 * provides natively.
 *
 * The raw ID token lives in an httpOnly cookie set by the sign-in card
 * (`POST /api/auth/firebase`). The Firebase client SDK silently rotates the
 * token roughly hourly and a `<SessionSync>` client component re-posts it,
 * keeping the cookie perpetually fresh.
 */

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

function projectId(): string {
  const id = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!id) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured");
  return id;
}

/** Claims carried by every Firebase Auth ID token (subset that we use). */
export interface FirebaseClaims {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
}

/** Verified token with the raw RFC 7519 expiry fields (Unix seconds). */
export interface VerifiedToken {
  claims: FirebaseClaims;
  /** `exp` claim — token stops being valid at this Unix time (seconds). */
  exp: number;
  /** `iat` claim — issued-at Unix time (seconds). */
  iat: number;
}

/**
 * Verify a Firebase ID token and extract the identity claims.
 * Throws on ANY invalid token (expired, wrong audience, tampered, …) —
 * callers treat that as "signed out".
 */
export async function verifyFirebaseIdToken(token: string): Promise<VerifiedToken> {
  const project = projectId();
  return verifyWith(token, {
    // Firebase client SDKs refresh the token shortly before expiry; a small
    // tolerance absorbs clock skew between Google's signers and runtime hosts.
    issuer: `https://securetoken.google.com/${project}`,
    audience: project,
    clockTolerance: 30,
  });
}

/** Lenient variant for the proxy layer: accepts a token up to 5 min past expiry. */
export async function verifyFirebaseIdTokenLenient(token: string): Promise<VerifiedToken> {
  return verifyWith(token, {
    issuer: `https://securetoken.google.com/${projectId()}`,
    audience: projectId(),
    clockTolerance: 300,
  });
}

async function verifyWith(
  token: string,
  options: { issuer: string; audience: string; clockTolerance: number }
): Promise<VerifiedToken> {
  const { payload } = await jwtVerify(token, JWKS, options);
  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  const iat = typeof payload.iat === "number" ? payload.iat : 0;
  return { claims: claimsFromPayload(payload), exp, iat };
}

function claimsFromPayload(payload: JWTPayload): FirebaseClaims {
  const uid = typeof payload.user_id === "string" ? payload.user_id : (payload.sub ?? "");
  const email = typeof payload.email === "string" ? payload.email : "";
  if (!uid || !email) throw new Error("Firebase token missing required claims");
  return {
    uid,
    email,
    emailVerified: payload.email_verified === true,
    name:
      typeof payload.name === "string" && payload.name.length > 0
        ? payload.name
        : email,
    picture: typeof payload.picture === "string" ? payload.picture : null,
  };
}
