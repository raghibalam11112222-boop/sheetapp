"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings2, Trash2 } from "lucide-react";
import {
  addTableFieldAction,
  addTableRelationshipAction,
  removeTableFieldAction,
  removeTableRelationshipAction,
  updateTableFieldAction,
} from "@/actions/settings";
import { FIELD_TYPES, type SchemaFieldType } from "@/lib/ai/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface ManageableField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  unique: boolean;
  isTitle: boolean;
}

export interface ManageableRelationship {
  id: string;
  direction: "outgoing" | "incoming";
  fieldLabel: string;
  otherTableLabel: string;
}

const EDITABLE_TYPES = FIELD_TYPES.filter((t) => t !== "RELATION");

export function ManageFields({
  tableId,
  tableLabel,
  fields,
  siblings,
  relationships,
}: {
  tableId: string;
  tableLabel: string;
  fields: ManageableField[];
  siblings: { id: string; label: string; fields: { id: string; name: string; label: string }[] }[];
  relationships: ManageableRelationship[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<SchemaFieldType>("TEXT");
  const [relField, setRelField] = useState("");
  const [relTable, setRelTable] = useState("");

  async function mutate(
    action: Promise<{ ok: boolean; error?: string }>,
    done: string
  ) {
    const result = await action;
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(done);
    router.refresh();
  }

  const saveLabel = (field: ManageableField) => {
    const label = (labels[field.id] ?? field.label).trim();
    if (!label || label === field.label) return;
    void mutate(updateTableFieldAction(tableId, field.id, { label }), "Field renamed");
  };

  const addField = () => {
    if (!newLabel.trim()) {
      toast.error("Give the new field a name first.");
      return;
    }
    void mutate(
      addTableFieldAction(tableId, { label: newLabel.trim(), type: newType }).then((r) => {
        if (r.ok) {
          setNewLabel("");
          setNewType("TEXT");
        }
        return r;
      }),
      "Field added"
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Settings2 className="h-3.5 w-3.5" /> Table settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tableLabel} — fields & relationships</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {fields.map((field) => (
            <div
              key={field.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2"
            >
              <Input
                value={labels[field.id] ?? field.label}
                onChange={(e) =>
                  setLabels((prev) => ({ ...prev, [field.id]: e.target.value }))
                }
                onBlur={() => saveLabel(field)}
                className="h-8 min-w-32 flex-1 text-sm"
                maxLength={80}
                aria-label={`Rename ${field.label} field`}
              />
              <select
                value={field.type}
                onChange={(e) =>
                  mutate(
                    updateTableFieldAction(tableId, field.id, {
                      type: e.target.value,
                    }),
                    "Field type updated"
                  )
                }
                className="h-8 rounded-md border border-[#E5E7EB] bg-white px-2 text-sm"
                aria-label="Field type"
              >
                {EDITABLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                {field.type === "RELATION" && <option value="RELATION">RELATION</option>}
              </select>
              <label className="flex items-center gap-1 text-xs text-[#6B7280]">
                <Checkbox
                  checked={field.required}
                  onChange={(e) =>
                    mutate(
                      updateTableFieldAction(tableId, field.id, { required: e.target.checked }),
                      "Field updated"
                    )
                  }
                />
                Required
              </label>
              <label className="flex items-center gap-1 text-xs text-[#6B7280]">
                <Checkbox
                  checked={field.unique}
                  onChange={(e) =>
                    mutate(
                      updateTableFieldAction(tableId, field.id, { unique: e.target.checked }),
                      "Field updated"
                    )
                  }
                />
                Unique
              </label>
              {field.isTitle ? (
                <Badge variant="neutral">Title</Badge>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    mutate(
                      updateTableFieldAction(tableId, field.id, { isTitle: true }),
                      "Title field updated"
                    )
                  }
                  className="text-xs font-medium text-[#6B7280] hover:text-[#111111]"
                >
                  Make title
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  mutate(removeTableFieldAction(tableId, field.id), "Field removed")
                }
                className="rounded p-1 text-[#6B7280] hover:text-[#DC2626]"
                aria-label={`Remove ${field.label}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="New field name"
              className="h-8 text-sm"
              maxLength={80}
              aria-label="New field name"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as SchemaFieldType)}
              className="h-8 rounded-md border border-[#E5E7EB] bg-white px-2 text-sm sm:w-40"
              aria-label="New field type"
            >
              {EDITABLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={addField}>
              Add field
            </Button>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <h3 className="text-sm font-medium text-[#111111]">Relationships</h3>
          {relationships.length === 0 && (
            <p className="text-sm text-[#6B7280]">No relationships for this table yet.</p>
          )}
          {relationships.map((rel) => (
            <div
              key={rel.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
            >
              <span className="text-[#111111]">
                {rel.direction === "outgoing" ? (
                  <>
                    <span className="font-medium">{rel.fieldLabel}</span>
                    <span className="text-[#6B7280]"> → {rel.otherTableLabel}</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{rel.otherTableLabel}</span>
                    <span className="text-[#6B7280]"> → {rel.fieldLabel}</span>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => mutate(removeTableRelationshipAction(rel.id), "Relationship removed")}
                className="rounded p-1 text-[#6B7280] hover:text-[#DC2626]"
                aria-label="Remove relationship"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {siblings.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg bg-[#F8F9FA] p-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <Label>Field</Label>
                <select
                  value={relField}
                  onChange={(e) => setRelField(e.target.value)}
                  className="h-8 w-full rounded-md border border-[#E5E7EB] bg-white px-2 text-sm"
                  aria-label="Relationship source field"
                >
                  <option value="">Select…</option>
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 space-y-1">
                <Label>Links to</Label>
                <select
                  value={relTable}
                  onChange={(e) => setRelTable(e.target.value)}
                  className="h-8 w-full rounded-md border border-[#E5E7EB] bg-white px-2 text-sm"
                  aria-label="Relationship target table"
                >
                  <option value="">Select…</option>
                  {siblings.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!relField || !relTable) {
                    toast.error("Pick a field and a target table.");
                    return;
                  }
                  void mutate(
                    addTableRelationshipAction({
                      fromTableId: tableId,
                      fromFieldId: relField,
                      toTableId: relTable,
                    }).then((r) => {
                      if (r.ok) {
                        setRelField("");
                        setRelTable("");
                      }
                      return r;
                    }),
                    "Relationship added"
                  );
                }}
              >
                Add
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
