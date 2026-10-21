"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  FileSpreadsheet,
  LayoutDashboard,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Users,
} from "lucide-react";
import { SectionHeading } from "./section-heading";
import { ReviewCard } from "./reviews";

const SHEET_TABS = ["Customers", "Orders", "old_data_2023"];

const SHEET_ROWS = [
  { customer: "Acme Co", company: "Acme Inc", status: "Active", revenue: "$12,400", dup: false },
  { customer: "acme co.", company: "Acme inc", status: "active", revenue: "12400", dup: true },
  { customer: "Nova Ltd", company: "Nova", status: "—", revenue: "$8.200,00", dup: false },
  {
    customer: "Zenith",
    company: "=VLOOKUP(B4, Suppliers!A:D, 4, FALSE)",
    status: "Pending",
    revenue: "#REF!",
    dup: false,
  },
];

const BEFORE_ISSUES = [
  "50 columns",
  "Inconsistent formatting",
  "Multiple tabs",
  "Duplicate rows",
  "Confusing formulas",
];

const SIDEBAR = [
  { label: "Dashboard", icon: LayoutDashboard, active: false },
  { label: "Customers", icon: Users, active: true },
  { label: "Orders", icon: ShoppingCart, active: false },
  { label: "Inventory", icon: Package, active: false },
];

const STATUS_FILTERS = ["All", "Active", "Pending"] as const;

type SampleCustomer = {
  name: string;
  company: string;
  status: "Active" | "Pending";
  revenue: string;
};

const BASE_ROWS: SampleCustomer[] = [
  { name: "John Smith", company: "Acme", status: "Active", revenue: "$12,400" },
  { name: "Sarah Lee", company: "Nova", status: "Active", revenue: "$8,200" },
  { name: "Omar Diaz", company: "Zenith", status: "Pending", revenue: "$18,900" },
];

