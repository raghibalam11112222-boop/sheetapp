"use server";

import type { Prisma } from "@prisma/client";
import { withAction, ActionError } from "@/lib/action";
import { requirePermissionOn } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/analytics/track";
import { mergeRecordData } from "@/lib/data/duplicates";

export type DuplicateDecisionInput = "KEPT_SEPARATE" | "IGNORED";

/**
 * Merges a duplicate group: the oldest record becomes the master, blanks are
 * backfilled from the others, then the other records are deleted (app.txt §17).
 */
export async function mergeDuplicateGroupAction(tableId: string, recordIds: string[]) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("record:update");
    await requirePermissionOn("record:delete");
    const ids = [...new Set(recordIds)].slice(0, 50);
    if (ids.length < 2) throw new ActionError("Pick at least two records to merge.", "VALIDATION");

    const rows = await prisma.record.findMany({
      where: { id: { in: ids }, tableId, organizationId: ctx.orgId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    if (rows.length < 2) throw new ActionError("Those records no longer exist.", "NOT_FOUND");

    const [master, ...others] = rows;
    const merged = mergeRecordData(
      rows.map((r) => ({ data: (r.data ?? {}) as Record<string, unknown> }))
    );
    await prisma.record.update({ where: { id: master.id }, data: { data: merged as Prisma.InputJsonValue } });
    await prisma.record.deleteMany({
      where: { id: { in: others.map((r) => r.id) }, organizationId: ctx.orgId },
    });

    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "record.merged",
      entityType: "record",
      entityId: master.id,
      metadata: { tableId, mergedIds: others.map((r) => r.id) },
    });
    return { masterId: master.id, merged: others.length };
  });
}

/** Records a keep-separate / ignore decision so the group stops resurfacing. */
export async function decideDuplicateAction(
  tableId: string,
  key: string,
  decision: DuplicateDecisionInput
) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("record:update");
    const clean = key.trim().slice(0, 120);
    if (!clean) throw new ActionError("Invalid duplicate group.", "VALIDATION");
    const table = await prisma.generatedTable.findFirst({
      where: { id: tableId, organizationId: ctx.orgId },
    });
    if (!table) throw new ActionError("Table not found.", "NOT_FOUND");
    await prisma.duplicateDecision.upsert({
      where: {
        organizationId_tableId_key: { organizationId: ctx.orgId, tableId, key: clean },
      },
      update: { decision },
      create: { organizationId: ctx.orgId, tableId, key: clean, decision },
    });
    return { key: clean, decision };
  });
}

/** Reopens a dismissed duplicate group. */
export async function reopenDuplicateAction(tableId: string, key: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("record:update");
    await prisma.duplicateDecision.deleteMany({
      where: { organizationId: ctx.orgId, tableId, key },
    });
    return { key };
  });
}
