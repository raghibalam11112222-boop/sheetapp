import { Reveal } from "./reveal";

export const REVIEWS = [
  {
    quote: "Upload a spreadsheet, review the detected tables, generate your app.",
    tag: "How it works",
  },
  {
    quote: "Tables, forms, search, filters, and roles — generated from your columns.",
    tag: "Generated apps",
  },
  {
    quote: "Invite the team with Admin, Manager, Member, or Viewer access.",
    tag: "Permissions",
  },
  {
    quote: "Rename fields, change types, and edit every record after import.",
    tag: "Editable",
  },
  {
    quote: "Export to CSV or Excel at any time. No lock-in.",
    tag: "Export",
  },
];

const FLOAT_DURATIONS = ["5s", "6s", "4.5s", "5.5s", "6s"];

export function ReviewCard({ index }: { index: number }) {
  const review = REVIEWS[index % REVIEWS.length];
  return (
    <Reveal delay={(index % 3) * 120} className="h-full">
      <figure
        className="animate-float flex h-full w-full flex-col rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/85 p-5 shadow-[0_12px_32px_-8px_rgb(16_24_40/0.14)] backdrop-blur-md"
        style={{
          animationDuration: FLOAT_DURATIONS[index % FLOAT_DURATIONS.length],
          animationDelay: `${(index % 3) * 0.7}s`,
        }}
      >
        <blockquote className="flex-1 text-[14px] leading-relaxed text-[#111318]">
          &ldquo;{review.quote}&rdquo;
        </blockquote>
        <figcaption className="mt-3 flex flex-wrap items-center gap-2 border-t border-[rgba(0,0,0,0.06)] pt-3">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
          <span className="text-[12px] font-medium text-[#667085]">SheetApp</span>
          <span className="ml-auto rounded-full border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] px-2 py-0.5 text-[11px] font-medium text-[#667085]">
            {review.tag}
          </span>
        </figcaption>
      </figure>
    </Reveal>
  );
}
