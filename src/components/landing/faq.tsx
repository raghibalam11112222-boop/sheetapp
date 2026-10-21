"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SectionHeading } from "./section-heading";

const FAQS = [
  {
    q: "What spreadsheets can I upload?",
    a: "Excel (.xlsx and .xls) and CSV files. Every file is validated server-side, parsed safely without running macros or formulas, and summarized — sheets, columns, row counts — before anything else happens.",
  },
  {
    q: "Does SheetApp replace Excel?",
    a: "Not exactly. SheetApp turns your most important spreadsheet workflows into structured internal apps — with a database, dashboard, forms, and permissions — while Excel stays useful for quick one-off analysis.",
  },
  {
    q: "Do I need to know how to code?",
    a: "No. SheetApp is built for non-technical business owners and operations teams. Upload your file, review what was detected, and click Generate — no databases, schemas, or SQL required.",
  },
  {
    q: "Can I edit my data after importing it?",
    a: "Yes. Add, edit, and delete records, rename fields, change field types, and adjust relationships at any time. Your app stays editable long after import.",
  },
  {
    q: "Can multiple employees use the app?",
    a: "Yes, depending on the selected plan. Invite teammates with Admin, Manager, Member, or Viewer roles, and change or remove access whenever you need to.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Export everything back to CSV or Excel at any time. Your data remains yours, and leaving is never punished.",
  },
  {
    q: "Can I connect Google Sheets?",
    a: "Google Sheets integration is planned. It is not available yet — Excel and CSV uploads are fully supported today, and we won't pretend otherwise.",
  },
  {
    q: "What happens when you reach 1,000 users?",
    a: "SheetApp will transition from the free early-access period to paid weekly plans.",
  },
  {
    q: "Do early-access users pay?",
    a: "Early-access users can use SheetApp for free during the initial 1,000-user launch period.",
  },
  {
    q: "How will pricing work after early access?",
    a: "SheetApp will use simple weekly plans designed around different team sizes and usage levels.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="mx-auto max-w-3xl scroll-mt-32 px-4 py-16 sm:px-6 sm:py-20"
    >
      <SectionHeading
        id="faq-heading"
        eyebrow="FAQ"
        title="Answers, before you upload"
      />
      <div className="mt-8 space-y-3">
        {FAQS.map((item, i) => {
          const open = openIndex === i;
          return (
            <div
              key={item.q}
              className={`rounded-xl border bg-white transition-[border-color,background-color,box-shadow,transform] duration-200 motion-reduce:transform-none motion-reduce:transition-none hover:-translate-y-px hover:border-[rgba(0,0,0,0.14)] hover:shadow-[0_8px_24px_-8px_rgb(16_24_40/0.12)] ${
                open
                  ? "border-[rgba(0,0,0,0.14)] bg-[#F8F9FB]/60 shadow-[0_8px_24px_-8px_rgb(16_24_40/0.1)]"
                  : "border-[rgba(0,0,0,0.08)]"
              }`}
            >
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`faq-panel-${i}`}
                id={`faq-button-${i}`}
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
              >
                <span className="text-[15px] font-semibold text-[#111318]">{item.q}</span>
                <span
                  aria-hidden
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-[transform,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                    open
                      ? "rotate-45 border-[#111318] bg-[#111318] text-white"
                      : "border-[rgba(0,0,0,0.08)] text-[#667085]"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
              <div
                id={`faq-panel-${i}`}
                role="region"
                aria-labelledby={`faq-button-${i}`}
                className={`grid transition-[grid-template-rows,opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                  open
                    ? "[grid-template-rows:1fr] opacity-100"
                    : "[grid-template-rows:0fr] -translate-y-1 opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-[#667085]">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
