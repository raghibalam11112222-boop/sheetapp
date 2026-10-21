"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  Table2,
  Trash2,
} from "lucide-react";
import type { SchemaReviewState } from "@/actions/schema";
import {
  abandonGenerationAction,
  buildTablesAction,
  finalizeGenerationAction,
  importRecordsAction,
  prepareDashboardAction,
  regenerateSchemaAction,
  startGenerationAction,
  verifyAnalysisAction,
  verifyStructureAction,
} from "@/actions/schema";
import type { SchemaSuggestion } from "@/lib/ai/types";
import { FIELD_TYPES, type SchemaFieldType } from "@/lib/ai/types";
import type { ImportMode } from "@/lib/generation/import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/components/ui/utils";
import { EntitiesCard } from "./entities-card";
import { RelationshipsCard } from "./relationships-card";

const TYPE_LABELS: Record<string, string> = {
  TEXT: "Text",
  LONG_TEXT: "Long text",
  NUMBER: "Number",
  CURRENCY: "Currency",
  PERCENT: "Percent",
  DATE: "Date",
  DATETIME: "Date & time",
  BOOLEAN: "Yes / no",
  ENUM: "Option list",
  EMAIL: "Email",
  PHONE: "Phone",
  URL: "URL",
  RELATION: "Relation",
  IDENTIFIER: "ID / code",
};

const MODES: { id: ImportMode; label: string; description: string }[] = [
  { id: "fix", label: "Fix issues", description: "Coerce dates/numbers, null out invalid cells" },
  { id: "skip", label: "Skip bad rows", description: "Only import rows that pass validation" },
  { id: "raw", label: "Import as-is", description: "Keep every cell as original text" },
];

const SEVERITY_ICON = {
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
} as const;

type StageStatus = "pending" | "active" | "done" | "error";

const GENERATION_STAGES = [
  "Analyzing data",
  "Building database",
  "Creating tables",
  "Generating forms",
  "Creating dashboard",
  "Importing records",
  "Finalizing app",
] as const;

