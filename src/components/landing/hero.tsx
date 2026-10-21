import Link from "next/link";
import { ArrowRight, Database, Download, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { HeroVisual } from "./hero-visual";
import { ReviewCard } from "./reviews";

const TRUST_ITEMS = [
  { icon: FileSpreadsheet, label: "XLSX · XLS · CSV" },
  { icon: Database, label: "No rebuild required" },
  { icon: ShieldCheck, label: "Roles & permissions" },
  { icon: Download, label: "Export anytime" },
];

export function Hero({ startHref }: { startHref: string }) {
  return (
    <section aria-labelledby="hero-heading" className="mx-auto max-w-5xl px-4 pb-14 pt-32 text-center sm:px-6 sm:pt-32 lg:pt-28">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1 text-[13px] font-medium text-[#667085]">
        Spreadsheet <span aria-hidden>→</span> Internal App
      </span>
      <h1
        id="hero-heading"
        className="mx-auto mt-5 max-w-3xl text-balance text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.02em] text-[#111318] sm:text-5xl lg:text-[4rem]"
      >
        Turn the spreadsheet your business depends on into a{" "}
        <span className="underline decoration-[rgba(0,0,0,0.28)] decoration-2 underline-offset-[6px]">
          real internal app
        </span>
        .
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-[#667085] sm:text-lg">
        Upload your Excel or CSV file. SheetApp turns your spreadsheet into a
        structured database, dashboard, forms, and workflows — automatically.
      </p>
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={startHref}
          className="group inline-flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#111318] px-6 text-[15px] font-medium text-white shadow-[0_1px_2px_rgb(16_24_40/0.16)] transition-[background-color,opacity,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-[#23272F] hover:shadow-[0_4px_12px_-2px_rgb(16_24_40/0.25)] active:translate-y-0 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318] sm:w-auto"
        >
          Claim Free Access
          <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
        </Link>
        <a
          href="#how-it-works"
          className="inline-flex h-11 min-h-[44px] w-full items-center justify-center rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-6 text-[15px] font-medium text-[#111318] transition-[background-color,opacity,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-[#F8F9FB] hover:shadow-[0_4px_12px_-4px_rgb(16_24_40/0.2)] active:translate-y-0 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318] sm:w-auto"
        >
          See how it works
        </a>
      </div>
      <p className="mt-4 text-[13px] text-[#667085]">
        No coding required · Start with your existing spreadsheet
      </p>

      <HeroVisual />

      <ul
        aria-label="SheetApp guarantees"
        className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-2"
      >
        {TRUST_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.label}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#111318]"
            >
              <Icon className="h-3.5 w-3.5 text-[#667085]" aria-hidden />
              {item.label}
            </li>
          );
        })}
      </ul>

      <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
        <ReviewCard index={0} />
        <ReviewCard index={1} />
      </div>
    </section>
  );
}
