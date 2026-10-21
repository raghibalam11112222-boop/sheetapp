import type { DetectedType, SpreadsheetAnalysis, SheetAnalysis, ColumnAnalysis } from "@/lib/spreadsheet/types";
import type {
  FieldSuggestion,
  SchemaFieldType,
  SchemaSuggestion,
  TableSuggestion,
} from "./types";

const TYPE_MAP: Record<DetectedType, SchemaFieldType> = {
  identifier: "IDENTIFIER",
  text: "TEXT",
  long_text: "LONG_TEXT",
  number: "NUMBER",
  currency: "CURRENCY",
  percent: "PERCENT",
  date: "DATE",
  datetime: "DATETIME",
  boolean: "BOOLEAN",
  enum: "ENUM",
  email: "EMAIL",
  phone: "PHONE",
  url: "URL",
};

const TITLE_HINT =
  /\b(name|title|label|customer|company|product|item|project|employee|account|order)\b/i;

function prettyTitle(value: string): string {
  return value
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 60);
}

function singularize(label: string): string {
  const lower = label.toLowerCase();
  if (lower.endsWith("ies") && label.length > 4) return label.slice(0, -3) + "y";
  if (lower.endsWith("sses") || lower.endsWith("shes") || lower.endsWith("xes"))
    return label.slice(0, -2);
  if (lower.endsWith("s") && !lower.endsWith("ss") && label.length > 2)
    return label.slice(0, -1);
  return label;
}

function machineKey(label: string, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/^(\d)/, "_$1") || "field";
  let key = base;
  let i = 2;
  while (taken.has(key)) key = `${base}_${i++}`;
  taken.add(key);
  return key;
}

function pickTitleColumn(columns: ColumnAnalysis[]): ColumnAnalysis | undefined {
  const usable = columns.filter(
    (c) => c.filled > 0 && c.type !== "long_text" && c.type !== "boolean"
  );
  return (
    usable.find((c) => c.type === "text" && TITLE_HINT.test(c.name) && c.emptyRatio < 0.2) ??
    usable.find((c) => c.likelyIdentifier) ??
    usable.find((c) => c.type === "text" && c.emptyRatio < 0.1) ??
    usable[0]
  );
}

function buildTable(sheet: SheetAnalysis, fallbackLabel: string): TableSuggestion {
  const label =
    /^(sheet|tab|data|table)\s*\d*$/i.test(sheet.name.trim()) || !sheet.name.trim()
      ? fallbackLabel
      : prettyTitle(sheet.name);
  const takenKeys = new Set<string>();
  const titleColumn = pickTitleColumn(sheet.columns);

  const fields: FieldSuggestion[] = sheet.columns.map((column) => {
    const type = TYPE_MAP[column.type] ?? "TEXT";
    const field: FieldSuggestion = {
      key: machineKey(column.key, takenKeys),
      label: prettyTitle(column.name),
      type,
      required: column.filled > 0 && column.empty === 0 && type !== "LONG_TEXT",
      unique:
        (type === "IDENTIFIER" || column.likelyIdentifier) &&
        column.uniqueCount === column.filled &&
        column.filled > 0,
      isTitle: titleColumn ? column.index === titleColumn.index : false,
      sourceColumnIndex: column.index,
    };
    if (type === "ENUM" && column.enumValues?.length) {
      field.options = column.enumValues;
    }
    if (column.foreignKey && column.foreignKey.confidence >= 0.75) {
      field.helpText = `Related to ${column.foreignKey.targetSheet}`;
    }
    return field;
  });

  // Guarantee exactly one title field.
  if (!fields.some((f) => f.isTitle) && fields.length) {
    const candidate = fields.find((f) => f.type === "TEXT" || f.type === "IDENTIFIER");
    if (candidate) candidate.isTitle = true;
    else fields[0].isTitle = true;
  }

  return {
    key: machineKey(
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "table",
      new Set()
    ),
    label,
    singularLabel: singularize(label),
    sourceSheet: sheet.name,
    fields,
    recordCount: sheet.rowCount,
  };
}

/**
 * Builds a complete schema suggestion using only the deterministic analysis —
 * this is the source of truth that AI output is validated against (app.txt §38).
 */
export function buildDeterministicSchema(analysis: SpreadsheetAnalysis): SchemaSuggestion {
  const fileLabel = prettyTitle(analysis.fileName || "My Data");
  const tables = analysis.sheets.map((sheet) => buildTable(sheet, fileLabel));

  // De-duplicate table keys (machineKey already unique per table via new Set each time).
  const seenTables = new Set<string>();
  for (const table of tables) {
    let key = table.key;
    let i = 2;
    while (seenTables.has(key)) key = `${table.key}_${i++}`;
    table.key = key;
    seenTables.add(key);
  }

  const relationships = analysis.relationships
    .map((rel) => {
      const fromTable = tables.find((t) => t.sourceSheet === rel.fromSheet);
      const toTable = tables.find((t) => t.sourceSheet === rel.toSheet);
      if (!fromTable || !toTable) return null;
      const fromColumn = analysis.sheets
        .find((s) => s.name === rel.fromSheet)
        ?.columns.find((c) => c.name === rel.fromColumn);
      if (!fromColumn) return null;
      return {
        fromTableKey: fromTable.key,
        fromFieldKey:
          fromTable.fields.find((f) => f.sourceColumnIndex === fromColumn.index)?.key ??
          fromColumn.key,
        toTableKey: toTable.key,
        confidence: rel.confidence,
        label: rel.reason,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const name = tables.length > 1 ? `${fileLabel} Operations` : fileLabel;

  return {
    name: name.slice(0, 60),
    description: `Internal app generated from ${analysis.fileName} (${analysis.totalRows.toLocaleString()} rows across ${analysis.sheetCount} sheet${analysis.sheetCount === 1 ? "" : "s"}).`,
    tables,
    relationships,
    rationale: `Detected ${tables.length} table${tables.length === 1 ? "" : "s"} and ${relationships.length} potential relationship${relationships.length === 1 ? "" : "s"} from the spreadsheet structure.`,
  };
}
