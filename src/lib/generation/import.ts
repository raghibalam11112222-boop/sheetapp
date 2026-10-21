import { prisma } from "@/lib/db";
import type { GeneratedField } from "@/generated/prisma/client";
import { EMAIL_RE } from "@/lib/validation/patterns";
import type {
  CellValue,
  ParsedWorkbook,
  SheetAnalysis,
} from "@/lib/spreadsheet/types";
import type { SpreadsheetAnalysis } from "@/lib/spreadsheet/types";

export type ImportMode = "fix" | "skip" | "raw";

export interface ImportIssue {
  code:
    | "invalid_date"
    | "invalid_email"
    | "invalid_number"
    | "invalid_enum"
    | "missing_required"
    | "duplicate_key"
    | "empty_row"
    | "skipped_row";
  sheet: string;
  column?: string;
  count: number;
  sampleRows: number[];
  message: string;
}

export interface ImportReport {
  mode: ImportMode;
  deduped: boolean;
  totalImported: number;
  totalSkipped: number;
  tables: { tableId: string; label: string; imported: number; skipped: number }[];
  issues: ImportIssue[];
}

function addIssue(
  issues: Map<string, ImportIssue>,
  issue: Omit<ImportIssue, "count" | "sampleRows"> & { row: number }
) {
  const key = `${issue.code}::${issue.sheet}::${issue.column ?? ""}`;
  const existing = issues.get(key);
  if (existing) {
    existing.count++;
    if (existing.sampleRows.length < 8 && !existing.sampleRows.includes(issue.row))
      existing.sampleRows.push(issue.row);
  } else {
    issues.set(key, { ...issue, count: 1, sampleRows: [issue.row] });
  }
}

export function excelSerialToISO(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2958465) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function coerceDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const iso = excelSerialToISO(value);
    if (!iso) return null;
    return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
  }
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{4,5}(\.\d+)?$/.test(text)) {
    const iso = excelSerialToISO(Number(text));
    if (iso) return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
  }
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return null;
  const hasTime = /\d{1,2}:\d{2}/.test(text);
  const date = new Date(parsed);
  if (date.getFullYear() < 1900 || date.getFullYear() > 2200) return null;
  return hasTime ? date.toISOString() : date.toISOString().slice(0, 10);
}

export function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let text = String(value)
    .trim()
    .replace(/[$€£¥₹]/g, "")
    .replace(/,/g, "")
    .replace(/\s*(usd|eur|gbp|inr)\s*$/i, "")
    .replace(/%$/, "")
    .trim();
  if (/^\(.*\)$/.test(text)) text = `-${text.slice(1, -1)}`;
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export interface TransformContext {
  sheet: SheetAnalysis;
  issues: Map<string, ImportIssue>;
  mode: ImportMode;
}

export function transformRow(
  fields: GeneratedField[],
  row: CellValue[],
  ctx: TransformContext,
  excelRow: number
): { data: Record<string, string | number | boolean | null>; drop: boolean } {
  const data: Record<string, string | number | boolean | null> = {};
  let invalid = false;
  let anyValue = false;
  let missingRequired = false;

  for (const field of fields) {
    // Positional lookup is only trusted when the column key still matches:
    // user-added fields carry a placeholder source index and must resolve by
    // key (→ no source column → imported empty) instead of reading a sibling.
    const byPosition =
      field.position != null ? ctx.sheet.columns[field.position] : undefined;
    const column =
      byPosition?.key === field.name
        ? byPosition
        : ctx.sheet.columns.find((c) => c.key === field.name);
    const raw: unknown = column ? (row[column.index] ?? null) : null;
    const text = raw === null || raw === undefined ? "" : String(raw).trim();
    if (text) anyValue = true;

    switch (field.type) {
      case "NUMBER":
      case "CURRENCY":
      case "PERCENT": {
        if (!text) {
          data[field.name] = null;
          break;
        }
        const n = coerceNumber(raw);
        if (n === null) {
          invalid = true;
          addIssue(ctx.issues, {
            code: "invalid_number",
            sheet: ctx.sheet.name,
            column: field.label,
            row: excelRow,
            message: `Values in “${field.label}” are not valid numbers (e.g. row ${excelRow}).`,
          });
          data[field.name] = ctx.mode === "raw" ? text : null;
        } else data[field.name] = n;
        break;
      }
      case "DATE":
      case "DATETIME": {
        if (!text) {
          data[field.name] = null;
          break;
        }
        const iso = coerceDate(raw);
        if (!iso) {
          invalid = true;
          addIssue(ctx.issues, {
            code: "invalid_date",
            sheet: ctx.sheet.name,
            column: field.label,
            row: excelRow,
            message: `Values in “${field.label}” are not valid dates (e.g. row ${excelRow}).`,
          });
          data[field.name] = ctx.mode === "raw" ? text : null;
        } else data[field.name] = iso;
        break;
      }
      case "BOOLEAN": {
        data[field.name] = text ? /^(true|yes|y|1|active)$/i.test(text) : null;
        break;
      }
      case "EMAIL": {
        if (!text) {
          data[field.name] = null;
          break;
        }
        if (!EMAIL_RE.test(text)) {
          invalid = true;
          addIssue(ctx.issues, {
            code: "invalid_email",
            sheet: ctx.sheet.name,
            column: field.label,
            row: excelRow,
            message: `Values in “${field.label}” are not valid email addresses (e.g. row ${excelRow}).`,
          });
          data[field.name] = ctx.mode === "raw" ? text : null;
        } else data[field.name] = text.toLowerCase();
        break;
      }
      case "ENUM": {
        if (!text) {
          data[field.name] = null;
          break;
        }
        const options = field.options ?? [];
        const match = options.find((o) => o.toLowerCase() === text.toLowerCase());
        if (match) data[field.name] = match;
        else if (options.length) {
          invalid = true;
          addIssue(ctx.issues, {
            code: "invalid_enum",
            sheet: ctx.sheet.name,
            column: field.label,
            row: excelRow,
            message: `Values in “${field.label}” are outside the known options (e.g. “${text}” in row ${excelRow}).`,
          });
          data[field.name] = ctx.mode === "raw" ? text : null;
        } else data[field.name] = text;
        break;
      }
      default: {
        data[field.name] = text || null;
      }
    }

    if (field.required && (data[field.name] === null || data[field.name] === "")) {
      missingRequired = true;
      addIssue(ctx.issues, {
        code: "missing_required",
        sheet: ctx.sheet.name,
        column: field.label,
        row: excelRow,
        message: `Required column “${field.label}” is empty (e.g. row ${excelRow}).`,
      });
    }
  }

  if (!anyValue) {
    addIssue(ctx.issues, {
      code: "empty_row",
      sheet: ctx.sheet.name,
      row: excelRow,
      message: `Row ${excelRow} is empty.`,
    });
    return { data, drop: true };
  }

  const drop = ctx.mode === "skip" && (invalid || missingRequired);
  return { data, drop };
}

