"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Zap } from "lucide-react";
import {
  deleteWorkflowAction,
  saveWorkflowAction,
  toggleWorkflowAction,
} from "@/actions/workflows";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface WorkflowsState {
  canManage: boolean;
  apps: {
    id: string;
    name: string;
    tables: {
      id: string;
      label: string;
      fields: { name: string; label: string; options: string[] }[];
    }[];
  }[];
  workflows: {
    id: string;
    name: string;
    enabled: boolean;
    action: "SET_FIELD" | "NOTIFY" | "CREATE_RECORD";
    triggerTableId: string;
    triggerFieldId: string;
    triggerValue: string;
    actionTableId: string | null;
    actionFieldId: string | null;
    actionValue: string | null;
    runCount: number;
  }[];
}

export function WorkflowView({ state }: { state: WorkflowsState }) {
  const router = useRouter();
  const allTables = state.apps.flatMap((app) => app.tables);
  const [appId] = useState(state.apps[0]?.id ?? "");
  const [name, setName] = useState("");
  const [tableId, setTableId] = useState(allTables[0]?.id ?? "");
  const [fieldId, setFieldId] = useState("");
  const [triggerValue, setTriggerValue] = useState("");
  const [action, setAction] = useState<"SET_FIELD" | "NOTIFY" | "CREATE_RECORD">("SET_FIELD");
  const [actionTableId, setActionTableId] = useState("");
  const [actionFieldId, setActionFieldId] = useState("");
  const [actionValue, setActionValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowsState["workflows"][number] | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const tables = state.apps.find((app) => app.id === appId)?.tables ?? allTables;
  const fields = tables.find((t) => t.id === tableId)?.fields ?? [];
  const targetTableId = actionTableId || tables.find((t) => t.id !== tableId)?.id || tables[0]?.id || "";
  const targetFields = tables.find((t) => t.id === targetTableId)?.fields ?? [];
  const targetTableLabel = tables.find((t) => t.id === targetTableId)?.label ?? "table";

  function describeAction(wf: WorkflowsState["workflows"][number]): string {
    if (wf.action === "SET_FIELD") return `set ${wf.actionFieldId} to “${wf.actionValue}”`;
    if (wf.action === "CREATE_RECORD") {
      const target = allTables.find((t) => t.id === wf.actionTableId)?.label ?? "a table";
      return `create ${target} with ${wf.actionFieldId} = “${wf.actionValue}”`;
    }
    return `notify “${wf.actionValue ?? "team"}”`;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const resolvedTargetTable = action === "CREATE_RECORD" ? targetTableId : null;
    const resolvedTargetField =
      action === "CREATE_RECORD"
        ? actionFieldId || targetFields[0]?.name || ""
        : action === "SET_FIELD"
          ? actionFieldId || fields[0]?.name || ""
          : null;
    const result = await saveWorkflowAction({
      applicationId: appId,
      name: name || "New rule",
      enabled: true,
      triggerTableId: tableId,
      triggerFieldId: fieldId || fields[0]?.name || "",
      triggerValue,
      action,
      actionTableId: resolvedTargetTable,
      actionFieldId: resolvedTargetField,
      actionValue,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Workflow created");
    setName("");
    setTriggerValue("");
    setActionValue("");
    router.refresh();
  }

  async function onToggle(workflowId: string, enabled: boolean) {
    const result = await toggleWorkflowAction(workflowId, enabled);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const result = await deleteWorkflowAction(deleteTarget.id);
    setDeleteLoading(false);
    setDeleteTarget(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Workflow deleted");
    router.refresh();
  }

  const tableLabel = tables.find((t) => t.id === tableId)?.label ?? "table";

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {state.workflows.length === 0 && (
          <EmptyState
            title="No workflows yet"
            description="Create your first rule to update fields, create records, or notify the team when data changes."
          />
        )}
        {state.workflows.map((wf) => (
          <Card key={wf.id}>
            <CardContent className="flex flex-wrap items-center gap-3 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F8F9FA] text-[#6B7280]">
                <Zap className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[#111111]">{wf.name}</span>
                <span className="block text-xs text-[#6B7280]">
                  When {wf.triggerFieldId} = “{wf.triggerValue}” → {describeAction(wf)}
                  <span className="ml-1">· {wf.runCount} runs</span>
                </span>
              </span>
              <Badge variant={wf.enabled ? "success" : "neutral"}>
                {wf.enabled ? "Enabled" : "Paused"}
              </Badge>
              {state.canManage && (
                <>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#6B7280]">
                    <Checkbox
                      checked={wf.enabled}
                      onChange={(e) => onToggle(wf.id, e.target.checked)}
                    />
                    On
                  </label>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(wf)}
                    className="rounded p-1 text-[#6B7280] hover:text-[#DC2626]"
                    aria-label={`Delete ${wf.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Plus className="h-4 w-4" /> New rule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!state.canManage ? (
            <p className="text-sm text-[#6B7280]">
              Only admins can manage workflows.
            </p>
          ) : (
            <form onSubmit={onSave} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="wf-name">Rule name</Label>
                <Input
                  id="wf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mark paid orders"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wf-table">Table</Label>
                <select
                  id="wf-table"
                  value={tableId}
                  onChange={(e) => {
                    setTableId(e.target.value);
                    setFieldId("");
                    setActionFieldId("");
                  }}
                  className="flex h-9 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm"
                >
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wf-field">When field</Label>
                <select
                  id="wf-field"
                  value={fieldId || fields[0]?.name || ""}
                  onChange={(e) => setFieldId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm"
                >
                  {fields.map((field) => (
                    <option key={field.name} value={field.name}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wf-trigger">becomes</Label>
                <Input
                  id="wf-trigger"
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  placeholder="e.g. Paid"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Action</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["SET_FIELD", "Update a field"],
                      ["CREATE_RECORD", "Create a record"],
                      ["NOTIFY", "Notify team"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAction(id)}
                      className={
                        action === id
                          ? "rounded-md border border-[#111111] bg-[#F8F9FA] px-2 py-2 text-xs font-medium text-[#111111]"
                          : "rounded-md border border-[#E5E7EB] px-2 py-2 text-xs text-[#6B7280]"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {action === "CREATE_RECORD" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="wf-action-table">In table</Label>
                    <select
                      id="wf-action-table"
                      value={targetTableId}
                      onChange={(e) => {
                        setActionTableId(e.target.value);
                        setActionFieldId("");
                      }}
                      className="flex h-9 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm"
                    >
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wf-action-field">
                      Set {targetTableLabel} field
                    </Label>
                    <select
                      id="wf-action-field"
                      value={actionFieldId || targetFields[0]?.name || ""}
                      onChange={(e) => setActionFieldId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm"
                    >
                      {targetFields.map((field) => (
                        <option key={field.name} value={field.name}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {action === "SET_FIELD" && (
                <div className="space-y-1.5">
                  <Label htmlFor="wf-action-field">Set field</Label>
                  <select
                    id="wf-action-field"
                    value={actionFieldId || fields[0]?.name || ""}
                    onChange={(e) => setActionFieldId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm"
                  >
                    {fields.map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="wf-action-value">
                  {action === "NOTIFY" ? "Notification text" : "To value"}
                </Label>
                <Input
                  id="wf-action-value"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  placeholder={action === "NOTIFY" ? "Order is now paid" : "e.g. Complete"}
                  required={action !== "NOTIFY"}
                />
              </div>

              <Button type="submit" className="w-full" loading={saving}>
                Create rule
              </Button>
              <p className="text-xs text-[#6B7280]">
                Runs on the {tableLabel} table when you edit a record.
              </p>
            </form>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete workflow?"
        description="The rule and its run history will be removed."
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={onDelete}
      />
    </div>
  );
}
