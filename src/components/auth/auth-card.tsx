"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase";
import {
  postSessionToken,
  signInEmail,
  signInGoogle,
  signUpEmail,
} from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Replaces Clerk's hosted <SignIn/>/<SignUp/> cards with a first-party card
 * that signs straight into Firebase Authentication.
 *
 * Behavior parity notes:
 * - `?next=` continuation (set by guards/proxy) is honored on sign-in.
 * - Sign-up lands on /onboarding, exactly like Clerk's fallbackRedirectUrl.
 * - "Session recovery": if the visitor is already signed in at Firebase but
 *   the httpOnly cookie expired (e.g. first page load after days away), the
 *   card silently re-POSTs the fresh token and forwards instead of forcing
 *   another credential entry.
 */

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.89a5.05 5.05 0 0 1-2.18 3.32v2.76h3.55c2.07-1.9 3.3-4.75 3.3-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.76c-.98.66-2.23 1.06-3.73 1.06-2.75 0-5.08-1.86-5.91-4.35H1.5v2.85A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M6.09 14.29A6.59 6.59 0 0 1 5.77 12c0-.8.13-1.57.32-2.29l-2.82-2.85a11 11 0 0 0 0 10.28l2.82-2.85z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 3.27 5.86l2.82 2.85C6.92 7.24 9.25 5.38 12 5.38z"
      />
    </svg>
  );
}

export interface AuthCardProps {
  mode: "sign-in" | "sign-up";
}

export function AuthCard({ mode }: AuthCardProps) {
  return (
    <Suspense fallback={null}>
      <AuthCardInner mode={mode} />
    </Suspense>
  );
}

function AuthCardInner({ mode }: { mode: AuthCardProps["mode"] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignUp = mode === "sign-up";
  const nextParam = searchParams.get("next");
  const fallbackNext =
    isSignUp || !nextParam || !nextParam.startsWith("/")
      ? isSignUp
        ? "/onboarding"
        : "/dashboard"
      : nextParam;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailing, setEmailing] = useState(false);
  const [googleing, setGoogleing] = useState(false);

  // One-shot session-recovery / signed-in guard, armed on mount and cleared
  // on first fire (firebase user settled) so it never fights the login flow.
  const settled = useRef(false);
  // Post-reset notice: the Firebase reset email returns here as
  // /sign-in?reset=1 after the visitor set their new password.
  useEffect(() => {
    if (searchParams.get("reset") !== "1") return;
    toast.success("Password updated — sign in with your new password.");
  }, [searchParams]);
  useEffect(() => {
    const app = getFirebaseApp();
    if (!app) return;
    const unsub = onAuthStateChanged(getAuth(app), async (user) => {
      if (settled.current) return;
      settled.current = true;
      unsub();
      if (!user) return;
      const result = await postSessionToken(await user.getIdToken());
      if (result.ok) {
        router.replace(fallbackNext);
        router.refresh();
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function forwardToApp(destination: string) {
    router.replace(destination);
    router.refresh();
  }

  async function submitEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    setEmailing(true);
    const result = isSignUp
      ? await signUpEmail(email.trim(), password, name)
      : await signInEmail(email.trim(), password);
    setEmailing(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    await forwardToApp(fallbackNext);
  }

  async function submitGoogle() {
    setGoogleing(true);
    const result = await signInGoogle();
    setGoogleing(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    await forwardToApp(fallbackNext);
  }

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="mb-5 space-y-1">
        <h1 className="text-lg font-semibold tracking-tight text-[#111111]">
          {isSignUp ? "Create your account" : "Sign in to SheetApp"}
        </h1>
        <p className="text-sm text-[#6B7280]">
          {isSignUp
            ? "Turn a spreadsheet into a working internal app."
            : "Welcome back — your workspace is one step away."}
        </p>
      </div>

      {/* Google popup requires the Firebase-authorized domain (configured at
          project level; localhost + the production domain are authorized). */}
      <button
        type="button"
        onClick={submitGoogle}
        disabled={googleing || emailing}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {googleing ? "Waiting for Google…" : <><GoogleIcon /> Continue with Google</>}
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-[#9CA3AF]">
        <span className="h-px flex-1 bg-[#F0F1F3]" />
        or
        <span className="h-px flex-1 bg-[#F0F1F3]" />
      </div>

      <form onSubmit={submitEmailPassword} className="space-y-3">
        {isSignUp && (
          <div className="space-y-1.5">
            <Label htmlFor="auth-name">Full name</Label>
            <Input
              id="auth-name"
              type="text"
              autoComplete="name"
              placeholder="Raghib Alam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          {isSignUp ? (
            <Label htmlFor="auth-password">Password</Label>
          ) : (
            <div className="flex items-center justify-between">
              <Label htmlFor="auth-password">Password</Label>
              <a
                href="/forgot-password"
                className="text-xs font-medium text-[#6B7280] hover:text-[#111111]"
              >
                Forgot password?
              </a>
            </div>
          )}
          <Input
            id="auth-password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <Button type="submit" className="w-full" loading={emailing} disabled={googleing}>
          {isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-[#6B7280]">
        {isSignUp ? "Already have an account? " : "New to SheetApp? "}
        <a
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-medium text-[#111111] hover:underline"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </a>
      </p>
    </div>
  );
}
