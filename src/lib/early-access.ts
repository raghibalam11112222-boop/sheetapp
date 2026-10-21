import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * Early-access accounting for the landing page counter.
 *
 * Single source of truth: the UI shows
 *   remaining = max(EARLY_ACCESS_LIMIT - CURRENT_USERS, 0)
 *
 * CURRENT_USERS comes from the real registered-user count in the database.
 * When the database is unreachable (e.g. static build, local demo), it falls
 * back to the EARLY_ACCESS_CURRENT_USERS env value so the page still renders
 * a stable, configurable number — never a random one. To switch fully to
 * live data later, no call-site changes are needed: this function already
 * prefers the database.
 */
export const EARLY_ACCESS_LIMIT = 1000;

const FALLBACK_CURRENT_USERS = 153;

function fallbackCurrentUsers(): number {
  const raw = process.env.EARLY_ACCESS_CURRENT_USERS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(parsed) && (parsed as number) >= 0) return parsed as number;
  return FALLBACK_CURRENT_USERS;
}

export type EarlyAccessStatus = {
  limit: number;
  totalUsers: number;
  remaining: number;
  exhausted: boolean;
};

export const getEarlyAccessStatus = cache(async (): Promise<EarlyAccessStatus> => {
  try {
    const totalUsers = await prisma.user.count();
    const remaining = Math.max(EARLY_ACCESS_LIMIT - totalUsers, 0);
    return {
      limit: EARLY_ACCESS_LIMIT,
      totalUsers,
      remaining,
      exhausted: remaining === 0,
    };
  } catch {
    const totalUsers = fallbackCurrentUsers();
    const remaining = Math.max(EARLY_ACCESS_LIMIT - totalUsers, 0);
    return {
      limit: EARLY_ACCESS_LIMIT,
      totalUsers,
      remaining,
      exhausted: remaining === 0,
    };
  }
});
