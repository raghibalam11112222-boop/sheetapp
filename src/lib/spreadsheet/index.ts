import type {
  ParsedSheet,
  SheetAnalysis,
  SpreadsheetAnalysis,
} from "./types";
import { analyzeColumn, headerToKey, INFER_SAMPLE_LIMIT } from "./infer";
import { detectRelationships } from "./relationships";
import { detectDuplicates } from "./duplicates";
import { buildHealthFindings } from "./health";
import type { ParsedWorkbook } from "./types";

function countDuplicateRows(sheet: ParsedSheet, columns: SheetAnalysis["columns"]): number {
  // Exact shortcut: small sheets are scanned row-for-row by analyzeColumn
  // (step 1), so a fully-unique column proves no two rows are identical.
  // (Uniqueness is tracked case-insensitively, matching the key below.)
  if (sheet.rows.length <= INFER_SAMPLE_LIMIT && sheet.rows.length > 0) {
    const allDistinct = columns.some(
      (c) => c.filled === sheet.rows.length && c.uniqueCount === sheet.rows.length
    );
    if (allDistinct) return 0;
  }
  const seen = new Set<string>();
  let duplicates = 0;
  for (const row of sheet.rows) {
    const key = row.map((v) => (v === null ? "" : String(v).toLowerCase())).join("\u0001");
    if (!key.trim()) continue;
    if (seen.has(key)) duplicates++;
    else seen.add(key);
    if (duplicates > 100_000) break;
  }
  return duplicates;
}

function analyzeSheet(sheet: ParsedSheet): SheetAnalysis {
  const taken = new Set<string>();
  const columns = sheet.headers.map((header, index) =>
    analyzeColumn(sheet, index, header, headerToKey(header, taken))
  );

  return {
    name: sheet.name,
    rowCount: sheet.rowCount,
    columnCount: sheet.columnCount,
    columns,
    duplicateRowCount: countDuplicateRows(sheet, columns),
    emptyColumnCount: columns.filter((c) => c.filled === 0).length,
    formulas: sheet.formulas,
  };
}

/**
 * Deterministic spreadsheet analysis (prd.md §5 "Spreadsheet Analysis").
 * Runs fully server-side; only structured metadata leaves this module so the
 * raw spreadsheet is never shipped to an AI provider (app.txt §7).
 */
export function analyzeWorkbook(workbook: ParsedWorkbook): SpreadsheetAnalysis {
  const sheets = workbook.sheets.map(analyzeSheet);

  // Attach foreign-key hints straight onto the columns.
  const relationships = detectRelationships(workbook.sheets, sheets);
  for (const rel of relationships) {
    const fromSheet = sheets.find((s) => s.name === rel.fromSheet);
    const column = fromSheet?.columns.find((c) => c.name === rel.fromColumn);
    if (column && column.type === "text") {
      column.foreignKey = {
        targetSheet: rel.toSheet,
        targetColumn: rel.toColumn,
        confidence: rel.confidence,
        reason: rel.reason,
      };
    }
  }

  const duplicates = detectDuplicates(workbook, sheets);
  const health = buildHealthFindings(workbook, sheets, duplicates);

  return {
    fileName: workbook.fileName,
    fileSize: workbook.fileSize,
    fileKind: workbook.fileKind,
    sheetCount: workbook.sheets.length,
    totalRows: workbook.sheets.reduce((sum, s) => sum + s.rowCount, 0),
    totalColumns: sheets.reduce((sum, s) => sum + s.columnCount, 0),
    sheets,
    relationships,
    duplicates,
    health,
    warnings: workbook.warnings,
    analyzedAt: new Date().toISOString(),
  };
}

export { parseWorkbook } from "./parse";
export { validateSpreadsheetFile, FileValidationError, MAX_FILE_BYTES } from "./validate";
export { UploadedFileSource } from "./source";
export type { SpreadsheetSource, SpreadsheetSourceKind } from "./source";
export { slimAnalysisForReview } from "./slim";
export type { SlimAnalysis, SlimColumn } from "./slim";
export type { SpreadsheetAnalysis };