export function SchemaReview({ state }: { state: SchemaReviewState }) {
  const router = useRouter();
  const analysis = state.analysis;
  const [appName, setAppName] = useState(state.suggestion.name);
  const [suggestion, setSuggestion] = useState<SchemaSuggestion>(state.suggestion);
  const [provider, setProvider] = useState(state.provider);
  const [mode, setMode] = useState<ImportMode>("fix");
  const [dedupe, setDedupe] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<{ imported: number; skipped: number } | null>(null);
  const [stageStatuses, setStageStatuses] = useState<StageStatus[]>(
    GENERATION_STAGES.map(() => "pending" as StageStatus)
  );
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [fieldDrafts, setFieldDrafts] = useState<Record<number, { label: string; type: SchemaFieldType }>>({});

  const findings = useMemo(
    () =>
      [...analysis.health].sort((a, b) => {
        const rank = { error: 0, warning: 1, info: 2 } as const;
        return rank[a.severity] - rank[b.severity];
      }),
    [analysis.health]
  );

  const issueSummary = useMemo(() => {    const list: { label: string; count: number }[] = [];
    const allColumns = analysis.sheets.flatMap((s) => s.columns);

    if (analysis.duplicates.length > 0) {
      const keyColumns = [...new Set(analysis.duplicates.map((d) => d.keyColumn.toLowerCase()))];
      list.push({
        label: `duplicate rows in ${keyColumns.slice(0, 2).join(" / ") || "name columns"}`,
        count: analysis.duplicates.length,
      });
    }
    const missingEmails = allColumns
      .filter((c) => c.type === "email")
      .reduce((sum, c) => sum + c.empty, 0);
    if (missingEmails > 0) list.push({ label: "missing emails", count: missingEmails });

    const invalidEmails = allColumns.reduce((sum, c) => sum + (c.invalidEmailCount ?? 0), 0);
    if (invalidEmails > 0) list.push({ label: "invalid emails", count: invalidEmails });

    const missingDates = allColumns
      .filter((c) => c.type === "date" || c.type === "datetime")
      .reduce((sum, c) => sum + c.empty, 0);
    if (missingDates > 0) list.push({ label: "missing or invalid dates", count: missingDates });

    const invalidDates = allColumns.reduce((sum, c) => sum + (c.invalidDateCount ?? 0), 0);
    if (invalidDates > 0) list.push({ label: "invalid dates", count: invalidDates });

    const otherEmpty = allColumns
      .filter((c) => !["email", "date", "datetime"].includes(c.type))
      .reduce((sum, c) => sum + c.empty, 0);
    if (otherEmpty > 0) list.push({ label: "empty cells", count: otherEmpty });

    const broken = analysis.sheets.flatMap((s) => s.formulas).filter((f) => f.error).length;
    if (broken > 0) list.push({ label: "broken formula cells", count: broken });

    return {
      list,
      total: list.reduce((sum, item) => sum + item.count, 0),
    };
  }, [analysis]);

  function updateField(tableIdx: number, fieldIdx: number, patch: Partial<SchemaSuggestion["tables"][number]["fields"][number]>) {
    setSuggestion((prev) => ({
      ...prev,
      tables: prev.tables.map((t, ti) =>
        ti !== tableIdx
          ? t
          : { ...t, fields: t.fields.map((f, fi) => (fi === fieldIdx ? { ...f, ...patch } : f)) }
      ),
    }));
  }
  function removeField(tableIdx: number, fieldIdx: number) {
    setSuggestion((prev) => ({
      ...prev,
      tables: prev.tables.map((t, ti) =>
        ti !== tableIdx ? t : { ...t, fields: t.fields.filter((_, fi) => fi !== fieldIdx) }
      ),
    }));
  }

  function updateTable(tableIdx: number, label: string) {
    const clean = label.slice(0, 60);
    setSuggestion((prev) => ({
      ...prev,
      tables: prev.tables.map((t, ti) =>
        ti !== tableIdx
          ? t
          : {
              ...t,
              label: clean,
              singularLabel:
                clean.length > 2 && /s$/i.test(clean) ? clean.slice(0, -1) : clean,
            }
      ),
    }));
  }

  function removeTable(tableIdx: number) {
    setSuggestion((prev) => {
      if (prev.tables.length <= 1) {
        toast.error("Keep at least one table.");
        return prev;
      }
      const tables = prev.tables.filter((_, ti) => ti !== tableIdx);
      const keys = new Set(tables.map((t) => t.key));
      return {
        ...prev,
        tables,
        relationships: prev.relationships.filter(
          (r) => keys.has(r.fromTableKey) && keys.has(r.toTableKey)
        ),
      };
    });
  }

  function addField(tableIdx: number) {
    const draft = fieldDrafts[tableIdx] ?? { label: "", type: "TEXT" as SchemaFieldType };
    const label = draft.label.trim().slice(0, 80);
    if (!label) {
      toast.error("Give the new field a name first.");
      return;
    }
    setSuggestion((prev) => {
      const table = prev.tables[tableIdx];
      if (!table) return prev;
      const taken = new Set(table.fields.map((f) => f.key));
      const base =
        label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .replace(/^(\d)/, "_$1") || "field";
      let key = base;
      let i = 2;
      while (taken.has(key)) key = `${base}_${i++}`;
      return {
        ...prev,
        tables: prev.tables.map((t, ti) =>
          ti !== tableIdx
            ? t
            : {
                ...t,
                fields: [
                  ...t.fields,
                  {
                    key,
                    label,
                    type: draft.type,
                    required: false,
                    unique: false,
                    isTitle: false,
                    // No source column: the importer leaves it empty, users fill it in forms.
                    sourceColumnIndex: 0,
                  },
                ],
              }
        ),
      };
    });
    setFieldDrafts((prev) => ({ ...prev, [tableIdx]: { label: "", type: "TEXT" as SchemaFieldType } }));
  }

  async function regenerate() {
    setRegenerating(true);
    const result = await regenerateSchemaAction(state.dataSourceId, state.analysis.fileName);
    setRegenerating(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSuggestion(result.data.suggestion);
    setProvider(result.data.provider);
    toast.success("Suggestions regenerated");
  }

  async function callStage<T>(
    promise: Promise<{ ok: true; data: T } | { ok: false; error: string }>
  ): Promise<T> {
    const result = await promise;
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  async function createApp() {
    if (suggestion.tables.length === 0) {
      toast.error("Keep at least one table to generate your app.");
      return;
    }
    for (const table of suggestion.tables) {
      if (!table.label.trim()) {
        toast.error("Every table needs a name.");
        return;
      }
      if (!table.fields.length) {
        toast.error(`Table "${table.label}" needs at least one field.`);
        return;
      }
    }
    const base = {
      dataSourceId: state.dataSourceId,
      suggestion: { ...suggestion, name: appName },
      appName,
      mode,
      dedupe,
    };
    const mark = (index: number, status: StageStatus) =>
      setStageStatuses((prev) => prev.map((v, i) => (i === index ? status : v)));

    setProgressOpen(true);
    setGenerationError(null);
    setImportSummary(null);
    setStageStatuses(GENERATION_STAGES.map(() => "pending" as StageStatus));
    setCreating(true);
    let applicationId: string | null = null;
    try {
      mark(0, "active");
      await callStage(verifyAnalysisAction(state.dataSourceId));
      mark(0, "done");

      mark(1, "active");
      const started = await callStage(startGenerationAction(base));
      applicationId = started.applicationId;
      mark(1, "done");

      mark(2, "active");
      await callStage(buildTablesAction({ ...base, applicationId }));
      mark(2, "done");

      mark(3, "active");
      await callStage(verifyStructureAction(applicationId));
      mark(3, "done");

      mark(4, "active");
      await callStage(prepareDashboardAction(applicationId));
      mark(4, "done");

      mark(5, "active");
      const report = await callStage(importRecordsAction({ ...base, applicationId }));
      setImportSummary({ imported: report.imported, skipped: report.skipped });
      mark(5, "done");

      mark(6, "active");
      await callStage(
        finalizeGenerationAction({ applicationId, dataSourceId: state.dataSourceId, report })
      );
      mark(6, "done");

      toast.success("Your app is ready");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 900);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed. Please try again.";
      if (applicationId) {
        await abandonGenerationAction(applicationId).catch(() => undefined);
      }
      setStageStatuses((prev) => prev.map((v) => (v === "active" ? "error" : v)));
      setGenerationError(message);
      setCreating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => router.push("/onboarding/upload")}
            className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#111111]"
          >
            <ArrowLeft className="h-3 w-3" /> Upload a different file
          </button>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#111111]">
            We understood your spreadsheet.
          </h1>
          <p className="text-sm text-[#6B7280]">
            {state.fileName} · {analysis.totalRows.toLocaleString()} rows ·{" "}
            {analysis.sheets.length} sheet{analysis.sheets.length === 1 ? "" : "s"} ·{" "}
            {analysis.totalColumns} columns
          </p>
        </div>
        <Badge variant={provider === "deterministic" ? "neutral" : "default"}>
          {provider === "deterministic" ? "Rules-based suggestions" : "AI-assisted suggestions"}
        </Badge>
      </div>

      <EntitiesCard
        tables={suggestion.tables.map((t) => ({
          key: t.key,
          label: t.label,
          fieldCount: t.fields.length,
          recordCount: t.recordCount,
        }))}
        relationships={suggestion.relationships}
      />
      <RelationshipsCard
        tables={suggestion.tables.map((t) => ({
          key: t.key,
          label: t.label,
          fields: t.fields.map((f) => ({
            key: f.key,
            label: f.label,
            type: f.type,
            unique: f.unique,
            isTitle: f.isTitle,
          })),
        }))}
        relationships={suggestion.relationships}
        onAdd={(rel) =>
          setSuggestion((prev) => ({
            ...prev,
            relationships: [...prev.relationships, { ...rel, confidence: 1 }],
          }))
        }
        onRemove={(index) =>
          setSuggestion((prev) => ({
            ...prev,
            relationships: prev.relationships.filter((_, i) => i !== index),
          }))
        }
      />
      {issueSummary.total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium">
                We found {issueSummary.total.toLocaleString()} issue
                {issueSummary.total === 1 ? "" : "s"}
              </CardTitle>
              <Badge variant="warning">Handled by import options below</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {issueSummary.list.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
                >
                  <span className="text-[#6B7280] capitalize">{item.label}</span>
                  <span className="font-semibold text-[#111111]">{item.count}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[#6B7280]">
              Choose <span className="font-medium text-[#111111]">Fix issues</span> to repair
              what we can, <span className="font-medium text-[#111111]">Skip bad rows</span> to
              leave them out, or <span className="font-medium text-[#111111]">Import as-is</span>{" "}
              to keep everything.
            </p>
          </CardContent>
        </Card>
      )}

      {findings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Spreadsheet Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {findings.slice(0, 6).map((finding, i) => {
              const Icon = SEVERITY_ICON[finding.severity];
              const rows = (finding.rows ?? []).slice(0, 15);
              const hiddenRows = (finding.rows ?? []).length - rows.length;
              const expandable =
                (finding.columns ?? []).length > 0 || (finding.rows ?? []).length > 0;
              return (
                <details key={i} className="group rounded-lg border border-[#F0F1F3] px-2 py-1.5 text-sm">
                  <summary className="flex cursor-pointer items-start gap-2 list-none [&::-webkit-details-marker]:hidden">
                    <Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        finding.severity === "error"
                          ? "text-[#DC2626]"
                          : finding.severity === "warning"
                            ? "text-[#D97706]"
                            : "text-[#6B7280]"
                      )}
                    />
                    <span className="flex-1 text-[#111111]">
                      {finding.message}
                      <span className="text-[#6B7280]"> · {finding.sheet}</span>
                    </span>
                    {expandable && (
                      <span className="shrink-0 text-xs text-[#6B7280] group-open:hidden">
                        Details
                      </span>
                    )}
                  </summary>
                  {expandable && (
                    <div className="mt-2 space-y-1.5 pl-6 text-xs">
                      {(finding.columns ?? []).length > 0 && (
                        <p className="text-[#6B7280]">
                          Columns:{" "}
                          <span className="font-medium text-[#111111]">
                            {(finding.columns ?? []).slice(0, 10).join(", ")}
                          </span>
                          {(finding.columns ?? []).length > 10 &&
                            ` +${(finding.columns ?? []).length - 10} more`}
                        </p>
                      )}
                      {rows.length > 0 && (
                        <p className="text-[#6B7280]">
                          Rows:{" "}
                          <span className="font-medium text-[#111111]">
                            {rows.join(", ")}
                          </span>
                          {hiddenRows > 0 && ` +${hiddenRows} more`}
                        </p>
                      )}
                    </div>
                  )}
                </details>
              );
            })}
            {analysis.duplicates.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
                <span className="text-[#111111]">
                  {analysis.duplicates.length} potential duplicate group
                  {analysis.duplicates.length === 1 ? "" : "s"} found
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Application</CardTitle>
            <Button variant="ghost" size="sm" onClick={regenerate} loading={regenerating}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Regenerate
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="app-name">App name</Label>
          <Input id="app-name" value={appName} onChange={(e) => setAppName(e.target.value)} maxLength={60} />
          {suggestion.rationale && (
            <p className="text-xs text-[#6B7280]">{suggestion.rationale}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {suggestion.tables.map((table, tableIdx) => (
          <Card key={table.key}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Table2 className="h-4 w-4 shrink-0 text-[#6B7280]" />
                  <Input
                    value={table.label}
                    onChange={(e) => updateTable(tableIdx, e.target.value)}
                    className="h-8 max-w-56 text-sm font-medium"
                    maxLength={60}
                    aria-label="Table name"
                  />
                  <Badge variant="neutral">{table.recordCount.toLocaleString()} rows</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6B7280]">{table.sourceSheet}</span>
                  <button
                    type="button"
                    onClick={() => removeTable(tableIdx)}
                    disabled={suggestion.tables.length <= 1}
                    className="rounded p-1 text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#DC2626] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Remove ${table.label} table`}
                    title={suggestion.tables.length <= 1 ? "Keep at least one table" : "Remove table"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {table.description && (
                <p className="text-xs text-[#6B7280]">{table.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                      <tr className="border-b border-[#E5E7EB] text-left text-xs text-[#6B7280]">
                        <th className="py-2 pr-3 font-medium">Field</th>
                        <th className="py-2 pr-3 font-medium">Type</th>
                        <th className="py-2 pr-3 font-medium">Required</th>
                        <th className="py-2 pr-3 font-medium">Unique</th>
                        <th className="py-2 font-medium" />
                      </tr>
                  </thead>
                  <tbody>
                    {table.fields.map((field, fieldIdx) => (
                      <tr key={field.key} className="border-b border-[#F0F1F3] last:border-0">
                        <td className="py-2 pr-3">
                          <Input
                            value={field.label}
                            onChange={(e) =>
                              updateField(tableIdx, fieldIdx, { label: e.target.value })
                            }
                            className="h-8 text-sm"
                            maxLength={80}
                          />
                          <span className="mt-0.5 block text-[11px] text-[#6B7280]">
                            {field.key}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateField(tableIdx, fieldIdx, {
                                type: e.target.value as SchemaFieldType,
                              })
                            }
                            className="h-8 w-full rounded-md border border-[#E5E7EB] bg-white px-2 text-sm text-[#111111] focus:border-[#111111] focus:outline-none"
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {TYPE_LABELS[t] ?? t}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-3">
                          <Checkbox
                            checked={field.required}
                            onChange={(e) =>
                              updateField(tableIdx, fieldIdx, { required: e.target.checked })
                            }
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Checkbox
                            checked={field.unique}
                            onChange={(e) =>
                              updateField(tableIdx, fieldIdx, { unique: e.target.checked })
                            }
                          />
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {field.isTitle && <Badge variant="neutral">Title</Badge>}
                            <button
                              type="button"
                              onClick={() => removeField(tableIdx, fieldIdx)}
                              className="rounded p-1 text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#DC2626]"
                              aria-label={`Remove ${field.label}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {table.fields.length === 0 && (
                  <EmptyState
                    title="No fields"
                    description="Add a field below — every table needs at least one."
                  />
                )}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={fieldDrafts[tableIdx]?.label ?? ""}
                    onChange={(e) =>
                      setFieldDrafts((prev) => ({
                        ...prev,
                        [tableIdx]: {
                          label: e.target.value,
                          type: prev[tableIdx]?.type ?? "TEXT",
                        },
                      }))
                    }
                    placeholder="New field name"
                    className="h-8 text-sm"
                    maxLength={80}
                    aria-label={`New field name for ${table.label}`}
                  />
                  <select
                    value={fieldDrafts[tableIdx]?.type ?? "TEXT"}
                    onChange={(e) =>
                      setFieldDrafts((prev) => ({
                        ...prev,
                        [tableIdx]: {
                          label: prev[tableIdx]?.label ?? "",
                          type: e.target.value as SchemaFieldType,
                        },
                      }))
                    }
                    className="h-8 rounded-md border border-[#E5E7EB] bg-white px-2 text-sm text-[#111111] focus:border-[#111111] focus:outline-none sm:w-40"
                    aria-label={`New field type for ${table.label}`}
                  >
                    {FIELD_TYPES.filter((t) => t !== "RELATION").map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t] ?? t}
                      </option>
                    ))}
                  </select>
                  <Button variant="secondary" size="sm" onClick={() => addField(tableIdx)}>
                    Add field
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Import options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={cn(
                  "rounded-lg border px-3 py-3 text-left transition-colors",
                  mode === m.id
                    ? "border-[#111111] bg-[#F8F9FA]"
                    : "border-[#E5E7EB] hover:border-gray-300"
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-[#111111]">
                  {mode === m.id && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {m.label}
                </span>
                <span className="mt-0.5 block text-xs text-[#6B7280]">{m.description}</span>
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#111111]">
            <Checkbox
              checked={dedupe}
              onChange={(e) => setDedupe(e.target.checked)}
            />
            Skip duplicate rows (recommended — {analysis.duplicates.length} group
            {analysis.duplicates.length === 1 ? "" : "s"} detected)
          </label>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" onClick={createApp} loading={creating} disabled={progressOpen && !generationError}>
          <ArrowRight className="h-4 w-4 mr-1.5" />
          Generate My App
        </Button>
      </div>

      {progressOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-lg">
            <h2 className="text-base font-semibold tracking-tight text-[#111111]">
              Generating your app
            </h2>
            <p className="mt-0.5 text-sm text-[#6B7280]">
              {generationError
                ? "Something went wrong."
                : `${stageStatuses.filter((s) => s === "done").length} of ${GENERATION_STAGES.length} stages complete`}
            </p>
            <ul className="mt-4 space-y-2.5">
              {GENERATION_STAGES.map((label, i) => {
                const status = stageStatuses[i];
                return (
                  <li key={label} className="flex items-center gap-2.5 text-sm">
                    {status === "done" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
                    ) : status === "active" ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#111111]" />
                    ) : status === "error" ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-[#DC2626]" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-[#E5E7EB]" />
                    )}
                    <span
                      className={cn(
                        status === "pending" ? "text-[#6B7280]" : "text-[#111111]",
                        status === "active" && "font-medium"
                      )}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ul>
            {importSummary && (
              <p className="mt-3 text-sm text-[#6B7280]">
                {importSummary.imported.toLocaleString()} imported
                {importSummary.skipped > 0 &&
                  ` · ${importSummary.skipped.toLocaleString()} skipped`}
              </p>
            )}
            {generationError && (
              <div className="mt-4">
                <p className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-sm text-[#DC2626]">
                  {generationError}
                </p>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setProgressOpen(false);
                      setGenerationError(null);
                    }}
                  >
                    Back to review
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
