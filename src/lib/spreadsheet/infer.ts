import type { ColumnAnalysis, DetectedType, CellValue, ParsedSheet } from "./types";
import { EMAIL_RE, PHONE_MIN_DIGITS, PHONE_RE } from "@/lib/validation/patterns";

const SAMPLE_LIMIT = 2000;
export const INFER_SAMPLE_LIMIT = SAMPLE_LIMIT;

const URL_RE = /^(https?:\/\/|www\.)[^\s]+$/i;

const CURRENCY_HINT =
  /price|cost|amount|revenue|salary|total|value|budget|fee|balance|due|paid|income|profit|loss|usd|eur|gbp|\$|€|£/i;
const PERCENT_HINT = /percent|percentage|rate|ratio|share|growth|margin|tax|\b pct\b|%/i;
const STATUS_HINT = /status|state|stage|condition|phase|approval|progress/i;
const ID_HINT = /(^|[\s_\-])(id|key|code|sku|ref|reference|uuid|guid|number|no|nr|#)$/i;
const PHONE_HINT = /phone|mobile|cell|tel|fax|contact\s*(no|number)/i;
const NAME_HINT =
  /(name|title|label|customer|client|company|vendor|supplier|contact|product|item|employee|project|account|order)/i;

const CURRENCY_SYMBOL = /[$€£¥₹]/;

const DATE_LIKE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?|^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
const MONTH_NAME =
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4}/i;

export function headerToKey(header: string, taken: Set<string>): string {
  let key = header
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/^(\d)/, "_$1");
  if (!key) key = "field";
  let candidate = key;
  let i = 2;
  while (taken.has(candidate)) candidate = `${key}_${i++}`;
  taken.add(candidate);
  return candidate;
}

interface NumericParse {
  value: number;
  hadCurrency: boolean;
  isPercent: boolean;
}

export function parseNumericValue(raw: string): NumericParse | null {
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  const hadCurrency =
    CURRENCY_SYMBOL.test(s) || /(^|\s)(usd|eur|gbp|inr)(\s|$)/i.test(s);
  s = s
    .replace(/[$€£¥₹]/g, "")
    .replace(/,/g, "")
    .replace(/\s*(usd|eur|gbp|inr)\s*$/i, "")
    .trim();
  const isPercent = s.endsWith("%");
  if (isPercent) s = s.slice(0, -1).trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return { value: negative ? -n : n, hadCurrency, isPercent };
}

export function looksLikeDate(raw: string): { hasTime: boolean } | null {
  const s = raw.trim();
  if (!s || s.length < 6 || s.length > 40) return null;
  if (!DATE_LIKE.test(s) && !MONTH_NAME.test(s)) return null;
  const hasTime = /\d{1,2}:\d{2}/.test(s);
  const parsed = Date.parse(s);
  if (Number.isNaN(parsed)) return null;
  const year = new Date(parsed).getFullYear();
  if (year < 1900 || year > 2200) return null;
  return { hasTime };
}

function normalizeValue(v: CellValue): string {
  if (v === null) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v).trim();
}

