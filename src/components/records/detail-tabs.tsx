"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/components/ui/utils";

export interface DetailTab {
  id: string;
  label: string;
  content: ReactNode;
}

/** Tabbed sections for the record detail page (Overview, related tables, Activity). */
export function DetailTabs({ tabs }: { tabs: DetailTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "overview");
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!current) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const index = tabs.findIndex((t) => t.id === current.id);
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    setActive(next.id);
    document.getElementById(`detail-tab-${next.id}`)?.focus();
  }

  return (
    <div>
      <div
        className="flex gap-1 overflow-x-auto border-b border-[#E5E7EB]"
        role="tablist"
        aria-label="Record sections"
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`detail-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={tab.id === current.id}
            tabIndex={tab.id === current.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab.id === current.id
                ? "border-[#111111] text-[#111111]"
                : "border-transparent text-[#6B7280] hover:text-[#111111]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4" role="tabpanel">
        {current.content}
      </div>
    </div>
  );
}
