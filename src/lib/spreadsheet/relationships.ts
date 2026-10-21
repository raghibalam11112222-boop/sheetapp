import type {
  ColumnAnalysis,
  ParsedSheet,
  RelationshipSuggestion,
  SheetAnalysis,
} from "./types";

const MAX_VALUES_PER_COLUMN = 2000;

function canonical(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function singularize(value: string): string {
  const word = canonical(value).split(" ").pop() ?? "";
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("es") && word.length > 3) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 2) return word.slice(0, -1);
  return word;
}

interface ColumnValues {
  sheet: string;
  sheetBase: string;
  column: ColumnAnalysis;
  headerBase: string;
  isKeyTarget: boolean;
  values: Set<string>;
}

function columnValueSet(sheet: ParsedSheet, column: ColumnAnalysis): Set<string> | null {
  if (column.filled < 5) return null;
  if (column.uniqueCount / column.filled < 0.5) return null;
  if (column.type === "boolean") return null;
  const set = new Set<string>();
  const step = Math.max(1, Math.floor(sheet.rows.length / MAX_VALUES_PER_COLUMN));
  for (let r = 0; r < sheet.rows.length; r += step) {
    const raw = sheet.rows[r]?.[column.index] ?? null;
    if (raw === null || raw === undefined) continue;
    const text = String(raw).trim().toLowerCase();
    if (text) set.add(text);
  }
  if (set.size < 5) return null;
  return set;
}

/**
 * Detects potential foreign-key style relationships between sheets by
 * comparing high-cardinality columns for value overlap (trd.md §5).
 */
export function detectRelationships(
  sheets: ParsedSheet[],
  analyses: SheetAnalysis[]
): RelationshipSuggestion[] {
  const byName = new Map(analyses.map((a) => [a.name, a] as const));
  const pool: ColumnValues[] = [];
  for (const sheet of sheets) {
    const analysis = byName.get(sheet.name);
    if (!analysis) continue;
    const sheetBase = singularize(sheet.name);
    for (const column of analysis.columns) {
      if (column.type === "long_text" || column.type === "date" || column.type === "datetime")
        continue;
      const values = columnValueSet(sheet, column);
      if (!values) continue;
      pool.push({
        sheet: sheet.name,
        sheetBase,
        column,
        headerBase: singularize(column.name.replace(/\b(id|key|code|number|no)\b/gi, "")),
        isKeyTarget:
          column.type === "identifier" ||
          column.likelyIdentifier ||
          NAME_LIKE.test(column.name),
        values,
      });
    }
  }

  const suggestions: RelationshipSuggestion[] = [];
  const bestBySource = new Map<string, RelationshipSuggestion>();

  for (const source of pool) {
    // Minimum matches this source needs to ever pass the thresholds below.
    const needed = Math.max(5, Math.ceil(source.values.size * 0.6));
    for (const target of pool) {
      if (source.sheet === target.sheet) continue;
      if (source.column.key === target.column.key) continue;
      // O(1) rejects before the expensive set intersection: the overlap can
      // never reach max(5, 60%) when the smaller set is too small, and pairs
      // with neither a key-like target nor header affinity are dropped anyway.
      if (Math.min(source.values.size, target.values.size) < needed) continue;
      const headerAffinity =
        source.headerBase.length > 1 &&
        (source.headerBase === target.sheetBase ||
          target.sheetBase.includes(source.headerBase));
      if (!target.isKeyTarget && !headerAffinity) continue;

      let matches = 0;
      let checked = 0;
      const size = source.values.size;
      for (const v of source.values) {
        checked++;
        if (target.values.has(v)) matches++;
        // Abort losers early: even matching everything left can't reach `needed`.
        if (matches + (size - checked) < needed) break;
      }
      const overlap = matches / size;
      if (overlap < 0.6 || matches < 5) continue;

      const confidence = Math.min(0.99, overlap + (headerAffinity ? 0.2 : 0));
      const suggestion: RelationshipSuggestion = {
        fromSheet: source.sheet,
        fromColumn: source.column.name,
        toSheet: target.sheet,
        toColumn: target.column.name,
        confidence: Number(confidence.toFixed(2)),
        reason: `${Math.round(overlap * 100)}% of “${source.column.name}” values match “${target.column.name}” in ${target.sheet}`,
      };

      const mapKey = `${source.sheet}::${source.column.key}`;
      const existing = bestBySource.get(mapKey);
      if (!existing || existing.confidence < suggestion.confidence) {
        bestBySource.set(mapKey, suggestion);
      }
    }
  }

  for (const s of bestBySource.values()) suggestions.push(s);
  suggestions.sort((a, b) => b.confidence - a.confidence);
  return suggestions.slice(0, 20);
}

const NAME_LIKE = /name|title|label|customer|client|company|vendor|supplier|contact|product|item|employee|project|account/i;
