import { ArrowDown, ArrowRight, Check, FileSpreadsheet, Plus, ScanSearch, Search } from "lucide-react";

const PIPELINE_LABELS = ["Spreadsheet", "AI Analysis", "Business App"] as const;

const SHEET_ROWS = [
  { customer: "Acme", revenue: "$12,400" },
  { customer: "Nova", revenue: "$8,200" },
  { customer: "Zenith", revenue: "$18,900" },
];

const APP_ROWS = [
  { initials: "JS", name: "John Smith", company: "Acme", revenue: "$12,400" },
  { initials: "SL", name: "Sarah Lee", company: "Nova", revenue: "$8,200" },
];

export function HeroVisual() {
  return (
    <div className="mx-auto mt-10 w-full max-w-5xl overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white text-left shadow-[0_24px_48px_-16px_rgb(16_24_40/0.16),0_1px_2px_rgb(16_24_40/0.05)]">
      {/* Minimal app chrome — 1px hairlines only */}
      <div className="flex items-center gap-3 border-b border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
        </span>
        <span className="mx-auto hidden w-full max-w-xs truncate rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1 text-center text-[11px] font-medium text-[#667085] sm:block">
          sheetapp.com/apps/customers
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-semibold text-[#15803D] sm:ml-0">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" aria-hidden />
          Live
        </span>
      </div>

      <div className="bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F9FB_100%)] p-4 sm:p-6">
        <p className="sr-only">
          Visual example: Customers dot x l s x with customer and revenue columns
          is analyzed, then becomes a live SheetApp Customers application with
          profiles and an Add Customer button.
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1.2fr] md:items-center">
          {/* Step 1: Spreadsheet */}
          <div className="animate-hero-1 relative">
            <div
              aria-hidden
              className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB]"
            />
            <div className="relative rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/85 p-3 shadow-[0_1px_2px_rgb(16_24_40/0.06)] backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-[#111318]">
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-[#667085]" aria-hidden />
                  <span className="truncate">Customers.xlsx</span>
                </span>
              </div>
              <table className="mt-2 w-full text-[12px]">
                <caption className="sr-only">Spreadsheet sample with customer and revenue columns</caption>
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.08)] text-left text-[#667085]">
                    <th scope="col" className="py-1.5 pr-2 text-[11px] font-medium">Customer</th>
                    <th scope="col" className="py-1.5 text-right text-[11px] font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="text-[#111318]">
                  {SHEET_ROWS.map((row) => (
                    <tr key={row.customer} className="border-b border-[rgba(0,0,0,0.04)] last:border-0">
                      <td className="py-1.5 pr-2 font-medium">{row.customer}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-[#667085]">Sheet1 · 1,248 rows</p>
            </div>
          </div>

          <div className="animate-hero-2 flex items-center justify-center" aria-hidden>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(0,0,0,0.08)] bg-white shadow-[0_1px_2px_rgb(16_24_40/0.08)]">
              <ArrowRight className="hidden h-3.5 w-3.5 text-[#667085] md:block" />
              <ArrowDown className="h-3.5 w-3.5 text-[#667085] md:hidden" />
            </span>
          </div>

          {/* Step 2: AI Analysis */}
          <div className="animate-hero-2 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/70 p-3.5 shadow-[0_1px_2px_rgb(16_24_40/0.06)] backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#111318] text-white">
                <ScanSearch className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="text-xs font-semibold tracking-wide text-[#111318]">AI ANALYSIS</span>
            </div>
            <ul className="mt-2.5 space-y-1.5 text-[12px] text-[#111318]">
              {["Field types detected", "Customers → Orders linked", "Statuses normalized"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#16A34A]" aria-hidden />
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="animate-hero-2 flex items-center justify-center" aria-hidden>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(0,0,0,0.08)] bg-white shadow-[0_1px_2px_rgb(16_24_40/0.08)]">
              <ArrowRight className="hidden h-3.5 w-3.5 text-[#667085] md:block" />
              <ArrowDown className="h-3.5 w-3.5 text-[#667085] md:hidden" />
            </span>
          </div>

          {/* Step 3: Generated application */}
          <div className="animate-hero-3 relative">
            <div
              aria-hidden
              className="absolute inset-0 translate-x-2 translate-y-2 rounded-xl bg-[#111318]/[0.06]"
            />
            <div className="relative rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/90 p-3 shadow-[0_12px_32px_-8px_rgb(16_24_40/0.18)] backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#111318] text-[11px] font-semibold text-white" aria-hidden>
                    S
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-xs font-semibold text-[#111318]">SheetApp</p>
                    <p className="truncate text-[11px] text-[#667085]">Customers</p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] px-1.5 py-1 text-[10px] font-medium text-[#667085]">
                  <Search className="h-3 w-3" aria-hidden />
                  Search
                </span>
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {APP_ROWS.map((row) => (
                  <li
                    key={row.name}
                      className="flex items-center gap-2.5 rounded-lg border border-[rgba(0,0,0,0.06)] bg-white px-2 py-1.5"
                  >
                    <span
                      aria-hidden
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111318] text-[10px] font-semibold text-white"
                    >
                      {row.initials}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[12px] font-semibold text-[#111318]">
                        {row.name}
                      </span>
                      <span className="block truncate text-[11px] text-[#667085]">{row.company}</span>
                    </span>
                    <span className="shrink-0 text-right leading-tight">
                      <span className="block text-[12px] font-semibold tabular-nums text-[#111318]">
                        {row.revenue}
                      </span>
                      <span className="mt-0.5 inline-block rounded-full bg-[#F0FDF4] px-1.5 py-px text-[9px] font-semibold text-[#15803D]">
                        Active
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <span className="mt-2.5 flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg bg-[#111318] text-[12px] font-medium text-white">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add Customer
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[12px] text-[#667085]">
          {PIPELINE_LABELS.map((label, i) => (
            <span key={label} className="inline-flex items-center gap-2">
              {i > 0 ? <ArrowRight className="h-3 w-3" aria-hidden /> : null}
              <span className={i === 2 ? "font-semibold text-[#111318]" : undefined}>{label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
