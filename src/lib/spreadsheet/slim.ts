import type { HealthFinding, SpreadsheetAnalysis } from "./types";

/**
 * Review-screen projection of the analysis (app.txt §37 "Do not send
 * unnecessary spreadsheet data to the browser"): drops per-value payloads
 * the client never renders (column samples, duplicate value/row lists)
 * while keeping every count, flag and message the UI needs. The full
 * analysis stays in storage for regeneration and import.
 */
export interface SlimColumn {
  index: number;
  name: string;
  key: string;
  type: string;
  filled: number;
  empty: number;
  uniqueCount: number;
  emptyRatio: number;
  invalidEmailCount: number;
  invalidDateCount: number;
}

export interface SlimAnalysis {
  fileName: string;
  totalRows: number;
  totalColumns: number;
  sheets: {
    name: string;
    rowCount: number;
    columnCount: number;
    columns: SlimColumn[];
    duplicateRowCount: number;
    emptyColumnCount: number;
    formulas: { cell: string; sheet: string; formula: string; error?: string }[];
  }[];
  relationships: unknown[];
  duplicates: { sheet: string; keyColumn: string; normalizedValue: string; rowCount: number }[];
  health: HealthFinding[];
  warnings: string[];
}

export function slimAnalysisForReview(analysis: SpreadsheetAnalysis): SlimAnalysis {
  return {
    fileName: analysis.fileName,
    totalRows: analysis.totalRows,
    totalColumns: analysis.totalColumns,
    sheets: analysis.sheets.map((s) => ({
      name: s.name,
      rowCount: s.rowCount,
      columnCount: s.columnCount,
      columns: s.columns.map((c) => ({
        index: c.index,
        name: c.name,
        key: c.key,
        type: c.type,
        filled: c.filled,
        empty: c.empty,
        uniqueCount: c.uniqueCount,
        emptyRatio: c.emptyRatio,
        invalidEmailCount: c.invalidEmailCount,
        invalidDateCount: c.invalidDateCount,
      })),
      duplicateRowCount: s.duplicateRowCount,
      emptyColumnCount: s.emptyColumnCount,
      formulas: s.formulas,
    })),
    relationships: analysis.relationships,
    duplicates: analysis.duplicates.map((d) => ({
      sheet: d.sheet,
      keyColumn: d.keyColumn,
      normalizedValue: d.normalizedValue,
      rowCount: d.rows.length,
    })),
    health: analysis.health,
    warnings: analysis.warnings,
  };
}
