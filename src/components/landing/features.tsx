import { Check, Download, FileSpreadsheet, Lock, Search, Table2 } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { ReviewCard } from "./reviews";

function DatabaseVisual() {
  return (
    <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-3" aria-hidden>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#111318]">
        <Table2 className="h-3.5 w-3.5 text-[#667085]" />
        customers
        <span className="ml-auto font-mono font-normal text-[#667085]">2,431 rows</span>
      </div>
      <div className="mt-2 space-y-1.5">
        {[
          { id: "C-1023", name: "Acme Co", tag: "identifier" },
          { id: "C-1024", name: "Nova Ltd", tag: "text" },
        ].map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-2 rounded-md border border-[rgba(0,0,0,0.06)] bg-white px-2 py-1.5"
          >
            <span className="rounded bg-[#111318] px-1.5 py-px font-mono text-[10px] font-medium text-white">
              {row.id}
            </span>
            <span className="flex-1 truncate text-[12px] font-medium text-[#111318]">{row.name}</span>
            <span className="rounded border border-[rgba(0,0,0,0.08)] px-1.5 py-px font-mono text-[10px] text-[#667085]">
              {row.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchVisual() {
  return (
    <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-3" aria-hidden>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#667085]" />
        <div className="flex h-9 items-center rounded-lg border border-[#111318] bg-white pl-8 pr-2.5 text-[13px] text-[#111318]">
          acme
          <span className="ml-1 inline-block h-4 w-px motion-safe:animate-pulse bg-[#111318]" />
        </div>
      </div>
      <div className="mt-2 rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-2.5 py-2">
        <p className="text-[12px] font-semibold text-[#111318]">
          Acme Co <span className="font-normal text-[#667085]">· Acme Inc.</span>
        </p>
        <p className="mt-0.5 text-[11px] text-[#667085]">
          1 of 1 match · found in <span className="font-medium text-[#111318]">0.02s</span>
        </p>
      </div>
    </div>
  );
}

function FormsVisual() {
  return (
    <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-3" aria-hidden>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-[11px] font-medium text-[#111318]">Name</p>
          <div className="rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-2 py-1.5 text-[12px] text-[#111318]">
            Ada Lovelace
          </div>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-medium text-[#111318]">Status</p>
          <div className="rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-2 py-1.5 text-[12px] text-[#667085]">
            Active ▾
          </div>
        </div>
      </div>
      <div className="mt-2 flex h-8 items-center justify-center rounded-md bg-[#111318] text-[12px] font-medium text-white">
        Create record
      </div>
      <p className="mt-1.5 text-center text-[11px] text-[#667085]">Validated before saving</p>
    </div>
  );
}

function PermissionsVisual() {
  const roles = [
    { name: "Alex", role: "Admin", access: "Full access", tone: "bg-[#111318] text-white" },
    { name: "Sam", role: "Manager", access: "Create · Edit", tone: "bg-[#F0FDF4] text-[#15803D]" },
    { name: "Jo", role: "Viewer", access: "View only", tone: "bg-[#F8F9FB] text-[#667085]" },
  ];
  return (
    <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-3" aria-hidden>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#111318]">
        <Lock className="h-3.5 w-3.5 text-[#667085]" />
        Who can edit Customers?
      </div>
      <ul className="mt-2 space-y-1.5">
        {roles.map((r) => (
          <li
            key={r.role}
            className="flex items-center gap-2 rounded-md border border-[rgba(0,0,0,0.06)] bg-white px-2 py-1.5"
          >
            <span className="flex-1 truncate text-[12px] font-medium text-[#111318]">
              {r.name}
              <span className="font-normal text-[#667085]"> · {r.access}</span>
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.tone}`}>
              {r.role}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ValidationVisual() {
  return (
    <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-3" aria-hidden>
      <div>
        <p className="mb-1 text-[11px] font-medium text-[#111318]">Work email</p>
        <div className="rounded-md border border-[#DC2626] bg-white px-2 py-1.5 text-[12px] text-[#111318]">
          ada@analytical
        </div>
        <p className="mt-1 text-[11px] font-medium text-[#DC2626]">Enter a valid email address</p>
      </div>
      <div className="mt-2">
        <p className="mb-1 text-[11px] font-medium text-[#111318]">Phone</p>
        <div className="flex items-center justify-between rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-2 py-1.5 text-[12px] text-[#111318]">
          +1 555 014 2288
          <Check className="h-3.5 w-3.5 text-[#16A34A]" />
        </div>
      </div>
    </div>
  );
}

function ExportVisual() {
  return (
    <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-3" aria-hidden>
      <div className="flex items-center gap-2 rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-2.5 py-2">
        <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#667085]" />
        <span className="flex-1 truncate text-[12px] font-medium text-[#111318]">
          customers_export.csv
        </span>
        <span className="text-[11px] tabular-nums text-[#667085]">2,431 rows</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {["CSV", "Excel"].map((format) => (
          <div
            key={format}
            className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-[#111318] text-[12px] font-medium text-white"
          >
            <Download className="h-3.5 w-3.5" />
            {format}
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-center text-[11px] text-[#667085]">Never locked in</p>
    </div>
  );
}

const FEATURES = [
  {
    title: "Structured database",
    body: "Turn spreadsheet data into structured records.",
    visual: <DatabaseVisual />,
  },
  {
    title: "Powerful search",
    body: "Find the information you need instantly.",
    visual: <SearchVisual />,
  },
  {
    title: "Forms",
    body: "Create and update records without touching the underlying database.",
    visual: <FormsVisual />,
  },
  {
    title: "Permissions",
    body: "Control who can view and edit information.",
    visual: <PermissionsVisual />,
  },
  {
    title: "Data validation",
    body: "Prevent bad data from entering your system.",
    visual: <ValidationVisual />,
  },
  {
    title: "Export anytime",
    body: "Your data remains yours.",
    visual: <ExportVisual />,
  },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-heading" className="mx-auto max-w-6xl scroll-mt-32 px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeading
        id="features-heading"
        eyebrow="Features"
        title="Everything a real app needs."
        sub="Generated from your spreadsheet — not bolted on afterwards."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="flex flex-col rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4 transition-shadow duration-150 hover:shadow-[0_8px_24px_-8px_rgb(16_24_40/0.12)]"
          >
            {feature.visual}
            <h3 className="px-1 pt-4 text-[15px] font-semibold text-[#111318]">{feature.title}</h3>
            <p className="px-1 pt-1 text-sm leading-relaxed text-[#667085]">{feature.body}</p>
          </article>
        ))}
      </div>
      <div className="mx-auto mt-8 max-w-[320px]">
        <ReviewCard index={4} />
      </div>
    </section>
  );
}
