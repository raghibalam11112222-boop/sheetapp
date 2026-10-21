import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";

export function FinalCta({ startHref }: { startHref: string }) {
  return (
    <section aria-labelledby="final-cta-heading" className="relative overflow-hidden bg-[#0B0C0F]">
      {/* Subtle background grid, faded toward the edges */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_65%_70%_at_50%_45%,black_20%,transparent_75%)]"
      />
      <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-24">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/50">
          Spreadsheet <span aria-hidden>→</span> Business App
        </p>
        <h2
          id="final-cta-heading"
          className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl"
        >
          Your spreadsheet already contains your business.
        </h2>
        <p className="mt-4 text-base text-white/70 sm:text-lg">Give it a better interface.</p>
        <div className="mx-auto mt-8 flex max-w-xl flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={startHref}
            className="inline-flex h-12 min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-[15px] font-medium text-[#111318] transition-[background-color,opacity,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-white/90 hover:shadow-[0_4px_16px_-2px_rgb(0_0_0/0.5)] active:translate-y-0 active:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
          >
            <Upload className="h-4 w-4" aria-hidden />
            Claim Free Access
          </Link>
          <a
            href="#how-it-works"
            className="group inline-flex h-12 min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-6 text-[15px] font-medium text-white transition-[background-color,opacity,transform] duration-150 hover:-translate-y-px hover:bg-white/10 active:translate-y-0 active:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
          >
            See how it works <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
          </a>
        </div>
        <p className="mt-5 text-[13px] text-white/50">
          Upload → Review → Generate → Use. Edit anything, anytime.
        </p>
      </div>
    </section>
  );
}
