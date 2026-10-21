import { requireOrg, can } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/billing/plans";
import { BillingView, type BillingState } from "./billing-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Billing",
  description: "Your plan, usage, and billing settings.",
};

export default async function BillingPage() {
  const ctx = await requireOrg();

  const [subscription, recordCount, applicationCount, memberCount] = await Promise.all([
    prisma.subscription.findUnique({ where: { organizationId: ctx.orgId } }),
    prisma.record.count({ where: { organizationId: ctx.orgId } }),
    prisma.application.count({ where: { organizationId: ctx.orgId } }),
    prisma.membership.count({ where: { organizationId: ctx.orgId } }),
  ]);

  const currentPlan = subscription?.plan ?? "FREE";
  const state: BillingState = {
    currentPlan: currentPlan in PLAN_LIMITS ? currentPlan : "FREE",
    status: subscription?.status ?? "ACTIVE",
    periodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
    usage: { records: recordCount, apps: applicationCount, seats: memberCount },
    canManage: can(ctx.role, "billing:manage"),
    plans: Object.entries(PLAN_LIMITS).map(([id, plan]) => ({ id, ...plan })),
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#111111]">Billing</h1>
        <p className="text-sm text-[#6B7280]">
          Plans are simulated in this MVP — no payment provider is connected.
        </p>
      </div>
      <BillingView state={state} />
    </div>
  );
}
