import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildDeterministicSchema, schemaSuggestionSchema, generateSchemaSuggestion } from "@/lib/ai";
import { analyzeWorkbook, parseWorkbook } from "@/lib/spreadsheet";
import type { SpreadsheetAnalysis } from "@/lib/spreadsheet/types";

function buildXlsx(sheets: Record<string, unknown[][]>): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
}

const analysis: SpreadsheetAnalysis = {
  fileName: "customers.xlsx",
  fileSize: 2048,
  fileKind: "xlsx",
  sheetCount: 1,
  totalRows: 6,
  totalColumns: 4,
  sheets: [
    {
      name: "Customers",
      rowCount: 6,
      columnCount: 4,
      duplicateRowCount: 0,
      emptyColumnCount: 0,
      formulas: [],
      columns: [
        { index: 0, name: "Customer Name", key: "customer_name", type: "text", sampleValues: ["Acme"], filled: 6, empty: 0, uniqueCount: 6, duplicateCount: 0, emptyRatio: 0, invalidEmailCount: 0, invalidDateCount: 0, likelyIdentifier: false, possibleStatus: false, confidence: 0.7 },
        { index: 1, name: "Email", key: "email", type: "email", sampleValues: ["a@b.co"], filled: 6, empty: 0, uniqueCount: 6, duplicateCount: 0, emptyRatio: 0, invalidEmailCount: 0, invalidDateCount: 0, likelyIdentifier: false, possibleStatus: false, confidence: 0.9 },
        { index: 2, name: "Amount", key: "amount", type: "currency", sampleValues: ["100"], filled: 6, empty: 0, uniqueCount: 5, duplicateCount: 1, emptyRatio: 0, invalidEmailCount: 0, invalidDateCount: 0, likelyIdentifier: false, possibleStatus: false, confidence: 0.8 },
        { index: 3, name: "Status", key: "status", type: "enum", sampleValues: ["Active"], filled: 6, empty: 0, uniqueCount: 2, duplicateCount: 4, emptyRatio: 0, invalidEmailCount: 0, invalidDateCount: 0, likelyIdentifier: false, possibleStatus: true, enumValues: ["Active", "Lead"], confidence: 0.85 },
      ],
    },
  ],
  relationships: [],
  duplicates: [],
  health: [],
  warnings: [],
  analyzedAt: new Date().toISOString(),
};

describe("deterministic schema generation", () => {
  it("produces a schema that passes strict validation", () => {
    const suggestion = buildDeterministicSchema(analysis);
    const parsed = schemaSuggestionSchema.parse(suggestion);

    expect(parsed.name).toBeTruthy();
    expect(parsed.tables).toHaveLength(1);
    const table = parsed.tables[0];
    expect(table.label).toBe("Customers");
    expect(table.singularLabel).toBe("Customer");
    expect(table.fields.map((f) => f.type)).toEqual(["TEXT", "EMAIL", "CURRENCY", "ENUM"]);
    expect(table.fields.filter((f) => f.isTitle)).toHaveLength(1);
    expect(table.fields.find((f) => f.key === "status")?.options).toEqual(
      ["Active", "Lead"]
    );
    expect(table.fields[0].required).toBe(true);
    expect(table.fields[1].key).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("falls back to deterministic when no AI key is configured", async () => {
    const result = await generateSchemaSuggestion(analysis, "customer directory");
    expect(result.provider).toBe("deterministic");
    expect(() => schemaSuggestionSchema.parse(result.suggestion)).not.toThrow();
  });
});

describe("normalized multi-entity schema (app.txt §8)", () => {
  function threeSheetAnalysis(): SpreadsheetAnalysis {
    const ids = ["C-001", "C-002", "C-003", "C-004", "C-005", "C-006"];
    const bytes = buildXlsx({
      Customers: [
        ["Customer ID", "Company", "Email", "Status"],
        ...ids.map((id, i) => [id, `Company ${i}`, `c${i}@example.com`, i % 2 ? "Lead" : "Active"]),
      ],
      Products: [
        ["Product ID", "Name", "SKU", "Price", "Stock"],
        ...ids.map((id, i) => [`P-00${i}`, `Widget ${i}`, `SKU-${i}`, (i + 1) * 10, (i + 1) * 5]),
      ],
      Orders: [
        ["Order ID", "Customer", "Product", "Quantity", "Amount", "Status"],
        ...ids.map((id, i) => [`O-00${i}`, id, `P-00${i}`, i + 1, (i + 1) * 100, "New"]),
      ],
    });
    const workbook = parseWorkbook(bytes, "shop.xlsx", bytes.length, "xlsx");
    return analyzeWorkbook(workbook);
  }

  it("produces one normalized entity per sheet, linked by FK relationships", () => {
    const suggestion = buildDeterministicSchema(threeSheetAnalysis());
    const parsed = schemaSuggestionSchema.parse(suggestion);

    expect(parsed.tables.map((t) => t.label).sort()).toEqual(
      ["Customers", "Orders", "Products"].sort()
    );

    const orders = parsed.tables.find((t) => t.label === "Orders")!;
    const customers = parsed.tables.find((t) => t.label === "Customers")!;
    const products = parsed.tables.find((t) => t.label === "Products")!;

    // FK columns survive as fields on the many side.
    expect(orders.fields.some((f) => f.key === "customer")).toBe(true);
    expect(orders.fields.some((f) => f.key === "product")).toBe(true);

    // Detected relationships reference real tables/fields on both ends.
    expect(parsed.relationships.length).toBeGreaterThanOrEqual(2);
    const tableKeys = new Set(parsed.tables.map((t) => t.key));
    const fieldKeys = new Set(
      parsed.tables.flatMap((t) => t.fields.map((f) => `${t.key}.${f.key}`))
    );
    for (const rel of parsed.relationships) {
      expect(tableKeys.has(rel.fromTableKey)).toBe(true);
      expect(tableKeys.has(rel.toTableKey)).toBe(true);
      expect(fieldKeys.has(`${rel.fromTableKey}.${rel.fromFieldKey}`)).toBe(true);
    }
    const targets = parsed.relationships.map((r) => r.toTableKey);
    expect(targets).toContain(customers.key);
    expect(targets).toContain(products.key);

    // Every table keeps a single title field and its row count.
    for (const table of parsed.tables) {
      expect(table.fields.filter((f) => f.isTitle)).toHaveLength(1);
      expect(table.recordCount).toBe(6);
    }
  });
});

