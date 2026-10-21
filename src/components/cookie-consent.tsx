"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "sheetapp-cookie-consent";
const COOKIE_NAME = "sheetapp_cookie_consent";

function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return false;
}

function getClientSnapshot(): boolean {
  try {
    return !window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return true;
  }
}

function writeConsent(value: "accepted" | "rejected") {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Private mode — banner simply shows again next visit.
  }
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${secure}`;
}

/**
 * Cookie consent banner. SheetApp only uses strictly-necessary cookies
 * (session, workspace) plus first-party product analytics — no advertising
 * or cross-site tracking. The choice is stored locally for a year.
 */
export function CookieConsent() {
  // No stored choice -> show. Server snapshot is false so SSR HTML never
  // mismatches hydration; the client takes over immediately after.
  const showByDefault = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);
  const visible = showByDefault && !dismissed;

  if (!visible) return null;

  function choose(value: "accepted" | "rejected") {
    writeConsent(value);
    setDismissed(true);
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-lg sm:flex-row sm:items-center">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F8F9FA] text-[#6B7280]">
          <Cookie className="h-4 w-4" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[#6B7280]">
          <span className="font-medium text-[#111111]">We use cookies. </span>
          Only what the app needs to work (sign-in, workspace) plus basic
          usage counts. No ads, no cross-site tracking.{" "}
          <Link href="/privacy" className="font-medium text-[#111111] hover:underline">
            Learn more
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={() => choose("rejected")}>
            Decline
          </Button>
          <Button size="sm" onClick={() => choose("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