function AfterPanel() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [rows, setRows] = useState<SampleCustomer[]>(BASE_ROWS);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    (row) =>
      (status === "All" || row.status === status) &&
      (q === "" ||
        row.name.toLowerCase().includes(q) ||
        row.company.toLowerCase().includes(q))
  );

  function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    setRows((prev) => [
      ...prev,
      { name: cleanName, company: company.trim() || "—", status: "Active", revenue: "—" },
    ]);
    setName("");
    setCompany("");
    setQuery("");
    setStatus("All");
    setFormOpen(false);
  }

  return (
    <div className="flex min-h-full flex-col overflow-hidden rounded-2xl border-2 border-[#111318] bg-white shadow-[0_12px_32px_-8px_rgb(16_24_40/0.16)]">
      <p className="border-b border-[rgba(0,0,0,0.08)] px-5 pb-0 pt-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#667085]">
        After
      </p>
      <div className="flex flex-1">
        {/* Clean navigation */}
        <ul aria-label="Sample app navigation" className="flex w-12 shrink-0 flex-col gap-1 border-r border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-2 sm:w-40 sm:p-3">
          {SIDEBAR.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.label}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] font-medium sm:px-2.5 ${
                  item.active ? "bg-[#111318] text-white" : "text-[#667085]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden truncate sm:block">{item.label}</span>
              </li>
            );
          })}
        </ul>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[15px] font-semibold text-[#111318]">Customers</p>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] px-2 py-0.5 text-[11px] font-medium text-[#667085]">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Manager · can edit
            </span>
          </div>

          {/* Search + filters (fully working sample) */}
          <div className="mt-3 flex flex-col gap-2">
            <label htmlFor="after-search" className="sr-only">
              Search sample customers
            </label>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#667085]"
              />
              <input
                id="after-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customers…"
                autoComplete="off"
                className="h-9 w-full rounded-lg border border-[rgba(0,0,0,0.08)] bg-white pl-8 pr-2.5 text-[13px] text-[#111318] placeholder:text-[#667085] focus:border-[#111318] focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={`min-h-[40px] rounded-full border px-3.5 text-[12px] font-medium transition-[background-color,color,border-color] duration-150 ${
                    status === s
                      ? "border-[#111318] bg-[#111318] text-white"
                      : "border-[rgba(0,0,0,0.08)] bg-white text-[#667085] hover:text-[#111318]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <ul key={`${status}-${rows.length}`} aria-label="Sample customers" className="animate-panel-swap mt-3 space-y-1.5">
            {visible.map((row) => (
              <li
                key={`${row.name}-${row.company}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-[rgba(0,0,0,0.06)] px-2.5 py-2"
              >
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[13px] font-semibold text-[#111318]">
                    {row.name}
                  </span>
                  <span className="block truncate text-[12px] text-[#667085]">{row.company}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${
                      row.status === "Active"
                        ? "bg-[#F0FDF4] text-[#15803D]"
                        : "bg-[#FFFBEB] text-[#92400E]"
                    }`}
                  >
                    {row.status}
                  </span>
                  <span className="text-[13px] font-medium tabular-nums text-[#111318]">
                    {row.revenue}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {visible.length === 0 ? (
            <p className="mt-3 rounded-lg bg-[#F8F9FB] px-3 py-2.5 text-center text-[13px] text-[#667085]">
              No customers match. Try clearing the search.
            </p>
          ) : null}
          <p aria-live="polite" className="mt-2 text-[12px] text-[#667085]">
            Showing {visible.length} of {rows.length} customers
          </p>

          {/* Inline form (adds to the local sample) */}
          {formOpen ? (
            <form
              onSubmit={addCustomer}
              className="mt-3 rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-3"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label htmlFor="after-name" className="mb-1 block text-[12px] font-medium text-[#111318]">
                    Name
                  </label>
                  <input
                    id="after-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace"
                    autoComplete="off"
                    className="h-9 w-full rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-2.5 text-[13px] text-[#111318] focus:border-[#111318] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="after-company" className="mb-1 block text-[12px] font-medium text-[#111318]">
                    Company
                  </label>
                  <input
                    id="after-company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Analytical Ltd"
                    autoComplete="off"
                    className="h-9 w-full rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-2.5 text-[13px] text-[#111318] focus:border-[#111318] focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="inline-flex h-9 min-h-[36px] flex-1 items-center justify-center rounded-md bg-[#111318] text-[13px] font-medium text-white transition-opacity duration-150 hover:bg-[#23272F] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add to sample
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="inline-flex h-9 min-h-[36px] items-center rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-3 text-[13px] font-medium text-[#667085] hover:text-[#111318]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="mt-3 inline-flex h-9 min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg bg-[#111318] text-[13px] font-medium text-white transition-[background-color,opacity] duration-150 hover:bg-[#23272F] active:opacity-80"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New customer (form)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Transformation() {
  return (
    <section
      id="product"
      aria-labelledby="transformation-heading"
      className="scroll-mt-32 border-y border-[rgba(0,0,0,0.08)] bg-white py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="transformation-heading"
          eyebrow="The transformation"
          title="From spreadsheet chaos to a business app."
          sub="Same data. One side is a file your team is afraid to touch — the other is an app they use every day. Try the live sample."
        />
        <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
          {/* BEFORE */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB]">
            <p className="px-5 pb-0 pt-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#667085]">
              Before
            </p>
            <div className="flex items-center gap-2.5 px-5 pt-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.08)] bg-white text-[#667085]">
                <FileSpreadsheet className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111318]">
                  Customers_final_v7_REAL.xlsx
                </p>
                <p className="text-[12px] text-[#667085]">50 columns · 2,431 rows</p>
              </div>
            </div>
            <div className="px-5 pt-3" aria-label="Spreadsheet tabs">
              <div className="flex gap-1 border-b border-[rgba(0,0,0,0.08)] text-[12px] font-medium">
                {SHEET_TABS.map((tab, i) => (
                  <span
                    key={tab}
                    className={`truncate px-2.5 pb-1.5 ${
                      i === 0
                        ? "border-b-2 border-[#111318] text-[#111318]"
                        : "text-[#667085]"
                    }`}
                  >
                    {tab}
                  </span>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto px-5 pt-2">
              <table className="w-full min-w-[460px] border-collapse text-[12px]">
                <caption className="sr-only">
                  Messy spreadsheet sample with inconsistent formatting, a duplicate row and a broken formula
                </caption>
                <thead>
                  <tr className="text-left text-[#667085]">
                    {["Customer", "Company", "Status", "Revenue"].map((h) => (
                      <th key={h} scope="col" className="border-b border-[rgba(0,0,0,0.08)] py-1.5 pr-3 text-[11px] font-medium">
                        {h}
                      </th>
                    ))}
                    <th scope="col" className="border-b border-[rgba(0,0,0,0.08)] py-1.5 text-right text-[11px] font-medium text-[#667085]">
                      + 46 more →
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[#111318]">
                  {SHEET_ROWS.map((row) => (
                    <tr
                      key={`${row.customer}-${row.revenue}`}
                      className={`border-b border-[rgba(0,0,0,0.04)] last:border-0 ${
                        row.dup ? "bg-[#FFFBEB]" : undefined
                      }`}
                    >
                      <td className="py-1.5 pr-3 font-medium">{row.customer}</td>
                      <td className="max-w-[180px] truncate py-1.5 pr-3 font-mono text-[11px]">
                        {row.company}
                      </td>
                      <td className="py-1.5 pr-3">{row.status}</td>
                      <td className="py-1.5 pr-3 tabular-nums">{row.revenue}</td>
                      <td aria-hidden className="py-1.5 text-right text-[#667085]">…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul aria-label="Spreadsheet problems visible above" className="flex flex-wrap gap-1.5 px-5 py-4">
              {BEFORE_ISSUES.map((issue) => (
                <li
                  key={issue}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-1 text-[11px] font-medium text-[#92400E]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D97706]" aria-hidden />
                  {issue}
                </li>
              ))}
            </ul>
          </div>

          {/* Central transition indicator */}
          <div className="flex items-center justify-center" aria-hidden>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#111318] text-white shadow-[0_8px_24px_-8px_rgb(16_24_40/0.4)]">
              <ArrowRight className="hidden h-5 w-5 lg:block" />
              <ArrowDown className="h-5 w-5 lg:hidden" />
            </span>
          </div>

          {/* AFTER */}
          <AfterPanel />
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-[13px] leading-relaxed text-[#667085]">
          Spreadsheet <span aria-hidden>→</span> Business App. Search, filters, forms and
          permissions — generated from the file you already have.
        </p>
        <div className="mx-auto mt-8 max-w-[320px]">
          <ReviewCard index={2} />
        </div>
      </div>
    </section>
  );
}