function isCodeLike(values: string[]): boolean {
  if (!values.length) return false;
  let codeLike = 0;
  for (const v of values) {
    if (/^[A-Za-z0-9][A-Za-z0-9._\-#/]*$/.test(v) && /\d/.test(v)) codeLike++;
    else if (/^\d{4,}$/.test(v)) codeLike++;
  }
  return codeLike / values.length >= 0.7;
}

/** Infers the type and statistics of a single column. */
export function analyzeColumn(
  sheet: ParsedSheet,
  index: number,
  header: string,
  key: string
): ColumnAnalysis {
  const values: string[] = [];
  let empty = 0;
  const unique = new Set<string>();
  // First-seen original casing per normalized value, so enum options keep
  // the user's casing ("Active", not "active") while counting stays normalized.
  const originalByLower = new Map<string, string>();
  let numericCount = 0;
  let currencyHint = false;
  let percentHint = false;
  let dateCount = 0;
  let dateTimeCount = 0;
  let emailCount = 0;
  let phoneCount = 0;
  let urlCount = 0;
  let booleanCount = 0;
  let dateNumericCount = 0;

  const step = Math.max(1, Math.floor(sheet.rows.length / SAMPLE_LIMIT));
  let scanned = 0;
  for (let r = 0; r < sheet.rows.length; r += step) {
    const row = sheet.rows[r];
    const raw = row?.[index] ?? null;
    const text = normalizeValue(raw);
    scanned++;
    if (!text) {
      empty++;
      continue;
    }
    if (values.length < 400) values.push(text);
    const lowered = text.toLowerCase();
    if (!originalByLower.has(lowered)) originalByLower.set(lowered, text);
    unique.add(lowered);

    if (typeof raw === "boolean" || /^(true|false)$/i.test(text)) booleanCount++;

    // EMAIL_RE requires "@" — skip the regex entirely for values without one.
    if (text.includes("@") && EMAIL_RE.test(text)) emailCount++;
    if (URL_RE.test(text)) urlCount++;
    if (PHONE_RE.test(text) && (text.match(/\d/g) ?? []).length >= PHONE_MIN_DIGITS) phoneCount++;

    const asNumber = parseNumericValue(text);
    if (asNumber) {
      numericCount++;
      if (asNumber.hadCurrency) currencyHint = true;
      if (asNumber.isPercent) percentHint = true;
    }

    const dateInfo = looksLikeDate(text);
    if (dateInfo) {
      dateCount++;
      if (dateInfo.hasTime) dateTimeCount++;
    } else if (asNumber && asNumber.value > 20000 && asNumber.value < 60000) {
      // Possible Excel serial date (1900-based), only trusted with a date-ish header.
      if (/date|day|month|year|time|created|updated|due|joined|birth/i.test(header)) {
        dateNumericCount++;
      }
    }
  }

  // Normalize counts against the sampled rows (empty counted during scan).
  const total = scanned || 1;
  const filled = total - empty;
  const uniqueCount = unique.size;
  const emptyRatio = empty / total;

  const sampleRatios = (count: number) => (filled ? count / total : 0);

  let type: DetectedType = "text";
  let confidence = 0.5;

  const enumCandidates = [...originalByLower.values()];
  const isSmallSet =
    uniqueCount > 0 &&
    uniqueCount <= 15 &&
    filled >= 5 &&
    uniqueCount <= Math.max(3, Math.floor(filled * 0.6));

  if (filled === 0) {
    type = "text";
    confidence = 1;
  } else if (sampleRatios(booleanCount) >= 0.9 && enumCandidates.every((v) => /^(true|false|yes|no|y|n)$/i.test(v))) {
    type = "boolean";
    confidence = sampleRatios(booleanCount);
  } else if (sampleRatios(emailCount) >= 0.9) {
    type = "email";
    confidence = sampleRatios(emailCount);
  } else if (sampleRatios(urlCount) >= 0.9) {
    type = "url";
    confidence = sampleRatios(urlCount);
  } else if (
    (sampleRatios(phoneCount) >= 0.9 &&
      !sampleRatios(numericCount) &&
      sampleRatios(dateCount) < 0.8) ||
    (PHONE_HINT.test(header) && sampleRatios(phoneCount) >= 0.6)
  ) {
    type = "phone";
    confidence = sampleRatios(phoneCount);
  } else if (sampleRatios(dateCount) >= 0.8 || sampleRatios(dateNumericCount) >= 0.8) {
    type = dateTimeCount > dateCount * 0.3 ? "datetime" : "date";
    confidence = Math.max(sampleRatios(dateCount), sampleRatios(dateNumericCount));
  } else if (sampleRatios(numericCount) >= 0.85) {
    if (CURRENCY_HINT.test(header) || (currencyHint && !percentHint)) {
      type = "currency";
      confidence = Math.max(0.6, sampleRatios(numericCount));
    } else if (percentHint || PERCENT_HINT.test(header)) {
      type = "percent";
      confidence = Math.max(0.6, sampleRatios(numericCount));
    } else {
      type = "number";
      confidence = sampleRatios(numericCount);
    }
  } else if (
    isSmallSet &&
    uniqueCount >= 2 &&
    !EMAIL_RE.test(enumCandidates[0] ?? "") &&
    (!NAME_HINT.test(header) || STATUS_HINT.test(header)) &&
    (uniqueCount <= 5 || uniqueCount < filled * 0.7)
  ) {
    type = "enum";
    confidence = 0.85;
  } else if (
    (ID_HINT.test(header) || /(^|[\s_\-])(id)$/i.test(header.trim())) &&
    uniqueCount === filled &&
    filled > 0
  ) {
    type = "identifier";
    confidence = 0.95;
  } else if (filled >= 10 && uniqueCount / filled >= 0.98 && isCodeLike(values)) {
    type = "identifier";
    confidence = 0.8;
  } else {
    const lengths = values.map((v) => v.length);
    const maxLen = lengths.length ? Math.max(...lengths) : 0;
    const avgLen = lengths.length
      ? lengths.reduce((a, b) => a + b, 0) / lengths.length
      : 0;
    if (maxLen > 140 || avgLen > 70) {
      type = "long_text";
      confidence = 0.75;
    } else {
      type = "text";
      confidence = 0.7;
    }
  }

  const likelyIdentifier = type === "identifier";
  const possibleStatus =
    (type === "enum" || type === "boolean") &&
    (STATUS_HINT.test(header) ||
      enumCandidates.some((v) =>
        /^(active|inactive|pending|completed|cancelled|canceled|approved|rejected|open|closed|new|paid|unpaid|paid|overdue|in progress|done|shipped|delivered)$/i.test(
          v
        )
      ));

  const analysis: ColumnAnalysis = {
    index,
    name: header,
    key,
    type,
    sampleValues: values.slice(0, 5),
    filled,
    empty,
    uniqueCount,
    duplicateCount: Math.max(filled - uniqueCount, 0),
    emptyRatio: Number(emptyRatio.toFixed(4)),
    invalidEmailCount: type === "email" ? filled - emailCount : 0,
    invalidDateCount:
      type === "date" || type === "datetime"
        ? Math.max(filled - dateCount - dateNumericCount, 0)
        : 0,
    likelyIdentifier,
    possibleStatus,
    confidence: Number(confidence.toFixed(2)),
  };

  if (type === "enum") {
    analysis.enumValues = enumCandidates.sort().slice(0, 15);
  }

  return analysis;
}

/** Detects whether an enum column contains inconsistent casing/spacing variants. */
export function findInconsistentVariants(
  sheet: ParsedSheet,
  columnIndex: number
): { variants: string[]; extraCount: number; rows: number[] } | null {
  const byNormalized = new Map<string, { values: Set<string>; rows: number[] }>();
  sheet.rows.forEach((row, r) => {
    const v = normalizeValue(row?.[columnIndex] ?? null);
    if (!v) return;
    const norm = v.toLowerCase().replace(/\s+/g, " ");
    const entry = byNormalized.get(norm) ?? { values: new Set<string>(), rows: [] };
    entry.values.add(v);
    if (entry.rows.length < 20) entry.rows.push(r + 2); // excel row number
    byNormalized.set(norm, entry);
  });
  let extraCount = 0;
  const variants: string[] = [];
  const rows: number[] = [];
  for (const entry of byNormalized.values()) {
    if (entry.values.size > 1) {
      extraCount += entry.values.size - 1;
      for (const v of entry.values) variants.push(v);
      rows.push(...entry.rows);
    }
  }
  if (!variants.length) return null;
  return { variants: variants.slice(0, 20), extraCount, rows: rows.slice(0, 20) };
}
