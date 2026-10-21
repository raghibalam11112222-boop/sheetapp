import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";

export function StaticPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#111318]">
      <header className="border-b border-[rgba(0,0,0,0.08)] bg-white">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Logo href="/" />
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2 text-sm font-medium text-[#667085] transition-colors hover:text-[#111318]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2.5rem]">
          {title}
        </h1>
        <p className="mt-3 text-pretty text-base leading-relaxed text-[#667085] sm:text-lg">
          {intro}
        </p>
        <div className="mt-8 space-y-7">{children}</div>
      </main>
      <footer className="border-t border-[rgba(0,0,0,0.08)] bg-white">
        <p className="mx-auto max-w-2xl px-4 py-5 text-[13px] text-[#667085] sm:px-6">
          © 2026 SheetApp. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export function StaticSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[15px] font-semibold text-[#111318]">{heading}</h2>
      <div className="mt-1.5 space-y-2 text-[15px] leading-relaxed text-[#667085]">{children}</div>
    </section>
  );
}
