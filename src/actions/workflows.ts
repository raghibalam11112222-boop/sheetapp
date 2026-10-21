"use server";

import { z } from "zod";
import { withAction, ActionError } from "@/lib/action";
import { requirePermissionOn } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/analytics/track";

const workflowSchema = z.object({
  applicationId: z.string().min(1),
  name: z.string().trim().min(2).max(60),
  enabled: z.boolean().default(true),
  triggerTableId: z.string().min(1),
  triggerFieldId: z.string().min(1),
  triggerValue: z.string().min(1).max(120),
  action: z.enum(["SET_FIELD", "NOTIFY", "CREATE_RECORD"]),
  actionTableId: z.string().optional().nullable(),
  actionFieldId: z.string().optional().nullable(),
  actionValue: z.string().max(240).optional().nullable(),
});

export type WorkflowInput = z.input<typeof workflowSchema>;

export async function saveWorkflowAction(input: WorkflowInput, workflowId?: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("workflow:manage");
    const parsed = workflowSchema.safeParse(input);
    if (!parsed.success) {
      throw new ActionError(parsed.error.issues[0]?.message ?? "Invalid workflow.", "VALIDATION");
    }
    const data = parsed.data;

    const app = await prisma.application.findFirst({
      where: { id: data.applicationId, organizationId: ctx.orgId },
    });
    if (!app) throw new ActionError("Application not found.", "NOT_FOUND");

    const table = await prisma.generatedTable.findFirst({
      where: { id: data.triggerTableId, organizationId: ctx.orgId, applicationId: app.id },
      include: { fields: true },
    });
    if (!table) throw new ActionError("Trigger table not found.", "NOT_FOUND");

    const fieldIds = table.fields.map((f) => f.name);
    if (!fieldIds.includes(data.triggerFieldId)) {
      throw new ActionError("Trigger field does not belong to that table.", "VALIDATION");
    }
    if (data.action === "SET_FIELD") {
      if (!data.actionFieldId || !fieldIds.includes(data.actionFieldId)) {
        throw new ActionError("Action field does not belong to that table.", "VALIDATION");
      }
      if (!data.actionValue) throw new ActionError("Action value is required.", "VALIDATION");
    }
    if (data.action === "CREATE_RECORD") {
      if (!data.actionTableId) throw new ActionError("Pick a target table.", "VALIDATION");
      const target = await prisma.generatedTable.findFirst({
        where: { id: data.actionTableId, organizationId: ctx.orgId, applicationId: app.id },
        include: { fields: { select: { name: true } } },
      });
      if (!target) throw new ActionError("Target table not found.", "NOT_FOUND");
      if (!data.actionFieldId || !target.fields.some((f) => f.name === data.actionFieldId)) {
        throw new ActionError("Action field does not belong to the target table.", "VALIDATION");
      }
      if (data.actionValue === undefined || data.actionValue === null || !data.actionValue.trim()) {
        throw new ActionError("Action value is required.", "VALIDATION");
      }
    }

    const payload = {
      ...data,
      organizationId: ctx.orgId,
      actionTableId: data.actionTableId ?? null,
      actionFieldId: data.actionFieldId ?? null,
      actionValue: data.actionValue ?? null,
    };

    if (workflowId) {
      const existing = await prisma.workflow.findFirst({
        where: { id: workflowId, organizationId: ctx.orgId },
      });
      if (!existing) throw new ActionError("Workflow not found.", "NOT_FOUND");
      await prisma.workflow.update({ where: { id: workflowId }, data: payload });
      await logAudit({
        orgId: ctx.orgId,
        actorUserId: ctx.userId,
        action: "workflow.updated",
        entityType: "workflow",
        entityId: workflowId,
      });
      return { id: workflowId };
    }

    const created = await prisma.workflow.create({ data: payload });
    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "workflow.created",
      entityType: "workflow",
      entityId: created.id,
    });
    return { id: created.id };
  });
}

export async function toggleWorkflowAction(workflowId: string, enabled: boolean) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("workflow:manage");
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, organizationId: ctx.orgId },
    });
    if (!workflow) throw new ActionError("Workflow not found.", "NOT_FOUND");
    await prisma.workflow.update({ where: { id: workflowId }, data: { enabled } });
    return { id: workflowId, enabled };
  });
}

export async function deleteWorkflowAction(workflowId: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("workflow:manage");
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, organizationId: ctx.orgId },
    });
    if (!workflow) throw new ActionError("Workflow not found.", "NOT_FOUND");
    await prisma.workflow.delete({ where: { id: workflowId } });
    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "workflow.deleted",
      entityType: "workflow",
      entityId: workflowId,
    });
    return { id: workflowId };
  });
}
