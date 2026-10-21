import { ArrowDown, ArrowRight, Download, FileSpreadsheet } from "lucide-react";

export function ExportSection() {
  return (
    <section aria-labelledby="export-heading" className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#667085]">
        No lock-in
      </p>
      <h2
        id="export-heading"
        className="mx-auto mt-3 max-w-xl text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#111318] sm:text-[2.75rem]"
      >
        Your data is yours.
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-[#667085] sm:text-lg">
        SheetApp should make your business easier to run — not make it harder to leave.
      </p>

      <div className="mx-auto mt-8 flex max-w-xl flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3.5 py-3 text-left">
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#667085]" aria-hidden />
          <span>
            <span className="block text-[13px] font-semibold text-[#111318]">Import</span>
            <span className="block text-[12px] text-[#667085]">Excel / CSV</span>
          </span>
        </div>
        <span className="flex items-center justify-center" aria-hidden>
          <ArrowDown className="h-4 w-4 text-[#667085] sm:hidden" />
          <ArrowRight className="hidden h-4 w-4 text-[#667085] sm:block" />
        </span>
        <div className="flex flex-1 items-center gap-2.5 rounded-xl bg-[#111318] px-3.5 py-3 text-left text-white">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[13px] font-semibold text-[#111318]" aria-hidden>
            S
          </span>
          <span>
            <span className="block text-[13px] font-semibold">SheetApp</span>
            <span className="block text-[12px] text-white/60">Your workspace</span>
          </span>
        </div>
        <span className="flex items-center justify-center" aria-hidden>
          <ArrowDown className="h-4 w-4 text-[#667085] sm:hidden" />
          <ArrowRight className="hidden h-4 w-4 text-[#667085] sm:block" />
        </span>
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3.5 py-3 text-left">
          <Download className="h-4 w-4 shrink-0 text-[#667085]" aria-hidden />
          <span>
            <span className="block text-[13px] font-semibold text-[#111318]">Export</span>
            <span className="block text-[12px] text-[#667085]">CSV / Excel</span>
          </span>
        </div>
      </div>
    </section>
  );
}