/**
 * Imports spreadsheet rows into the generated record store.
 * Handles missing/invalid/duplicate data and reports every issue (app.txt §16).
 */
export async function importRecords(opts: {
  orgId: string;
  userId: string;
  applicationId: string;
  workbook: ParsedWorkbook;
  analysis: SpreadsheetAnalysis;
  mode: ImportMode;
  dedupe: boolean;
}): Promise<ImportReport> {
  const { orgId, userId, applicationId, workbook, analysis, mode, dedupe } = opts;

  const tables = await prisma.generatedTable.findMany({
    where: { applicationId },
    include: { fields: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  });

  const issues = new Map<string, ImportIssue>();
  const report: ImportReport = {
    mode,
    deduped: dedupe,
    totalImported: 0,
    totalSkipped: 0,
    tables: [],
    issues: [],
  };

  const duplicateRowsBySheet = new Map<string, Set<number>>();
  for (const group of analysis.duplicates) {
    const set = duplicateRowsBySheet.get(group.sheet) ?? new Set<number>();
    for (const row of group.rows) set.add(row);
    duplicateRowsBySheet.set(group.sheet, set);
  }

  for (const table of tables) {
    const sheet = workbook.sheets.find((s) => s.name === table.sourceSheet);
    const sheetAnalysis = analysis.sheets.find((s) => s.name === table.sourceSheet);
    if (!sheet || !sheetAnalysis) continue;

    const ctx: TransformContext = { sheet: sheetAnalysis, issues, mode };
    const dupRows = duplicateRowsBySheet.get(sheet.name) ?? new Set<number>();
    const titleField = table.fields.find((f) => f.isTitle) ?? table.fields[0];
    const uniqueFields = table.fields.filter((f) => f.unique);
    const keySet = new Set<string>();

    const rows: Record<string, unknown>[] = [];
    let skipped = 0;

    for (let i = 0; i < sheet.rows.length; i++) {
      const excelRow = i + 2;
      if (dedupe && dupRows.has(excelRow)) {
        skipped++;
        addIssue(issues, {
          code: "skipped_row",
          sheet: sheet.name,
          column: titleField?.label,
          row: excelRow,
          message: `Row ${excelRow} looks like a duplicate and was skipped.`,
        });
        continue;
      }

      const { data, drop } = transformRow(table.fields, sheet.rows[i] ?? [], ctx, excelRow);
      if (drop) {
        skipped++;
        continue;
      }

      let duplicateKeyHit = false;
      for (const uf of uniqueFields) {
        const value = data[uf.name];
        if (value === null || value === "") continue;
        const key = `${uf.name}:${String(value).toLowerCase()}`;
        if (keySet.has(key)) {
          duplicateKeyHit = true;
          addIssue(issues, {
            code: "duplicate_key",
            sheet: sheet.name,
            column: uf.label,
            row: excelRow,
            message: `Duplicate value in unique column “${uf.label}” (row ${excelRow}).`,
          });
          break;
        }
        keySet.add(key);
      }
      if (duplicateKeyHit && mode === "skip") {
        skipped++;
        continue;
      }

      rows.push({
        data: { ...data },
        organizationId: orgId,
        applicationId,
        tableId: table.id,
        createdById: userId,
      });
    }

    if (!rows.length) {
      report.tables.push({ tableId: table.id, label: table.label, imported: 0, skipped });
      continue;
    }
    for (let i = 0; i < rows.length; i += 500) {
      await prisma.record.createMany({ data: rows.slice(i, i + 500) as never[] });
    }

    report.tables.push({
      tableId: table.id,
      label: table.label,
      imported: rows.length,
      skipped,
    });
    report.totalImported += rows.length;
    report.totalSkipped += skipped;
  }

  report.issues = [...issues.values()].sort((a, b) => b.count - a.count);
  return report;
}
