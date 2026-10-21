"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, LayoutGrid, LayoutTemplate, Menu, Route, Tag, X } from "lucide-react";
import { Logo } from "@/components/logo";

const NAV_LINKS = [
  { label: "Product", href: "#product", icon: LayoutGrid },
  { label: "How it works", href: "#how-it-works", icon: Route },
  { label: "Use cases", href: "#use-cases", icon: LayoutTemplate },
  { label: "Pricing", href: "#pricing", icon: Tag },
];

export function Navbar({
  isAuthenticated,
  startHref,
  signInHref,
}: {
  isAuthenticated: boolean;
  startHref: string;
  signInHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function closeMenu() {
    setOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <header
      className="animate-navbar-in fixed inset-x-0 top-0 z-50"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) closeMenu();
      }}
    >
      <a
        href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-[#111318] focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      {/* Early-access announcement — slim, quiet, part of the fixed stack */}
      <div className="border-b border-white/10 bg-[#0B0C0F] px-4 py-2 text-center">
        <p className="mx-auto max-w-3xl text-balance text-[13px] leading-snug text-white/70">
          Early access is <span className="font-semibold text-white">free</span> — paid
          plans start after the first{" "}
          <span className="font-semibold text-white">1,000 users</span>.{" "}
          <Link
            href={startHref}
            className="whitespace-nowrap font-semibold text-white underline-offset-4 transition-opacity duration-150 hover:underline active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Join early →
          </Link>
        </p>
      </div>
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <div
          className={`flex h-14 items-center justify-between gap-2 rounded-full border border-[rgba(0,0,0,0.08)] py-1.5 pl-4 pr-1.5 transition-[background-color,box-shadow,backdrop-filter] duration-300 motion-reduce:transition-none sm:pl-5 ${
            scrolled
              ? "bg-[rgba(255,255,255,0.9)] shadow-[0_12px_32px_-8px_rgb(16_24_40/0.2),0_1px_2px_rgb(16_24_40/0.08)] backdrop-blur-[20px]"
              : "bg-[rgba(255,255,255,0.75)] shadow-[0_8px_24px_-8px_rgb(16_24_40/0.14),0_1px_2px_rgb(16_24_40/0.06)] backdrop-blur-md"
          }`}
        >
          <Logo href="/" />
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-[#667085] transition-[color,background-color] duration-150 hover:bg-[rgba(0,0,0,0.04)] hover:text-[#111318] active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-1 md:flex">
            <Link
              href={signInHref}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-[#667085] transition-[color,opacity] duration-150 hover:text-[#111318] active:opacity-70"
            >
              {isAuthenticated ? "Dashboard" : "Sign in"}
            </Link>
            <Link
              href={startHref}
              className="inline-flex h-11 min-h-[44px] items-center rounded-full bg-[#111318] px-5 text-sm font-medium text-white shadow-[0_1px_2px_rgb(16_24_40/0.16)] transition-[background-color,opacity] duration-150 hover:bg-[#23272F] active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
            >
              Claim Free Access
            </Link>
          </div>
          <div className="flex items-center md:hidden">
            <button
              type="button"
              ref={menuButtonRef}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-full text-[#111318] transition-[background-color,opacity] duration-150 hover:bg-[rgba(0,0,0,0.04)] active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
            >
              {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>
        {open ? (
          <nav
            id="mobile-nav"
            aria-label="Mobile"
            className="animate-nav-menu mt-2 origin-top rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[rgba(255,255,255,0.95)] p-2 shadow-[0_24px_48px_-16px_rgb(16_24_40/0.2)] backdrop-blur-[20px] md:hidden"
          >
            <ul>
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2 transition-[background-color] duration-150 hover:bg-[rgba(0,0,0,0.04)] active:opacity-70"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] text-[#111318]">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="flex-1 text-[15px] font-medium text-[#111318]">
                        {link.label}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#667085]" aria-hidden />
                    </a>
                  </li>
                );
              })}
              <li className="mt-1 border-t border-[rgba(0,0,0,0.08)] pt-1">
                <Link
                  href={signInHref}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[48px] items-center rounded-xl px-4 py-2 text-[15px] font-medium text-[#667085] transition-[color] duration-150 hover:text-[#111318]"
                >
                  {isAuthenticated ? "Go to Dashboard" : "Sign in"}
                </Link>
              </li>
              <li className="p-1">
                <Link
                  href={startHref}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[48px] items-center justify-center rounded-xl bg-[#111318] px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(16_24_40/0.16)] transition-[background-color,opacity] duration-150 hover:bg-[#23272F] active:opacity-80"
                >
                  Upload a Spreadsheet
                </Link>
              </li>
            </ul>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
