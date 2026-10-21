import { ArrowRight, Copy, History, Lock, Search, Sigma, Workflow } from "lucide-react";
import { SectionHeading } from "./section-heading";

const PROBLEMS = [
  {
    icon: Sigma,
    title: "Broken formulas",
    body: "One accidental edit can break critical calculations.",
  },
  {
    icon: Copy,
    title: "Duplicate records",
    body: "Different people enter the same customer or product twice.",
  },
  {
    icon: History,
    title: "Outdated versions",
    body: "Someone is always working from yesterday's file.",
  },
  {
    icon: Lock,
    title: "No permissions",
    body: "Everyone can change everything.",
  },
  {
    icon: Workflow,
    title: "Difficult workflows",
    body: "Spreadsheets weren't designed for business processes.",
  },
  {
    icon: Search,
    title: "Poor visibility",
    body: "Finding one important record shouldn't require scrolling through thousands of rows.",
  },
];

export function Problem() {
  return (
    <section aria-labelledby="problem-heading" className="bg-[#0B0C0F]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeading
          id="problem-heading"
          tone="dark"
          eyebrow="The problem"
          title="Your spreadsheet wasn't built to run your business."
          sub="Spreadsheets are great for starting. They become painful when your whole team depends on them."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map((problem) => {
            const Icon = problem.icon;
            return (
              <div
                key={problem.title}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-[border-color,background-color] duration-150 hover:border-white/20 hover:bg-white/[0.05]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-white">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="mt-3 text-[15px] font-semibold text-white">{problem.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/60">{problem.body}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <a
            href="#product"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/15 px-5 text-sm font-medium text-white/80 transition-[color,border-color] duration-150 hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            See the transformation <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
