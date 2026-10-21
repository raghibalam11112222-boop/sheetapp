import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { validateRecordData } from "@/lib/validation/records";

/**
 * Lightweight rule engine (app.txt §21): when a record field matches a value,
 * run a simple action. Runs synchronously after record updates.
 */
export async function runWorkflowsAfterUpdate(opts: {
  orgId: string;
  applicationId: string;
  tableId: string;
  recordId: string;
  previous: Record<string, unknown>;
  next: Record<string, unknown>;
}): Promise<void> {
  const { orgId, applicationId, tableId, recordId, previous, next } = opts;

  const workflows = await prisma.workflow.findMany({
    where: { applicationId, organizationId: orgId, enabled: true, triggerTableId: tableId },
  });
  if (!workflows.length) return;

  for (const workflow of workflows) {
    try {
      const prevValue = String(previous[workflow.triggerFieldId] ?? "");
      const nextValue = String(next[workflow.triggerFieldId] ?? "");
      const triggered =
        prevValue.toLowerCase() !== nextValue.toLowerCase() &&
        nextValue.toLowerCase() === workflow.triggerValue.toLowerCase();

      if (!triggered) continue;

      let detail: Record<string, unknown> = {};

      if (workflow.action === "SET_FIELD" && workflow.actionFieldId) {
        await prisma.record.update({
          where: { id: recordId },
          data: {
            data: { ...next, [workflow.actionFieldId]: workflow.actionValue } as Prisma.InputJsonValue,
          },
        });
        detail = { field: workflow.actionFieldId, value: workflow.actionValue };
      } else if (workflow.action === "NOTIFY") {
        await prisma.notification.create({
          data: {
            organizationId: orgId,
            title: workflow.name,
            body: workflow.actionValue ?? `${workflow.triggerFieldId} is now ${workflow.triggerValue}`,
          },
        });
        detail = { notified: true };
      } else if (workflow.action === "CREATE_RECORD" && workflow.actionTableId && workflow.actionFieldId) {
        const target = await prisma.generatedTable.findFirst({
          where: { id: workflow.actionTableId, organizationId: orgId, applicationId },
          include: { fields: { orderBy: { position: "asc" } } },
        });
        if (!target) throw new Error("Workflow target table no longer exists.");
        const { data, errors } = validateRecordData(
          target.fields,
          { [workflow.actionFieldId]: workflow.actionValue ?? "" },
          { partial: true }
        );
        if (Object.keys(errors).length) {
          throw new Error(Object.values(errors)[0] ?? "Invalid workflow record data.");
        }
        const created = await prisma.record.create({
          data: {
            organizationId: orgId,
            applicationId,
            tableId: target.id,
            data: data as Prisma.InputJsonValue,
            createdById: null,
          },
        });
        detail = { createdRecordId: created.id, table: target.label };
      }

      await prisma.workflowRun.create({
        data: {
          organizationId: orgId,
          workflowId: workflow.id,
          recordId,
          status: "SUCCESS",
          detail: detail as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      console.error("[SheetApp] workflow failed:", workflow.id, err);
      try {
        await prisma.workflowRun.create({
          data: {
            organizationId: orgId,
            workflowId: workflow.id,
            recordId,
            status: "FAILED",
            detail: { error: err instanceof Error ? err.message : "unknown" },
          },
        });
      } catch {
        // never break the record update because of a workflow log
      }
    }
  }
}
