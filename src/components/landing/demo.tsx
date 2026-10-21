import Link from "next/link";
import { ArrowRight, Download, FileSpreadsheet, Upload } from "lucide-react";
import { SectionHeading } from "./section-heading";

export function Demo({ startHref }: { startHref: string }) {
  return (
    <section aria-labelledby="demo-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeading
        id="demo-heading"
        eyebrow="Try it yourself"
        title="See what your spreadsheet could become."
        sub="Use your own file, or start from a sample — both go through the real upload flow."
      />
      <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
        {/* Real upload entry — routes to the protected uploader */}
        <Link
          href={startHref}
          className="group flex flex-col rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-[rgba(0,0,0,0.16)] hover:shadow-[0_12px_32px_-8px_rgb(16_24_40/0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
        >
          <span className="rounded-xl border border-dashed border-[rgba(0,0,0,0.16)] bg-[#F8F9FB] px-4 py-8 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#111318] text-white">
              <Upload className="h-5 w-5" aria-hidden />
            </span>
            <span className="mt-3 block text-[15px] font-semibold text-[#111318]">
              Drop a spreadsheet here
            </span>
            <span className="mt-1 block text-[13px] text-[#667085]">XLSX · XLS · CSV</span>
          </span>
          <span className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#111318] px-6 text-sm font-medium text-white transition-colors duration-150 group-hover:bg-[#23272F]">
            Upload your spreadsheet <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
          <span className="mt-2 text-center text-[12px] text-[#667085]">
            Opens the secure uploader in your workspace
          </span>
        </Link>

        {/* Real sample file + live preview */}
        <div className="flex flex-col rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6">
          <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#667085]">
            No file handy?
          </span>
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] px-3.5 py-3">
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-[#667085]" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[#111318]">
                customers.csv
              </span>
              <span className="block text-[12px] tabular-nums text-[#667085]">
                12 customers · 6 columns
              </span>
            </span>
            <a
              href="/samples/customers.csv"
              download
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 text-[13px] font-medium text-[#111318] transition-colors duration-150 hover:bg-[#F8F9FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
            >
              <Download className="h-4 w-4" aria-hidden />
              Sample
            </a>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#667085]">
            Download the sample, then upload it above — or skip ahead and explore the
            working preview.
          </p>
          <a
            href="#product"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-6 text-sm font-medium text-[#111318] transition-[background-color,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-[#F8F9FB] hover:shadow-[0_4px_12px_-4px_rgb(16_24_40/0.2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
          >
            Try the live demo <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
