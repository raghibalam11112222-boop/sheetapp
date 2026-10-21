import { ArrowDown, ArrowRight, Check, FileSpreadsheet } from "lucide-react";

const COLUMNS = [
  { name: "Customer ID", type: "identifier" },
  { name: "Company", type: "text" },
  { name: "Email", type: "email" },
  { name: "Revenue", type: "currency" },
  { name: "Status", type: "enum" },
];

const BADGES = [
  "Field detection",
  "Relationships",
  "Duplicate detection",
  "Data validation",
  "Business structure",
];

export function Intelligence() {
  return (
    <section aria-labelledby="intelligence-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 sm:p-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#667085]">
            Intelligence
          </p>
          <h2
            id="intelligence-heading"
            className="mt-3 text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#111318] sm:text-[2.75rem]"
          >
            It doesn&apos;t just read your spreadsheet. It understands it.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-[#667085] sm:text-lg">
            SheetApp identifies the structure behind your data so you don&apos;t have to
            build your system from scratch.
          </p>
        </div>

        {/* Technical visualization: columns → structure → entity tree */}
        <div className="mt-8 rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-4 sm:p-6">
          <p className="sr-only">
            Technical visualization: the columns of Customers dot x l s x are analyzed
            into a detected structure with a Customers entity related to Orders and Revenue.
          </p>
          <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center" aria-hidden={false}>
            {/* Source columns */}
            <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#111318]">
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#667085]" aria-hidden />
                Customers.xlsx
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {COLUMNS.map((col) => (
                  <li
                    key={col.name}
                    className="flex items-center justify-between gap-2 rounded-md bg-[#F8F9FB] px-2.5 py-1.5"
                  >
                    <span className="truncate font-mono text-[12px] font-medium text-[#111318]">
                      {col.name}
                    </span>
                    <span className="shrink-0 rounded border border-[rgba(0,0,0,0.08)] bg-white px-1.5 py-px font-mono text-[10px] text-[#667085]">
                      {col.type}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Transition */}
            <div className="flex items-center justify-center gap-2 md:flex-col" aria-hidden>
              <ArrowRight className="hidden h-4 w-4 text-[#667085] md:block" />
              <ArrowDown className="h-4 w-4 text-[#667085] md:hidden" />
              <span className="rounded-md bg-[#111318] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-white">
                STRUCTURE DETECTED
              </span>
              <ArrowRight className="hidden h-4 w-4 text-[#667085] md:block" />
              <ArrowDown className="h-4 w-4 text-[#667085] md:hidden" />
            </div>

            {/* Entity tree */}
            <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-3.5">
              <ul className="font-mono text-[12px]">
                <li>
                  <span className="inline-block rounded-md bg-[#111318] px-2.5 py-1.5 font-semibold text-white">
                    Customers
                  </span>
                  <ul className="ml-3 space-y-2 border-l border-[rgba(0,0,0,0.12)] pl-4 pt-2">
                    <li className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-4 top-1/2 h-px w-4 bg-[rgba(0,0,0,0.12)]"
                      />
                      <span className="inline-block rounded-md border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] px-2.5 py-1.5 font-medium text-[#111318]">
                        ├── Orders
                      </span>
                      <span className="mt-1 block font-sans text-[11px] text-[#667085]">
                        via customer_id
                      </span>
                    </li>
                    <li className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-4 top-1/2 h-px w-4 bg-[rgba(0,0,0,0.12)]"
                      />
                      <span className="inline-block rounded-md border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] px-2.5 py-1.5 font-medium text-[#111318]">
                        └── Revenue
                      </span>
                      <span className="mt-1 block font-sans text-[11px] text-[#667085]">
                        rollup · currency
                      </span>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <ul aria-label="Detection capabilities" className="mt-6 flex flex-wrap justify-center gap-2">
          {BADGES.map((badge) => (
            <li
              key={badge}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] px-3.5 py-1.5 text-sm font-medium text-[#111318]"
            >
              <Check className="h-3.5 w-3.5 text-[#16A34A]" aria-hidden />
              {badge}
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-5 max-w-xl text-center text-sm leading-relaxed text-[#667085]">
          No magic, no black box — every detected table, type and relationship is shown
          for your review before anything is created.
        </p>
      </div>
    </section>
  );
}
