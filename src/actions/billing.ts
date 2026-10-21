"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAction, ActionError } from "@/lib/action";
import { requirePermissionOn } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { track, logAudit } from "@/lib/analytics/track";
import { getBillingProvider } from "@/lib/billing/provider";

const planSchema = z.enum(["FREE", "STARTER", "BUSINESS", "PRO"]);

export async function changePlanAction(plan: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("billing:manage");
    const parsed = planSchema.safeParse(plan);
    if (!parsed.success) throw new ActionError("Invalid plan.", "VALIDATION");

    const current = await prisma.subscription.findUnique({
      where: { organizationId: ctx.orgId },
    });
    if (current?.plan === parsed.data && current.status === "ACTIVE") {
      throw new ActionError("You are already on this plan.", "DUPLICATE");
    }

    const provider = getBillingProvider();
    const { plan: nextPlan } = await provider.changePlan({
      orgId: ctx.orgId,
      userId: ctx.userId,
      plan: parsed.data,
    });

    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "billing.plan_changed",
      entityType: "subscription",
      metadata: { plan: nextPlan, provider: provider.name },
    });
    await track("subscription_started", {
      orgId: ctx.orgId,
      userId: ctx.userId,
      metadata: { plan: nextPlan },
    });

    revalidatePath("/", "layout");
    return { plan: nextPlan };
  });
}
