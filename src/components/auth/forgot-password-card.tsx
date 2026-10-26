"use client";

import { useState } from "react";
import { toast } from "sonner";
import { requestPasswordReset } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Sends a Firebase-generated password reset email.
 *
 * The email links back to /sign-in?reset=1 (via the SDK's continue-url), so
 * after the visitor picks a new password on any device they land on the
 * sign-in card with a confirmation toast — same journey as the previous
 * Clerk "Forgot password?" flow, but now a real flow of our own.
 */
export function ForgotPasswordCard() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const result = await requestPasswordReset(email.trim());
    setSending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Reset link sent to ${email.trim()} — check your inbox.`);
    setEmail("");
  }

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="mb-5 space-y-1">
        <h1 className="text-lg font-semibold tracking-tight text-[#111111]">
          Reset your password
        </h1>
        <p className="text-sm text-[#6B7280]">
          Enter the email you signed up with — we&apos;ll send a reset link.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="forgot-email">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" loading={sending}>
          Send reset link
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-[#6B7280]">
        Remembered it?{" "}
        <a href="/sign-in" className="font-medium text-[#111111] hover:underline">
          Back to sign in
        </a>
      </p>
    </div>
  );
}
