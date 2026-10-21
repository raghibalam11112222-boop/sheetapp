import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "./plans";

export type PlanId = "FREE" | "STARTER" | "BUSINESS" | "PRO";

/** Resolves an unknown plan id to a known tier (fail closed to FREE). */
export function getPlanLimits(planId: string | null | undefined) {
  const key = (planId ?? "FREE").toUpperCase();
  return PLAN_LIMITS[key] ?? PLAN_LIMITS["FREE"];
}

/** Current plan id for an org (FREE when no subscription exists). */
export async function getOrgPlanId(orgId: string): Promise<string> {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    select: { plan: true },
  });
  return sub?.plan ?? "FREE";
}

export interface LimitCheck {
  ok: boolean;
  /** Human-readable upgrade prompt when over the limit. */
  message?: string;
  limit?: number;
  current?: number;
}

const UPGRADE = "Upgrade your plan to raise this limit.";

export function canCreateApp(planId: string | null | undefined, currentApps: number): LimitCheck {
  const limits = getPlanLimits(planId);
  if (currentApps >= limits.apps) {
    return {
      ok: false,
      message: `Your plan allows ${limits.apps} app${limits.apps === 1 ? "" : "s"}. ${UPGRADE}`,
      limit: limits.apps,
      current: currentApps,
    };
  }
  return { ok: true, limit: limits.apps, current: currentApps };
}

export function canInviteMember(
  planId: string | null | undefined,
  currentSeats: number
): LimitCheck {
  const limits = getPlanLimits(planId);
  if (currentSeats >= limits.seats) {
    return {
      ok: false,
      message: `Your plan allows ${limits.seats} seats. ${UPGRADE}`,
      limit: limits.seats,
      current: currentSeats,
    };
  }
  return { ok: true, limit: limits.seats, current: currentSeats };
}

export function canImportRows(
  planId: string | null | undefined,
  currentRecords: number,
  incomingRows: number
): LimitCheck {
  const limits = getPlanLimits(planId);
  if (currentRecords + incomingRows > limits.records) {
    return {
      ok: false,
      message: `Importing ${incomingRows.toLocaleString()} rows would exceed your plan's ${limits.records.toLocaleString()}-record limit. ${UPGRADE}`,
      limit: limits.records,
      current: currentRecords,
    };
  }
  return { ok: true, limit: limits.records, current: currentRecords };
}
