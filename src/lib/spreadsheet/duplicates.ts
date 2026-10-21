import type { ColumnAnalysis, DuplicateGroup, ParsedWorkbook, SheetAnalysis } from "./types";

const CORPORATE_SUFFIXES = [
  "inc",
  "incorporated",
  "llc",
  "ltd",
  "limited",
  "corp",
  "corporation",
  "gmbh",
  "plc",
  "pvt",
  "co",
  "company",
];

const NAME_COLUMN =
  /(name|customer|client|company|vendor|supplier|contact|product|item|employee|account|patient|member)/i;

const MAX_GROUPS_PER_SHEET = 100;
const MAX_ROWS_PER_GROUP = 50;

export function normalizeDuplicateKey(value: string): string {
  let v = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  v = v.replace(/^the\s+/, "");
  const parts = v.split(" ");
  while (parts.length > 1 && CORPORATE_SUFFIXES.includes(parts[parts.length - 1] ?? "")) {
    parts.pop();
  }
  return parts.join(" ").trim();
}

function candidateColumns(analysis: SheetAnalysis): ColumnAnalysis[] {
  const nameLike = analysis.columns.filter(
    (c) => NAME_COLUMN.test(c.name) && c.type === "text" && c.filled >= 5
  );
  if (nameLike.length) return nameLike.slice(0, 3);
  return analysis.columns
    .filter(
      (c) =>
        (c.type === "text" || c.type === "identifier") &&
        c.filled >= 10 &&
        c.uniqueCount >= 2 &&
        c.uniqueCount / c.filled < 0.99
    )
    .slice(0, 2);
}

/** Finds likely duplicate rows per sheet by normalizing name-like columns. */
export function detectDuplicates(
  workbook: ParsedWorkbook,
  analyses: SheetAnalysis[]
): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];

  for (const sheet of workbook.sheets) {
    const analysis = analyses.find((a) => a.name === sheet.name);
    if (!analysis) continue;
    if (sheet.rowCount < 2) continue;

    for (const column of candidateColumns(analysis)) {
      const buckets = new Map<string, { rows: number[]; values: Set<string> }>();

      sheet.rows.forEach((row, rowIndex) => {
        const raw = row?.[column.index] ?? null;
        if (raw === null || raw === undefined) return;
        const text = String(raw).trim();
        if (text.length < 2) return;
        const key = normalizeDuplicateKey(text);
        if (!key) return;
        const bucket = buckets.get(key) ?? { rows: [], values: new Set() };
        bucket.rows.push(rowIndex + 2); // spreadsheet row number (header = 1)
        bucket.values.add(text);
        buckets.set(key, bucket);
      });

      let found = 0;
      for (const [normalizedValue, bucket] of buckets) {
        if (bucket.rows.length < 2) continue;
        if (found >= MAX_GROUPS_PER_SHEET) break;
        found++;
        groups.push({
          sheet: sheet.name,
          keyColumn: column.name,
          normalizedValue,
          values: [...bucket.values].slice(0, MAX_ROWS_PER_GROUP),
          rows: bucket.rows.slice(0, MAX_ROWS_PER_GROUP),
        });
      }
      if (found >= MAX_GROUPS_PER_SHEET) break;
    }
  }

  groups.sort((a, b) => b.rows.length - a.rows.length);
  return groups;
}
