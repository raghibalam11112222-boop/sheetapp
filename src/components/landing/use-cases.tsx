import { Building2, FolderKanban, Package, ShoppingCart, UserCog, Users } from "lucide-react";
import { SectionHeading } from "./section-heading";

const USE_CASES = [
  {
    icon: Users,
    title: "Customer Management",
    body: "Turn customer spreadsheets into a searchable CRM-like system.",
  },
  {
    icon: Package,
    title: "Inventory",
    body: "Track stock, products, suppliers, and low-stock items.",
  },
  {
    icon: ShoppingCart,
    title: "Orders",
    body: "Manage orders without digging through rows.",
  },
  {
    icon: FolderKanban,
    title: "Projects",
    body: "Turn project trackers into structured project systems.",
  },
  {
    icon: UserCog,
    title: "Employees",
    body: "Manage employee records and internal information.",
  },
  {
    icon: Building2,
    title: "Operations",
    body: "Replace messy operational spreadsheets with a controlled workspace.",
  },
];

export function UseCases() {
  return (
    <section
      id="use-cases"
      aria-labelledby="usecases-heading"
      className="scroll-mt-32 border-y border-[rgba(0,0,0,0.08)] bg-white py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="usecases-heading"
          eyebrow="Use cases"
          title="One idea. Hundreds of spreadsheet problems."
          sub="If it lives in a spreadsheet today, SheetApp can run it tomorrow."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] p-5 transition-colors hover:border-[rgba(0,0,0,0.16)] hover:bg-white"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.08)] bg-white text-[#111318]">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="mt-3 text-[15px] font-semibold text-[#111318]">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#667085]">{item.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
