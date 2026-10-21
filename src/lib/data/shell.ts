import { cache } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Per-request shared loaders for shell/dashboard pages.
 *
 * The (app) layout AND the page both need the workspace app list and the
 * org-wide record counts — without sharing, every navigation runs the
 * expensive COUNT(*) GROUP BY over all org records 2-4 times. React cache()
 * dedupes these to a single execution per request. Read-only, so sharing is
 * always safe.
 */

export interface ShellApp {
  id: string;
  name: string;
  status: string;
  tables: { id: string; label: string }[];
}

/** Workspace apps with table labels (newest first). */
export const getOrgApps = cache(
  async (orgId: string, take?: number): Promise<ShellApp[]> => {
    return prisma.application.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        status: true,
        tables: {
          select: { id: true, label: true },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
    });
  }
);

/** Record counts per application for the whole org (the heavy query). */
export const getAppRecordCounts = cache(
  async (orgId: string): Promise<Map<string, number>> => {
    const rows = await prisma.$queryRaw<{ applicationId: string; c: number }[]>(
      Prisma.sql`
        SELECT "applicationId", COUNT(*)::int AS c
        FROM "record"
        WHERE "organizationId" = ${orgId}
        GROUP BY "applicationId"
      `
    );
    return new Map(rows.map((r) => [r.applicationId, r.c]));
  }
);
