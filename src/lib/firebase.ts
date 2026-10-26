import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";

/**
 * Firebase client integration.
 *
 * - Enabled only when every required config value is present, so the app
 *   runs unchanged with or without Firebase configured.
 * - Config comes from NEXT_PUBLIC_FIREBASE_* env vars (safe for the client —
 *   web app config identifiers are public by design; access is controlled
 *   by Firebase Security Rules, not by hiding the config).
 * - `getFirebaseApp()` memoizes a single app instance (same pattern as the
 *   Prisma client in `db.ts`) and returns null when Firebase is not
 *   configured, so callers can branch cheaply:
 *
 *   ```ts
 *   const app = getFirebaseApp();
 *   if (!app) return; // Firebase not configured — skip gracefully
 *   const db = getFirestore(app);
 *   ```
 */

const FIREBASE_ENV_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
] as const;

function readConfig(): Record<(typeof FIREBASE_ENV_KEYS)[number], string> | null {
  const partial: Partial<Record<(typeof FIREBASE_ENV_KEYS)[number], string>> = {};
  for (const key of FIREBASE_ENV_KEYS) {
    const value = process.env[`NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`];
    if (!value) return null;
    partial[key] = value;
  }
  return partial as Record<(typeof FIREBASE_ENV_KEYS)[number], string>;
}

export const firebaseEnabled = readConfig() !== null;

const globalForFirebase = globalThis as unknown as { firebaseApp?: FirebaseApp | null };

/**
 * Returns the memoized Firebase app, or null when `NEXT_PUBLIC_FIREBASE_*`
 * env vars are not configured. Never throws.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (process.env.NODE_ENV !== "production") {
    if (globalForFirebase.firebaseApp !== undefined) return globalForFirebase.firebaseApp;
  }
  if (!firebaseEnabled) {
    globalForFirebase.firebaseApp = null;
    return null;
  }
  try {
    const config = readConfig();
    if (!config) return null;
    globalForFirebase.firebaseApp = getApps().length ? getApp() : initializeApp(config);
    return globalForFirebase.firebaseApp;
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    globalForFirebase.firebaseApp = null;
    return null;
  }
}
