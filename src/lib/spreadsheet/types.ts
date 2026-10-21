/** Shared types for the spreadsheet analysis engine (prd.md §5, trd.md §5). */

export type FileKind = "xlsx" | "xls" | "csv";

export type CellValue = string | number | boolean | null;

export interface FormulaCell {
  /** A1-style reference, e.g. "G12" */
  cell: string;
  sheet: string;
  formula: string;
  /** Cached result if it is a spreadsheet error like #REF! */
  error?: string;
}

export interface ParsedSheet {
  name: string;
  /** First row is the header row. */
  rows: CellValue[][];
  headers: string[];
  rowCount: number;
  columnCount: number;
  formulas: FormulaCell[];
}

export interface ParsedWorkbook {
  fileName: string;
  fileSize: number;
  fileKind: FileKind;
  sheets: ParsedSheet[];
  warnings: string[];
}

export type DetectedType =
  | "identifier"
  | "text"
  | "long_text"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "datetime"
  | "boolean"
  | "enum"
  | "email"
  | "phone"
  | "url";

export interface ForeignKeyHint {
  targetSheet: string;
  targetColumn: string;
  confidence: number;
  reason: string;
}

export interface ColumnAnalysis {
  index: number;
  /** Original header text (sanitized). */
  name: string;
  /** Unique machine key within the sheet. */
  key: string;
  type: DetectedType;
  sampleValues: string[];
  filled: number;
  empty: number;
  uniqueCount: number;
  duplicateCount: number;
  /** Share of rows without a value (0..1). */
  emptyRatio: number;
  /** Non-empty values that fail the column's own type test (app.txt §16). */
  invalidEmailCount: number;
  invalidDateCount: number;
  likelyIdentifier: boolean;
  possibleStatus: boolean;
  enumValues?: string[];
  foreignKey?: ForeignKeyHint;
  confidence: number;
}

export interface SheetAnalysis {
  name: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnAnalysis[];
  duplicateRowCount: number;
  emptyColumnCount: number;
  formulas: FormulaCell[];
}

export interface DuplicateGroup {
  sheet: string;
  keyColumn: string;
  normalizedValue: string;
  values: string[];
  rows: number[];
}

export interface RelationshipSuggestion {
  fromSheet: string;
  fromColumn: string;
  toSheet: string;
  toColumn: string;
  confidence: number;
  reason: string;
}

export type HealthCategory =
  | "duplicates"
  | "inconsistent_values"
  | "missing_values"
  | "broken_formulas"
  | "unused_columns";

export interface HealthFinding {
  category: HealthCategory;
  severity: "info" | "warning" | "error";
  sheet: string;
  message: string;
  count: number;
  columns?: string[];
  rows?: number[];
}

export interface SpreadsheetAnalysis {
  fileName: string;
  fileSize: number;
  fileKind: FileKind;
  sheetCount: number;
  totalRows: number;
  totalColumns: number;
  sheets: SheetAnalysis[];
  relationships: RelationshipSuggestion[];
  duplicates: DuplicateGroup[];
  health: HealthFinding[];
  warnings: string[];
  analyzedAt: string;
}
