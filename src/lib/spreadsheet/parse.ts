import * as XLSX from "xlsx";
import {
  MAX_COLUMNS_PER_SHEET,
  MAX_ROWS_PER_SHEET,
  MAX_SHEETS,
} from "./validate";
import type {
  CellValue,
  FileKind,
  FormulaCell,
  ParsedSheet,
  ParsedWorkbook,
} from "./types";

export class SpreadsheetParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpreadsheetParseError";
  }
}

const CELL_SCAN_LIMIT = 250_000;
// Stored cap: formulas beyond this are dropped (the scan itself stays bounded
// by CELL_SCAN_LIMIT). Health findings only surface examples, so a cap here
// bounds DB + review payloads for pathological sheets.
const MAX_STORED_FORMULAS = 5000;

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function sanitizeHeader(value: unknown, index: number): string {
  const text = toText(value).replace(/\s+/g, " ");
  if (!text) return `Column ${index + 1}`;
  return text.slice(0, 120);
}

function collectFormulas(ws: XLSX.WorkSheet, sheetName: string): FormulaCell[] {
  const formulas: FormulaCell[] = [];
  let scanned = 0;
  for (const key of Object.keys(ws)) {
    if (key.startsWith("!")) continue;
    if (++scanned > CELL_SCAN_LIMIT) break;
    // Bound the stored array: formula-dense sheets would otherwise bloat the
    // persisted analysis JSON and the review payload (slim keeps all of it).
    // Nothing else is collected past the cap, so stop scanning entirely.
    if (formulas.length >= MAX_STORED_FORMULAS) break;
    const cell = ws[key] as XLSX.CellObject | undefined;
    if (!cell || typeof cell !== "object") continue;
    if (cell.f) {
      const cached = cell.v;
      const isError =
        cell.t === "e" ||
        (typeof cached === "string" && /^#(REF|DIV\/0|VALUE|NAME|NUM|NULL|N\/A)/.test(cached));
      formulas.push({
        cell: key,
        sheet: sheetName,
        formula: `=${cell.f}`,
        error: isError ? String(cached ?? "#ERROR") : undefined,
      });
    } else if (
      cell.t === "e" ||
      (typeof cell.v === "string" && /^#(REF|DIV\/0|VALUE|NAME|NUM|NULL|N\/A)/.test(cell.v))
    ) {
      formulas.push({
        cell: key,
        sheet: sheetName,
        formula: "",
        error: String(cell.v),
      });
    }
  }
  return formulas;
}

/**
 * Parses an .xlsx/.xls/.csv payload into plain rows.
 * Spreadsheet formulas are read as text and NEVER evaluated (trd.md §5).
 */
export function parseWorkbook(
  bytes: Uint8Array,
  fileName: string,
  fileSize: number,
  fileKind: FileKind,
  warnings: string[] = []
): ParsedWorkbook {
  let wb: XLSX.WorkBook;
  try {
    if (fileKind === "csv") {
      const text = new TextDecoder("utf-8", { fatal: false })
        .decode(bytes)
        .replace(/^\uFEFF/, "");
      wb = XLSX.read(text, { type: "string", raw: true });
    } else {
      // sheetRows stops the worksheet parser at the import cap (20x faster
      // on oversized sheets). The truncation notice below fires whenever a
      // sheet reaches the cap; the slice after sheet_to_json is belt-and-braces.
      wb = XLSX.read(bytes, {
        type: "array",
        cellFormula: true,
        cellDates: false,
        sheetRows: MAX_ROWS_PER_SHEET + 1,
      });
    }
  } catch {
    throw new SpreadsheetParseError(
      "We could not read this file. It may be corrupted or password protected."
    );
  }

  const sheetNames = wb.SheetNames.slice(0, MAX_SHEETS);
  if (wb.SheetNames.length > MAX_SHEETS) {
    warnings.push(`Only the first ${MAX_SHEETS} sheets were imported.`);
  }

  const sheets: ParsedSheet[] = [];

  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;

    // Data-row count from the sheet dimension. Exact for CSV (no sheetRows
    // there); for xlsx the sheetRows cap means it tops out at the limit.
    let totalDataRows = 0;
    try {
      const ref = ws["!ref"];
      if (ref) totalDataRows = Math.max(0, XLSX.utils.decode_range(ref).e.r);
    } catch {
      totalDataRows = 0;
    }

    let rawRows: unknown[][];
    try {
      rawRows = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: true,
        defval: null,
        blankrows: false,
      }) as unknown[][];
    } catch {
      warnings.push(`Sheet "${name}" could not be read and was skipped.`);
      continue;
    }

    if (!rawRows.length) {
      warnings.push(`Sheet "${name}" is empty and was skipped.`);
      continue;
    }

    // Note: with sheetRows above, an oversized sheet parses as exactly the
    // cap, so the rawRows check also covers true truncation (the exact row
    // count past the cap is unknowable without a slow full parse). Wording
    // stays truthful for sheets with exactly MAX rows too (rare).
    // totalDataRows is exact for CSV (no sheetRows there); for xlsx the
    // sheetRows cap means it can only reach MAX, never exceed it.
    if (totalDataRows > MAX_ROWS_PER_SHEET || rawRows.length - 1 >= MAX_ROWS_PER_SHEET) {
      warnings.push(
        `Sheet "${name}" reached the ${MAX_ROWS_PER_SHEET.toLocaleString()}-row import limit; only the first ${MAX_ROWS_PER_SHEET.toLocaleString()} rows are imported.`
      );
      rawRows = rawRows.slice(0, MAX_ROWS_PER_SHEET + 1);
    }

    const rawHeader = rawRows[0] ?? [];
    const columnCount = Math.min(
      Math.max(
        rawHeader.length,
        ...rawRows.slice(0, 50).map((r) => r.length),
        1
      ),
      MAX_COLUMNS_PER_SHEET
    );

    const headers: string[] = [];
    for (let c = 0; c < columnCount; c++) {
      headers.push(sanitizeHeader(rawHeader[c], c));
    }
    // Headers must be unique for downstream metadata keys.
    const seen = new Map<string, number>();
    for (let c = 0; c < headers.length; c++) {
      const base = headers[c];
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      if (count > 0) headers[c] = `${base} (${count + 1})`;
    }

    const rows: CellValue[][] = [];
    for (let r = 1; r < rawRows.length; r++) {
      const source = rawRows[r] ?? [];
      const row: CellValue[] = [];
      for (let c = 0; c < columnCount; c++) {
        const v = source[c];
        if (v === null || v === undefined || v === "") row.push(null);
        else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
          row.push(v);
        else row.push(String(v));
      }
      rows.push(row);
    }

    sheets.push({
      name: name.slice(0, 80),
      headers,
      rows,
      rowCount: rows.length,
      columnCount,
      formulas: collectFormulas(ws, name.slice(0, 80)),
    });
  }

  if (!sheets.length) {
    throw new SpreadsheetParseError(
      "No readable sheets were found in this file."
    );
  }

  return { fileName, fileSize, fileKind, sheets, warnings };
}
