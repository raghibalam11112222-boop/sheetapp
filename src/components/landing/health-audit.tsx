import Link from "next/link";
import { ArrowRight, Stethoscope } from "lucide-react";

const FINDINGS = [
  { label: "Potential duplicates", detail: "“Acme Co” in 3 variants", count: 12 },
  { label: "Inconsistent statuses", detail: "“active” vs “Active”", count: 4 },
  { label: "Missing required values", detail: "7 emails · 20 phones", count: 27 },
  { label: "Invalid dates", detail: "DD/MM mixed with MM/DD", count: 3 },
  { label: "Unused columns", detail: "Empty or notes-only", count: 8 },
];

const MAX = Math.max(...FINDINGS.map((f) => f.count));
const TOTAL = FINDINGS.reduce((sum, f) => sum + f.count, 0);

export function HealthAudit({ startHref }: { startHref: string }) {
  return (
    <section
      aria-labelledby="health-heading"
      className="border-y border-[rgba(0,0,0,0.08)] bg-white py-16 sm:py-20"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="text-center lg:text-left">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#667085]">
            Spreadsheet health
          </p>
          <h2
            id="health-heading"
            className="mt-3 text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#111318] sm:text-[2.75rem]"
          >
            Find problems hiding inside your spreadsheet.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-[#667085] sm:text-lg lg:mx-0">
            Before turning your spreadsheet into an app, SheetApp helps you understand
            what&apos;s wrong with the data.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row lg:justify-start sm:justify-center">
            <Link
              href={startHref}
              className="inline-flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#111318] px-6 text-sm font-medium text-white shadow-[0_1px_2px_rgb(16_24_40/0.16)] transition-[background-color,opacity,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-[#23272F] hover:shadow-[0_4px_12px_-2px_rgb(16_24_40/0.25)] active:translate-y-0 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318] sm:w-auto"
            >
              Analyze your spreadsheet
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <p className="mt-3 text-[13px] text-[#667085]">
            Fix automatically, skip rows, or import anyway — your call.
          </p>
        </div>

        <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#111318] text-white">
                <Stethoscope className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#111318]">Spreadsheet Health</p>
                <p className="text-[12px] text-[#667085]">Customers.xlsx · 2,431 rows</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[#111318] px-2.5 py-1 text-[12px] font-semibold tabular-nums text-white">
              {TOTAL} findings
            </span>
          </div>
          <dl className="mt-4 space-y-3">
            {FINDINGS.map((finding) => (
              <div
                key={finding.label}
                className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3.5 py-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[13px] font-semibold text-[#111318]">{finding.label}</dt>
                  <dd className="text-sm font-semibold tabular-nums text-[#111318]">
                    {finding.count}
                  </dd>
                </div>
                <dd className="mt-0.5 text-[12px] text-[#667085]">{finding.detail}</dd>
                <div
                  className="mt-2 h-1 overflow-hidden rounded-full bg-[rgba(0,0,0,0.06)]"
                  role="img"
                  aria-label={`${finding.label}: ${finding.count} of ${MAX} maximum`}
                >
                  <div
                    className="h-full rounded-full bg-[#111318]"
                    style={{ width: `${Math.max(6, Math.round((finding.count / MAX) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
