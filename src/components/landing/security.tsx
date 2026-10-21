import { Building2, FileCheck2, Lock, ShieldCheck, Users } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Role-based permissions",
    body: "Admin, Manager, Member, and Viewer roles — enforced on the server, not just hidden buttons.",
  },
  {
    icon: Lock,
    title: "Secure authentication",
    body: "Protected routes and secure server-side sessions. No secrets ever reach the browser.",
  },
  {
    icon: Building2,
    title: "Organization-level data isolation",
    body: "Every query is scoped to your workspace, so teams never see each other's data.",
  },
  {
    icon: FileCheck2,
    title: "Server-side validation",
    body: "Files, inputs, and AI-generated schemas are validated before anything is stored.",
  },
  {
    icon: Users,
    title: "Controlled access",
    body: "Invite teammates by role, change permissions, and remove access at any time.",
  },
];

export function Security() {
  return (
    <section id="security" aria-labelledby="security-heading" className="scroll-mt-32 border-y border-[rgba(0,0,0,0.08)] bg-[#F8F9FB] py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#667085]">Control</p>
            <h2 id="security-heading" className="mt-2 max-w-xl text-balance text-2xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#111318] sm:text-[2.5rem]">
              Your business data stays under your control.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[#667085]">
            Plain, verifiable protections — nothing you can&apos;t check, nothing we
            can&apos;t explain.
          </p>
        </div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0FDF4] text-[#15803D]">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="mt-2.5 text-sm font-semibold text-[#111318]">{item.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#667085]">{item.body}</p>
              </li>
            );
          })}
          <li className="flex flex-col justify-between rounded-xl bg-[#0B0C0F] p-4 text-white">
            <p className="text-sm font-semibold">No lock-in, either.</p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/60">
              Export everything to CSV or Excel whenever you want. Control means you can
              leave, too.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}
