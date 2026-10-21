"use server";

import { withAction, ActionError } from "@/lib/action";
import { requirePermissionOn } from "@/lib/auth/guards";
import { canEditRecord } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { validateRecordData } from "@/lib/validation/records";
import { findUniqueConflict, getRecordRow } from "@/lib/data/records";
import { runWorkflowsAfterUpdate } from "@/lib/workflow/engine";
import { logAudit, track } from "@/lib/analytics/track";

async function loadTable(orgId: string, tableId: string) {
  const table = await prisma.generatedTable.findFirst({
    where: { id: tableId, organizationId: orgId },
    include: {
      fields: { orderBy: { position: "asc" } },
      application: { select: { id: true, organizationId: true } },
    },
  });
  if (!table) throw new ActionError("Table not found.", "NOT_FOUND");
  return table;
}

export async function createRecordAction(tableId: string, input: Record<string, unknown>) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("record:create");
    const table = await loadTable(ctx.orgId, tableId);

    const { data, errors } = validateRecordData(table.fields, input);
    if (Object.keys(errors).length) {
      throw new ActionError(Object.values(errors)[0] ?? "Please fix the errors below.", "VALIDATION");
    }

    const conflict = await findUniqueConflict({
      orgId: ctx.orgId,
      tableId,
      fields: table.fields,
      data,
    });
    if (conflict) {
      const field = table.fields.find((f) => f.name === conflict);
      throw new ActionError(`${field?.label ?? "That value"} already exists.`, "DUPLICATE");
    }

    const record = await prisma.record.create({
      data: {
        organizationId: ctx.orgId,
        applicationId: table.applicationId,
        tableId,
        data,
        createdById: ctx.userId,
      },
    });

    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "record.created",
      entityType: "record",
      entityId: record.id,
      metadata: { tableId },
    });
    await track("record_created", { orgId: ctx.orgId, userId: ctx.userId });
    return { id: record.id };
  });
}

export async function updateRecordAction(
  recordId: string,
  input: Record<string, unknown>
) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("record:update");
    const existing = await getRecordRow(ctx.orgId, recordId);
    if (!existing) throw new ActionError("Record not found.", "NOT_FOUND");
    if (!canEditRecord(ctx.role, existing.createdById, ctx.userId)) {
      throw new ActionError("You can only edit records assigned to you.", "FORBIDDEN");
    }

    const table = await loadTable(ctx.orgId, existing.tableId);
    const { data, errors } = validateRecordData(table.fields, input);
    if (Object.keys(errors).length) {
      throw new ActionError(Object.values(errors)[0] ?? "Please fix the errors below.", "VALIDATION");
    }

    const conflict = await findUniqueConflict({
      orgId: ctx.orgId,
      tableId: table.id,
      fields: table.fields,
      data,
      excludeRecordId: recordId,
    });
    if (conflict) {
      const field = table.fields.find((f) => f.name === conflict);
      throw new ActionError(`${field?.label ?? "That value"} already exists.`, "DUPLICATE");
    }

    await prisma.record.update({
      where: { id: recordId },
      data: { data },
    });

    await runWorkflowsAfterUpdate({
      orgId: ctx.orgId,
      applicationId: table.applicationId,
      tableId: table.id,
      recordId,
      previous: existing.data as Record<string, unknown>,
      next: data,
    });

    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "record.updated",
      entityType: "record",
      entityId: recordId,
      metadata: { tableId: table.id },
    });
    await track("record_updated", { orgId: ctx.orgId, userId: ctx.userId });
    return { id: recordId };
  });
}

export async function deleteRecordAction(recordId: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("record:delete");
    const existing = await getRecordRow(ctx.orgId, recordId);
    if (!existing) throw new ActionError("Record not found.", "NOT_FOUND");

    await prisma.record.deleteMany({ where: { id: recordId, organizationId: ctx.orgId } });

    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "record.deleted",
      entityType: "record",
      entityId: recordId,
      metadata: { tableId: existing.tableId },
    });
    await track("record_deleted", { orgId: ctx.orgId, userId: ctx.userId });
    return { id: recordId };
  });
}
