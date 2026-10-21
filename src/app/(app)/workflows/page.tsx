import { requireOrg, can } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { WorkflowView, type WorkflowsState } from "./workflows-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Workflows",
  description: "Automate field updates, notifications, and record creation.",
};

export default async function WorkflowsPage() {
  const ctx = await requireOrg();
  const canManage = can(ctx.role, "workflow:manage");

  const [applications, workflows] = await Promise.all([
    prisma.application.findMany({
      where: { organizationId: ctx.orgId },
      include: {
        tables: {
          orderBy: { position: "asc" },
          include: { fields: { orderBy: { position: "asc" }, select: { name: true, label: true, options: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.workflow.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { runs: true } } },
    }),
  ]);

  const state: WorkflowsState = {
    canManage,
    apps: applications.map((app) => ({
      id: app.id,
      name: app.name,
      tables: app.tables.map((table) => ({
        id: table.id,
        label: table.label,
        fields: table.fields.map((f) => ({ name: f.name, label: f.label, options: f.options })),
      })),
    })),
    workflows: workflows.map((wf) => ({
      id: wf.id,
      name: wf.name,
      enabled: wf.enabled,
      action: wf.action,
      triggerTableId: wf.triggerTableId,
      triggerFieldId: wf.triggerFieldId,
      triggerValue: wf.triggerValue,
      actionTableId: wf.actionTableId,
      actionFieldId: wf.actionFieldId,
      actionValue: wf.actionValue,
      runCount: wf._count.runs,
    })),
  };

  return (
    <div className="space-y-5">
      <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#111111]">Workflows</h1>
        <p className="text-sm text-[#6B7280]">
          Simple rules: when a field changes to a value, update a field, create a record, or notify the team.
        </p>
      </div>
      <WorkflowView state={state} />
    </div>
  );
}
