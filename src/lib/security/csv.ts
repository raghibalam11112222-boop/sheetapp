import type { GeneratedField } from "@prisma/client";

/**
 * Escapes a CSV cell and neutralizes spreadsheet formula injection
 * (app.txt §25 "Prevent formula injection on export").
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(
  fields: GeneratedField[],
  rows: Record<string, unknown>[]
): string {
  const header = fields.map((f) => escapeCsvCell(f.label)).join(",");
  const body = rows.map((row) =>
    fields.map((f) => escapeCsvCell(row[f.name])).join(",")
  );
  return ["﻿", [header, ...body].join("\r\n")].join("");
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
