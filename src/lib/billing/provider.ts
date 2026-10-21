import { prisma } from "@/lib/db";

/**
 * Payment provider boundary (app.txt §35 "Billing Architecture").
 *
 * MVP runs in mock mode: plan changes apply immediately with no payment
 * provider involved. A real provider (e.g. Stripe) plugs in by implementing
 * this interface — checkout sessions, webhooks and secret handling all live
 * behind it, so no payment secrets ever touch the rest of the codebase.
 * Select with BILLING_PROVIDER (only "mock" is implemented).
 */
export type BillingProviderName = "mock";

export interface PlanChange {
  plan: "FREE" | "STARTER" | "BUSINESS" | "PRO";
}

export interface BillingProvider {
  readonly name: BillingProviderName;
  changePlan(opts: {
    orgId: string;
    userId: string;
    plan: PlanChange["plan"];
  }): Promise<{ plan: PlanChange["plan"] }>;
}

class MockBillingProvider implements BillingProvider {
  readonly name = "mock" as const;

  async changePlan(opts: {
    orgId: string;
    userId: string;
    plan: PlanChange["plan"];
  }): Promise<{ plan: PlanChange["plan"] }> {
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.subscription.upsert({
      where: { organizationId: opts.orgId },
      create: {
        organizationId: opts.orgId,
        plan: opts.plan,
        status: "ACTIVE",
        currentPeriodEnd: periodEnd,
      },
      update: { plan: opts.plan, status: "ACTIVE", currentPeriodEnd: periodEnd },
    });
    return { plan: opts.plan };
  }
}

export function getBillingProvider(): BillingProvider {
  const configured = (process.env.BILLING_PROVIDER ?? "mock").trim().toLowerCase();
  if (configured !== "mock") {
    // Only mock mode is implemented. Refuse loudly instead of silently
    // running without payments.
    throw new Error(
      `[SheetApp] BILLING_PROVIDER="${configured}" is not implemented. Only "mock" is available in this build.`
    );
  }
  return new MockBillingProvider();
}
