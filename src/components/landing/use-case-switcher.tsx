"use client";

import { useRef, useState } from "react";
import { FolderKanban, Package, ShoppingCart, Users } from "lucide-react";

type Tone = "green" | "amber" | "red";

type PreviewRow = {
  title: string;
  sub: string;
  badge: string;
  tone: Tone;
  right: string;
};

type UseCaseTab = {
  id: string;
  label: string;
  icon: typeof Users;
  heading: string;
  stats: string[];
  rows: PreviewRow[];
};

const TABS: UseCaseTab[] = [
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    heading: "Customers",
    stats: ["2,431 records", "218 active this month"],
    rows: [
      { title: "John Smith", sub: "Acme Inc.", badge: "Active", tone: "green", right: "$12,400" },
      { title: "Sarah Lee", sub: "Nova", badge: "Active", tone: "green", right: "$8,200" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    heading: "Inventory",
    stats: ["421 products", "8 low stock", "3 out of stock"],
    rows: [
      { title: "Acme Widget", sub: "SKU-001", badge: "In stock", tone: "green", right: "142 pcs" },
      { title: "Nova Gizmo", sub: "SKU-014", badge: "Low stock", tone: "amber", right: "3 pcs" },
      { title: "Zenith Part", sub: "SKU-022", badge: "Out of stock", tone: "red", right: "0 pcs" },
    ],
  },
  {
    id: "orders",
    label: "Orders",
    icon: ShoppingCart,
    heading: "Orders",
    stats: ["8,293 orders", "$124K this month"],
    rows: [
      { title: "Order #1023", sub: "Acme Inc.", badge: "Completed", tone: "green", right: "$12,400" },
      { title: "Order #1042", sub: "Nova", badge: "Processing", tone: "amber", right: "$8,200" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    icon: FolderKanban,
    heading: "Projects",
    stats: ["127 active projects", "9 due this week"],
    rows: [
      { title: "Website Redesign", sub: "Acme Inc.", badge: "Due Friday", tone: "amber", right: "82%" },
      { title: "Warehouse Audit", sub: "Nova", badge: "On track", tone: "green", right: "45%" },
    ],
  },
];

const TONE_CLASSES: Record<Tone, string> = {
  green: "bg-[#F0FDF4] text-[#15803D]",
  amber: "bg-[#FFFBEB] text-[#92400E]",
  red: "bg-[#FEF2F2] text-[#B91C1C]",
};

export function UseCaseSwitcher() {
  const [activeId, setActiveId] = useState(TABS[0].id);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = TABS.find((t) => t.id === activeId) ?? TABS[0];

  function onTabKeyDown(e: React.KeyboardEvent, index: number) {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % TABS.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + TABS.length) % TABS.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = TABS.length - 1;
    if (next !== null) {
      e.preventDefault();
      setActiveId(TABS[next].id);
      tabRefs.current[next]?.focus();
    }
  }

  return (
    <section aria-labelledby="switcher-heading" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
      <h2 id="switcher-heading" className="sr-only">
        Explore SheetApp by use case
      </h2>
      <div className="overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white shadow-[0_12px_32px_-8px_rgb(16_24_40/0.1)]">
        <div className="grid md:grid-cols-[220px_1fr]">
          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Use cases"
            className="flex gap-1 overflow-x-auto border-b border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-2 sm:p-3 md:flex-col md:border-b-0 md:border-r"
          >
            {TABS.map((tab, i) => {
              const Icon = tab.icon;
              const selected = tab.id === activeId;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  role="tab"
                  id={`usecase-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`usecase-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveId(tab.id)}
                  onKeyDown={(e) => onTabKeyDown(e, i)}
                  className={`flex min-h-[44px] shrink-0 items-center gap-2.5 rounded-xl px-3.5 text-sm font-medium transition-[background-color,color] duration-150 ${
                    selected
                      ? "bg-[#111318] text-white"
                      : "text-[#667085] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#111318]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Preview */}
          <div
            key={active.id}
            role="tabpanel"
            id={`usecase-panel-${active.id}`}
            aria-labelledby={`usecase-tab-${active.id}`}
            className="animate-panel-swap min-w-0 p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-lg font-semibold tracking-[-0.01em] text-[#111318]">
                {active.heading}
              </p>
              <ul className="flex flex-wrap gap-1.5" aria-label={`${active.heading} summary`}>
                {active.stats.map((stat) => (
                  <li
                    key={stat}
                    className="rounded-full border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] px-2.5 py-0.5 text-[12px] font-medium tabular-nums text-[#111318]"
                  >
                    {stat}
                  </li>
                ))}
              </ul>
            </div>
            <ul className="mt-4 space-y-1.5">
              {active.rows.map((row) => (
                <li
                  key={`${row.title}-${row.sub}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[rgba(0,0,0,0.06)] px-3 py-2.5"
                >
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[13px] font-semibold text-[#111318]">
                      {row.title}
                    </span>
                    <span className="block truncate text-[12px] text-[#667085]">{row.sub}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[row.tone]}`}
                    >
                      {row.badge}
                    </span>
                    <span className="text-[13px] font-medium tabular-nums text-[#111318]">
                      {row.right}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
