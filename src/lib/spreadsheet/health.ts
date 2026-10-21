import type {
  DuplicateGroup,
  HealthFinding,
  ParsedWorkbook,
  SheetAnalysis,
} from "./types";
import { findInconsistentVariants } from "./infer";

const MAX_ITEMS = 10;

function sliceList<T>(items: T[]): string {
  const shown = items.slice(0, MAX_ITEMS).join(", ");
  return items.length > MAX_ITEMS ? `${shown} +${items.length - MAX_ITEMS} more` : shown;
}

export function buildHealthFindings(
  workbook: ParsedWorkbook,
  analyses: SheetAnalysis[],
  duplicates: DuplicateGroup[]
): HealthFinding[] {
  const findings: HealthFinding[] = [];

  // 1. Duplicate records
  const bySheet = new Map<string, DuplicateGroup[]>();
  for (const group of duplicates) {
    const list = bySheet.get(group.sheet) ?? [];
    list.push(group);
    bySheet.set(group.sheet, list);
  }
  for (const [sheet, groups] of bySheet) {
    const rows = groups.reduce((sum, g) => sum + g.rows.length, 0);
    findings.push({
      category: "duplicates",
      severity: "warning",
      sheet,
      message: `${groups.length} likely duplicate group${groups.length === 1 ? "" : "s"} found covering ${rows} rows (e.g. ${sliceList(groups.map((g) => g.values[0] ?? ""))}).`,
      count: rows,
      columns: [...new Set(groups.map((g) => g.keyColumn))],
      rows: groups.flatMap((g) => g.rows).slice(0, 100),
    });
  }

  // 2. Inconsistent status/enum values
  for (const analysis of analyses) {
    const sheet = workbook.sheets.find((s) => s.name === analysis.name);
    if (!sheet) continue;
    for (const column of analysis.columns) {
      if (column.type !== "enum" && column.type !== "boolean") continue;
      const inconsistent = findInconsistentVariants(sheet, column.index);
      if (inconsistent) {
        findings.push({
          category: "inconsistent_values",
          severity: "warning",
          sheet: analysis.name,
          message: `Column “${column.name}” has inconsistent values: ${sliceList(inconsistent.variants)}.`,
          count: inconsistent.extraCount,
          columns: [column.name],
          rows: inconsistent.rows,
        });
      }
    }
  }

  // 3. Missing values
  for (const analysis of analyses) {
    const sheet = workbook.sheets.find((s) => s.name === analysis.name);
    // Exact affected (excel) row numbers for empty cells, capped for display.
    const emptyRowsFor = (indexes: number[], cap = 30): number[] => {
      const out: number[] = [];
      if (!sheet) return out;
      for (let r = 0; r < sheet.rows.length && out.length < cap; r++) {
        const row = sheet.rows[r] ?? [];
        if (indexes.some((c) => row[c] === null || row[c] === undefined || row[c] === "")) {
          out.push(r + 2);
        }
      }
      return out;
    };
    const sparse = analysis.columns.filter((c) => c.emptyRatio >= 0.15 && c.filled + c.empty > 0);
    if (sparse.length) {
      const worst = Math.max(...sparse.map((c) => c.emptyRatio));
      findings.push({
        category: "missing_values",
        severity: worst >= 0.5 ? "error" : "warning",
        sheet: analysis.name,
        message: `${sparse.length} column${sparse.length === 1 ? "" : "s"} have missing values${worst >= 0.5 ? " (more than half empty)" : ""}.`,
        count: sparse.reduce((sum, c) => sum + c.empty, 0),
        columns: sparse.map((c) => c.name).slice(0, MAX_ITEMS),
        rows: emptyRowsFor(sparse.map((c) => c.index)),
      });
    }
    const requiredLike = analysis.columns.filter(
      (c) =>
        c.emptyRatio > 0 &&
        c.emptyRatio < 1 &&
        (/\b(id|code|sku)\b/i.test(c.name) || /\bname\b/i.test(c.name) || c.likelyIdentifier)
    );
    if (requiredLike.length) {
      findings.push({
        category: "missing_values",
        severity: "error",
        sheet: analysis.name,
        message: `Key columns are incomplete: ${sliceList(requiredLike.map((c) => c.name))}.`,
        count: requiredLike.reduce((sum, c) => sum + c.empty, 0),
        columns: requiredLike.map((c) => c.name).slice(0, MAX_ITEMS),
        rows: emptyRowsFor(requiredLike.map((c) => c.index)),
      });
    }
  }

  // 4. Broken formulas / error cells
  for (const analysis of analyses) {
    const broken = analysis.formulas.filter((f) => f.error);
    if (broken.length) {
      findings.push({
        category: "broken_formulas",
        severity: "error",
        sheet: analysis.name,
        message: `${broken.length} cell${broken.length === 1 ? "" : "s"} contain broken formulas or errors (e.g. ${sliceList(broken.map((f) => `${f.cell}: ${f.error}`))}).`,
        count: broken.length,
      });
    }
  }

  // 5. Unused columns
  for (const analysis of analyses) {
    const allEmpty = analysis.columns.filter((c) => c.filled === 0);
    const constant = analysis.columns.filter(
      (c) => c.filled > 0 && c.uniqueCount <= 1 && c.type !== "boolean" && c.type !== "enum"
    );
    const unused = [...allEmpty, ...constant];
    if (unused.length) {
      findings.push({
        category: "unused_columns",
        severity: "info",
        sheet: analysis.name,
        message: `${unused.length} unused column${unused.length === 1 ? "" : "s"} (${allEmpty.length} empty, ${constant.length} constant).`,
        count: unused.length,
        columns: unused.map((c) => c.name).slice(0, MAX_ITEMS),
      });
    }
  }

  return findings;
}
