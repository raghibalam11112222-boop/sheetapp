import * as XLSX from "xlsx";
import type { GeneratedField } from "@/generated/prisma/client";

/**
 * Builds an .xlsx workbook for record export (app.txt §23 "Export Excel").
 * Values pass through the same formula-injection neutralization as CSV so a
 * leading `=cmd|...` can never become a live formula when opened in Excel.
 */
export function toXlsx(
  fields: Pick<GeneratedField, "name" | "label">[],
  rows: Record<string, unknown>[],
  sheetName = "Records"
): Buffer {
  const data: (string | number)[][] = [
    fields.map((f) => f.label),
    ...rows.map((row) =>
      fields.map((f) => {
        const value = row[f.name];
        if (value === null || value === undefined) return "";
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
        const text = value instanceof Date ? value.toISOString() : String(value);
        // Neutralize formula injection the same way CSV export does.
        return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
      })
    ),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = fields.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || "Records");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as ArrayBuffer);
}
