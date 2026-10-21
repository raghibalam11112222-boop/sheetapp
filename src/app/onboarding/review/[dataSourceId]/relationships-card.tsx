"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface RelationshipField {
  key: string;
  label: string;
  type?: string;
  unique?: boolean;
  isTitle?: boolean;
}

export interface RelationshipTable {
  key: string;
  label: string;
  fields: RelationshipField[];
}

export interface ConfigurableRelationship {
  fromTableKey: string;
  fromFieldKey: string;
  toTableKey: string;
}

/** Target-side field for display: identifier → unique → title → first. */
function relationshipTarget(table: RelationshipTable): RelationshipField | undefined {
  return (
    table.fields.find((f) => f.type === "IDENTIFIER") ??
    table.fields.find((f) => f.unique) ??
    table.fields.find((f) => f.isTitle) ??
    table.fields[0]
  );
}

/**
 * Configurable relationship list for the schema review screen, extracted
 * from the review component.
 */
export function RelationshipsCard({
  tables,
  relationships,
  onAdd,
  onRemove,
}: {
  tables: RelationshipTable[];
  relationships: ConfigurableRelationship[];
  onAdd: (rel: ConfigurableRelationship) => void;
  onRemove: (index: number) => void;
}) {
  const [draft, setDraft] = useState({
    from: tables[0]?.key ?? "",
    field: tables[0]?.fields[0]?.key ?? "",
    to: tables[1]?.key ?? tables[0]?.key ?? "",
  });

  if (tables.length <= 1) return null;

  const add = () => {
    const fromTable = tables.find((t) => t.key === draft.from);
    const fromField = fromTable?.fields.find((f) => f.key === draft.field);
    const toTable = tables.find((t) => t.key === draft.to);
    if (!fromTable || !fromField || !toTable) {
      toast.error("Pick a field and a target table first.");
      return;
    }
    if (fromTable.key === toTable.key) {
      toast.error("Pick two different tables.");
      return;
    }
    const duplicate = relationships.some(
      (r) =>
        r.fromTableKey === fromTable.key &&
        r.fromFieldKey === fromField.key &&
        r.toTableKey === toTable.key
    );
    if (duplicate) {
      toast.error("That relationship already exists.");
      return;
    }
    onAdd({ fromTableKey: fromTable.key, fromFieldKey: fromField.key, toTableKey: toTable.key });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Relationships</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {relationships.length === 0 && (
          <p className="text-sm text-[#6B7280]">
            No relationships detected. Link a field to another table below.
          </p>
        )}
        {relationships.length > 0 && (
          <ul className="space-y-2">
            {relationships.map((rel, relIdx) => {
              const fromTable = tables.find((t) => t.key === rel.fromTableKey);
              const fromField = fromTable?.fields.find((f) => f.key === rel.fromFieldKey);
              const toTable = tables.find((t) => t.key === rel.toTableKey);
              const toField = toTable ? relationshipTarget(toTable) : undefined;
              return (
                <li
                  key={`${rel.fromTableKey}.${rel.fromFieldKey}.${rel.toTableKey}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-[#111111]">
                    <span className="font-medium">{fromTable?.label ?? rel.fromTableKey}</span>
                    <span className="text-[#6B7280]">.{fromField?.label ?? rel.fromFieldKey}</span>
                    <span className="mx-1.5 text-[#6B7280]">→</span>
                    <span className="font-medium">{toTable?.label ?? rel.toTableKey}</span>
                    {toField && (
                      <span className="text-[#6B7280]">.{toField.label}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(relIdx)}
                    className="shrink-0 rounded p-1 text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#DC2626]"
                    aria-label="Remove relationship"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-col gap-2 rounded-lg bg-[#F8F9FA] p-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label>Field</Label>
            <select
              value={draft.from}
              onChange={(e) => {
                const nextTable = tables.find((t) => t.key === e.target.value);
                setDraft((prev) => ({
                  ...prev,
                  from: e.target.value,
                  field: nextTable?.fields[0]?.key ?? "",
                }));
              }}
              className="h-8 w-full rounded-md border border-[#E5E7EB] bg-white px-2 text-sm text-[#111111] focus:border-[#111111] focus:outline-none"
              aria-label="Relationship source table"
            >
              {tables.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1">
            <Label>&nbsp;</Label>
            <select
              value={draft.field}
              onChange={(e) => setDraft((prev) => ({ ...prev, field: e.target.value }))}
              className="h-8 w-full rounded-md border border-[#E5E7EB] bg-white px-2 text-sm text-[#111111] focus:border-[#111111] focus:outline-none"
              aria-label="Relationship source field"
            >
              {(tables.find((t) => t.key === draft.from)?.fields ?? []).map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1">
            <Label>Links to</Label>
            <select
              value={draft.to}
              onChange={(e) => setDraft((prev) => ({ ...prev, to: e.target.value }))}
              className="h-8 w-full rounded-md border border-[#E5E7EB] bg-white px-2 text-sm text-[#111111] focus:border-[#111111] focus:outline-none"
              aria-label="Relationship target table"
            >
              {tables
                .filter((t) => t.key !== draft.from)
                .map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
            </select>
          </div>
          <Button variant="secondary" size="sm" onClick={add}>
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
