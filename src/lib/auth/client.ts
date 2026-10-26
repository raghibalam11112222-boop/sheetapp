"use client";

/**
 * Firebase-backed client auth helpers. Kept under the old path so existing
 * imports keep working.
 *
 * The httpOnly session cookie is established by posting the fresh ID token
 * to `POST /api/auth/firebase` (see session-sync + the auth cards). After
 * sign-in/sign-up that POST completes BEFORE the caller redirects, so the
 * first app request is always sent with a cookie the server accepts.
 */

import { useCallback, useEffect, useState } from "react";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  createUserWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase";

/** Thrown by the helpers below when Firebase env vars are not configured. */
export class AuthNotConfiguredError extends Error {
  constructor() {
    super("Authentication is not configured.");
    this.name = "AuthNotConfiguredError";
  }
}

let clientAuthPromise: Promise<ReturnType<typeof getAuth>> | null = null;

function clientAuth() {
  if (!clientAuthPromise) {
    clientAuthPromise = new Promise((resolve, reject) => {
      const app = getFirebaseApp();
      if (!app) {
        reject(new AuthNotConfiguredError());
        return;
      }
      resolve(getAuth(app));
    });
  }
  return clientAuthPromise;
}

/** Maps the Firebase SDK's error codes to user-facing copy. */
export function describeAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look valid.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account already exists for this email — try signing in instead.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled — pick up where you left off.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window — allow popups and retry.";
    case "auth/unauthorized-domain":
      return "This domain isn't enabled for sign-in yet.";
    case "auth/network-request-failed":
      return "Network trouble — check your connection and retry.";
    case "auth/too-many-requests":
      return "Too many attempts — wait a moment and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/**
 * Establishes the server session from the given user's current ID token, or
 * clears the cookie when signed out. Fires-and-forgets errors are surfaced
 * via the returned ok flag.
 */
export async function postSessionToken(token: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/firebase", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? "Sign-in failed." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Network trouble reaching the server." };
  }
}

export async function clearSessionCookie(): Promise<void> {
  try {
    await fetch("/api/auth/firebase", { method: "DELETE" });
  } catch {
    // A failed cookie clear degrades to expiry; never block sign-out on it.
  }
}

export interface SignInResult {
  ok: boolean;
  error?: string;
}

/** Email + password sign-in (existing accounts). */
export async function signInEmail(email: string, password: string): Promise<SignInResult> {
  try {
    const auth = await clientAuth();
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const token = await credential.user.getIdToken(true);
    return await postSessionToken(token);
  } catch (err) {
    if (err instanceof AuthNotConfiguredError) return { ok: false, error: err.message };
    return { ok: false, error: describeAuthError(err) };
  }
}

/**
 * Email + password sign-up. The optional display name is written to the
 * profile BEFORE the token is refreshed, so the ID token POSTed to the
 * server already carries `name` — the DB row gets a human name (Clerk
 * behaved the same via its signup form).
 */
export async function signUpEmail(
  email: string,
  password: string,
  name?: string
): Promise<SignInResult> {
  try {
    const auth = await clientAuth();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (name && name.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }
    const token = await credential.user.getIdToken(true);
    return await postSessionToken(token);
  } catch (err) {
    if (err instanceof AuthNotConfiguredError) return { ok: false, error: err.message };
    return { ok: false, error: describeAuthError(err) };
  }
}

/**
 * Google sign-in via popup. Works on every domain listed in the project's
 * authorized sign-in domains (localhost + the production domain).
 */
export async function signInGoogle(): Promise<SignInResult> {
  try {
    const auth = await clientAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(auth, provider);
    const token = await credential.user.getIdToken(true);
    return await postSessionToken(token);
  } catch (err) {
    if (err instanceof AuthNotConfiguredError) return { ok: false, error: err.message };
    return { ok: false, error: describeAuthError(err) };
  }
}

/** Sends a Firebase-generated password reset email (cross-device safe). */
export async function requestPasswordReset(email: string): Promise<SignInResult> {
  try {
    const auth = await clientAuth();
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/sign-in?reset=1`,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthNotConfiguredError) return { ok: false, error: err.message };
    return { ok: false, error: describeAuthError(err) };
  }
}

/** Firebase sign-out + server cookie clear, in that order. */
export async function signOutApp(): Promise<void> {
  try {
    const auth = await clientAuth();
    await firebaseSignOut(auth);
  } catch {
    // Cookie clear still happens below — never strand half-signed-out state.
  }
  await clearSessionCookie();
}

/**
 * Deletes the signed-in identity from Firebase permanently. Requires a
 * fresh-enough session: Firebase rejects the call (auth/requires-recent-login)
 * when the last login is too old — callers surface that as a retry hint.
 */
export async function deleteSignedInFirebaseUser(): Promise<SignInResult> {
  try {
    const auth = await clientAuth();
    const user = auth.currentUser;
    if (!user) return { ok: true }; // already signed out — nothing to delete
    await user.delete();
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthNotConfiguredError) return { ok: false, error: err.message };
    return { ok: false, error: describeAuthError(err) };
  }
}

/** Clerk-shaped session hook: the current Firebase user (or null). */
export function useSession(): { user: User | null; isLoaded: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setLoaded] = useState(false);

  useEffect(() => {
    let detached = false;
    clientAuth()
      .then((auth) => {
        if (detached) return;
        const unsub = onAuthStateChanged(auth, (fbUser) => {
          if (detached) {
            unsub();
            return;
          }
          setUser(fbUser);
          setLoaded(true);
        });
      })
      .catch(() => {
        if (!detached) setLoaded(true); // not configured → treat as signed out
      });
    return () => {
      detached = true;
    };
  }, []);

  return { user, isLoaded };
}

/** Composes the reset handler used by an interactive Google button. */
export function useGoogleSignIn() {
  return useCallback(async () => signInGoogle(), []);
}
