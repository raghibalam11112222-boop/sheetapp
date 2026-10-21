import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileSpreadsheet,
  ScanSearch,
  Table2,
  Upload,
} from "lucide-react";
import { SectionHeading } from "./section-heading";

function UploadVisual() {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-3" aria-hidden>
      <div className="rounded-lg border border-dashed border-[rgba(0,0,0,0.16)] bg-white px-3 py-4 text-center">
        <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[#111318] text-white">
          <Upload className="h-4 w-4" />
        </span>
        <p className="mt-2 text-[13px] font-medium text-[#111318]">Drop file here or browse</p>
        <p className="mt-0.5 text-[11px] text-[#667085]">XLSX · XLS · CSV</p>
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-2.5 py-2">
        <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#667085]" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#111318]">
          Customers.xlsx
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-[#667085]">2.4 MB</span>
        <Check className="h-3.5 w-3.5 shrink-0 text-[#16A34A]" />
      </div>
    </div>
  );
}

function UnderstandVisual() {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-3" aria-hidden>
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#111318] text-white">
          <ScanSearch className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] font-semibold tracking-wide text-[#111318]">AI ANALYSIS</span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-[#111318]">
        {["Customers", "Orders", "Products"].map((entity, i) => (
          <span key={entity} className="flex items-center gap-1.5">
            {i > 0 ? <ArrowRight className="h-3 w-3 text-[#667085]" /> : null}
            <span className="rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-2 py-1">
              {entity}
            </span>
          </span>
        ))}
      </div>
      <ul className="mt-2.5 space-y-1.5 text-[12px]">
        <li className="flex items-center gap-1.5 font-medium text-[#111318]">
          <Check className="h-3.5 w-3.5 shrink-0 text-[#16A34A]" />
          Relationships detected
        </li>
        <li className="flex items-center gap-1.5 text-[#667085]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D97706]" />
          Duplicate records&nbsp;<span className="font-semibold text-[#111318]">12</span>
        </li>
        <li className="flex items-center gap-1.5 text-[#667085]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D97706]" />
          Missing values&nbsp;<span className="font-semibold text-[#111318]">27</span>
        </li>
      </ul>
    </div>
  );
}

function GenerateVisual() {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-3" aria-hidden>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#111318]">
          <Table2 className="h-3.5 w-3.5" />
          Customers App
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-semibold text-[#15803D]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
          Live
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[
          { k: "Records", v: "2,431" },
          { k: "Tables", v: "3" },
          { k: "Revenue", v: "$84K" },
        ].map((s) => (
          <div key={s.k} className="rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-1.5 py-1">
            <p className="text-[9px] font-medium uppercase tracking-wide text-[#667085]">{s.k}</p>
            <p className="text-[12px] font-semibold tabular-nums text-[#111318]">{s.v}</p>
          </div>
        ))}
      </div>
      <ul className="mt-1.5 space-y-1 text-[11px]">
        {["Dashboard", "Forms", "Permissions"].map((item) => (
          <li
            key={item}
            className="flex items-center gap-1.5 rounded-md border border-[rgba(0,0,0,0.06)] bg-white px-2 py-1.5 font-medium text-[#111318]"
          >
            <Check className="h-3 w-3 shrink-0 text-[#16A34A]" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Upload",
    body: "Drop your Excel or CSV file into SheetApp.",
    visual: <UploadVisual />,
  },
  {
    n: "02",
    title: "Understand",
    body: "SheetApp identifies your data, fields, relationships, duplicates, and business structure.",
    visual: <UnderstandVisual />,
  },
  {
    n: "03",
    title: "Generate",
    body: "Get a working dashboard, database, forms, and permissions.",
    visual: <GenerateVisual />,
  },
];

export function HowItWorks({ startHref }: { startHref: string }) {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="mx-auto max-w-6xl scroll-mt-32 px-4 py-16 sm:px-6 sm:py-20"
    >
      <SectionHeading
        id="how-heading"
        eyebrow="How it works"
        title="From spreadsheet to app in minutes."
        sub="Three steps. You review everything before anything is created."
      />
      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step) => (
          <li
            key={step.n}
            className="flex flex-col rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4 transition-shadow duration-150 hover:shadow-[0_8px_24px_-8px_rgb(16_24_40/0.12)]"
          >
            {step.visual}
            <div className="flex items-center gap-2 px-1 pt-4">
              <span className="text-xs font-semibold tracking-wide text-[#667085]">{step.n}</span>
              <span aria-hidden className="h-px flex-1 bg-[rgba(0,0,0,0.08)]" />
            </div>
            <h3 className="px-1 pt-2 text-[15px] font-semibold text-[#111318]">{step.title}</h3>
            <p className="flex-1 px-1 pt-1 text-sm leading-relaxed text-[#667085]">{step.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8 text-center">
        <Link
          href={startHref}
          className="group inline-flex h-11 min-h-[44px] items-center gap-2 rounded-xl bg-[#111318] px-6 text-sm font-medium text-white shadow-[0_1px_2px_rgb(16_24_40/0.16)] transition-[background-color,opacity,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-[#23272F] hover:shadow-[0_4px_12px_-2px_rgb(16_24_40/0.25)] active:translate-y-0 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
        >
          Claim Free Access <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
