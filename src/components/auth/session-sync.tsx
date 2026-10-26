"use client";

import { useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase";
import { clearSessionCookie, postSessionToken } from "@/lib/auth/client";

/**
 * Keeps the server's httpOnly session cookie in lockstep with the Firebase
 * SDK's token rotation.
 *
 * Mounted once per (app) and (auth) layout. While any tab is open, Firebase
 * rotates the ID token minutes before its one-hour expiry; posting the fresh
 * token here re-seals the cookie so server requests never see an expired
 * one. On sign-out (or an identity deletion), it clears the stale cookie the
 * same way — no "signed out in Firebase but cookie still valid" drift.
 *
 * Purposefully NOT mounted on the marketing pages: anonymous landing-page
 * visitors never load the auth bundle.
 */
export function SessionSync() {
  useEffect(() => {
    const app = getFirebaseApp();
    if (!app) return;

    const auth = getAuth(app);
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        let token: string | null = null;
        try {
          token = await user.getIdToken();
        } catch {
          // Refresh failure (offline, account gone) — the cookie simply
          // expires; next page load goes through normal sign-in recovery.
          return;
        }
        await postSessionToken(token);
      } else {
        await clearSessionCookie();
      }
    });
  }, []);

  return null;
}
