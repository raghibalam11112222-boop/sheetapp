import {
  ArrowRight,
  FolderKanban,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  UserCog,
  Users,
} from "lucide-react";
import { ReviewCard } from "./reviews";

const SIDEBAR = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Customers", icon: Users, active: false },
  { label: "Orders", icon: ShoppingCart, active: false },
  { label: "Inventory", icon: Package, active: false },
  { label: "Projects", icon: FolderKanban, active: false },
  { label: "Team", icon: UserCog, active: false },
  { label: "Settings", icon: Settings, active: false },
];

const STATS = [
  { label: "Customers", value: "2,431", delta: "+48 this month" },
  { label: "Orders", value: "8,293", delta: "+212 this week" },
  { label: "Revenue", value: "$84,290", delta: "+$6,140 this month" },
  { label: "Active Projects", value: "127", delta: "9 due this week" },
];

const RECENT = [
  { name: "John Smith", company: "Acme Inc.", status: "Active", revenue: "$12,400" },
  { name: "Sarah Lee", company: "Nova", status: "Active", revenue: "$8,200" },
];

export function Showcase() {
  return (
    <section aria-labelledby="showcase-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#667085]">
          Generated app
        </p>
        <h2
          id="showcase-heading"
          className="mt-3 text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#111318] sm:text-[2.75rem]"
        >
          Your data deserves better than a grid of cells.
        </h2>
        <p className="mt-4 text-pretty text-base leading-relaxed text-[#667085] sm:text-lg">
          This is what your team opens every morning — generated from a spreadsheet,
          ready for real work.
        </p>
      </div>

      <div
        role="img"
        aria-label="Sample SheetApp dashboard with sidebar navigation, business overview stats, and a recent customers table"
        className="mx-auto mt-10 flex max-w-5xl overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white text-left shadow-[0_24px_48px_-16px_rgb(16_24_40/0.16),0_1px_2px_rgb(16_24_40/0.05)]"
      >
        {/* Sidebar */}
        <div className="flex w-13 shrink-0 flex-col bg-[#111318] p-2 text-white sm:w-52 sm:p-3">
          <div className="flex items-center gap-2 px-1.5 py-2">
            <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-semibold text-[#111318]">
              S
            </span>
            <span className="hidden truncate text-sm font-semibold sm:block">SheetApp</span>
          </div>
          <ul className="mt-2 space-y-0.5">
            {SIDEBAR.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.label}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] font-medium ${
                    item.active ? "bg-white text-[#111318]" : "text-white/60"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="hidden truncate sm:block">{item.label}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto flex items-center gap-2 border-t border-white/10 px-1.5 pt-3">
            <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-semibold text-white">
              A
            </span>
            <span className="hidden min-w-0 leading-tight sm:block">
              <span className="block truncate text-[13px] font-medium text-white">Alex</span>
              <span className="block text-[11px] text-white/50">Manager</span>
            </span>
          </div>
        </div>

        {/* Main dashboard */}
        <div className="min-w-0 flex-1 bg-[#F8F9FB] p-4 sm:p-6">
          <p className="text-lg font-semibold tracking-[-0.01em] text-[#111318] sm:text-xl">
            Good morning, Alex
          </p>
          <p className="mt-0.5 text-[13px] text-[#667085]">Overview</p>

          <dl className="mt-4 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2.5"
              >
                <dt className="truncate text-[11px] font-medium uppercase tracking-wide text-[#667085]">
                  {stat.label}
                </dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums tracking-[-0.01em] text-[#111318]">
                  {stat.value}
                </dd>
                <dd className="truncate text-[11px] text-[#667085]">{stat.delta}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 overflow-hidden rounded-xl border border-[rgba(0,0,0,0.08)] bg-white">
            <p className="border-b border-[rgba(0,0,0,0.08)] px-3.5 py-2.5 text-[13px] font-semibold text-[#111318]">
              Recent Customers
            </p>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[#667085]">
                  <th scope="col" className="px-3.5 py-2 text-[11px] font-medium">Customer</th>
                  <th scope="col" className="hidden px-3.5 py-2 text-[11px] font-medium sm:table-cell">
                    Company
                  </th>
                  <th scope="col" className="px-3.5 py-2 text-[11px] font-medium">Status</th>
                  <th scope="col" className="px-3.5 py-2 text-right text-[11px] font-medium">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {RECENT.map((row) => (
                  <tr key={row.name} className="border-t border-[rgba(0,0,0,0.06)]">
                    <td className="px-3.5 py-2.5 font-semibold text-[#111318]">{row.name}</td>
                    <td className="hidden px-3.5 py-2.5 text-[#667085] sm:table-cell">
                      {row.company}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="rounded-full bg-[#F0FDF4] px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-medium tabular-nums text-[#111318]">
                      {row.revenue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2.5 text-[12px] text-[#667085]">Updated just now · 2,431 records</p>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-5xl text-center">
        <a
          href="#product"
          className="group inline-flex h-11 min-h-[44px] items-center gap-2 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-6 text-sm font-medium text-[#111318] transition-[background-color,opacity,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-[#F8F9FB] hover:shadow-[0_4px_12px_-4px_rgb(16_24_40/0.2)] active:translate-y-0 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
        >
          View demo <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
        </a>
      </div>
      <div className="mx-auto mt-8 max-w-[320px]">
        <ReviewCard index={3} />
      </div>
    </section>
  );
}
