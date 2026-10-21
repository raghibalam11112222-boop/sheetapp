import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAICompatibleProvider } from "@/lib/ai/provider";
import { buildDeterministicSchema } from "@/lib/ai/deterministic";
import { schemaSuggestionSchema } from "@/lib/ai/types";
import type { SpreadsheetAnalysis } from "@/lib/spreadsheet/types";

function analysis(): SpreadsheetAnalysis {
  return {
    fileName: "orders.xlsx",
    fileSize: 1024,
    fileKind: "xlsx",
    sheetCount: 1,
    totalRows: 3,
    totalColumns: 3,
    sheets: [
      {
        name: "Orders",
        rowCount: 3,
        columnCount: 3,
        duplicateRowCount: 0,
        emptyColumnCount: 0,
        formulas: [],
        columns: [
          { index: 0, name: "Order ID", key: "order_id", type: "identifier", sampleValues: ["O-1"], filled: 3, empty: 0, uniqueCount: 3, duplicateCount: 0, emptyRatio: 0, invalidEmailCount: 0, invalidDateCount: 0, likelyIdentifier: true, possibleStatus: false, confidence: 0.95 },
          { index: 1, name: "Amount", key: "amount", type: "currency", sampleValues: ["100"], filled: 3, empty: 0, uniqueCount: 3, duplicateCount: 0, emptyRatio: 0, invalidEmailCount: 0, invalidDateCount: 0, likelyIdentifier: false, possibleStatus: false, confidence: 0.9 },
          { index: 2, name: "Status", key: "status", type: "enum", sampleValues: ["New"], filled: 3, empty: 0, uniqueCount: 2, duplicateCount: 1, emptyRatio: 0, invalidEmailCount: 0, invalidDateCount: 0, likelyIdentifier: false, possibleStatus: true, enumValues: ["New", "Paid"], confidence: 0.85 },
        ],
      },
    ],
    relationships: [],
    duplicates: [],
    health: [],
    warnings: [],
    analyzedAt: new Date().toISOString(),
  };
}

function provider() {
  return new OpenAICompatibleProvider({
    apiKey: "test-key",
    baseUrl: "https://ai.example.test/v1",
    model: "test-model",
  });
}

function chatResponse(content: string) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AI failure handling (app.txt §38)", () => {
  it("falls back to deterministic when the provider returns garbage twice", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => chatResponse("not json at all")));
    const result = await provider().analyzeSchema({ analysis: analysis() });
    const baseline = buildDeterministicSchema(analysis());
    expect(result).toEqual(baseline);
    expect(() => schemaSuggestionSchema.parse(result)).not.toThrow();
  });

  it("falls back when the provider is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("socket hang up");
    }));
    const result = await provider().analyzeSchema({ analysis: analysis() });
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].fields.map((f) => f.key)).toEqual([
      "order_id",
      "amount",
      "status",
    ]);
  });

  it("restores dropped columns and rejects invented tables", async () => {
    const hostile = {
      name: "Shop",
      description: "x",
      tables: [
        {
          key: "orders",
          label: "Orders",
          singularLabel: "Order",
          sourceSheet: "Orders",
          fields: [
            // amount column deliberately dropped, plus an invented table below
            { key: "order_id", label: "Order ID", type: "IDENTIFIER", required: true, unique: true, isTitle: false, sourceColumnIndex: 0 },
            { key: "status", label: "Status", type: "ENUM", required: false, unique: false, isTitle: true, options: ["New", "Paid"], sourceColumnIndex: 2 },
          ],
          recordCount: 3,
        },
        {
          key: "inventory",
          label: "Inventory",
          singularLabel: "Inventory",
          sourceSheet: "Warehouse",
          fields: [
            { key: "sku", label: "SKU", type: "TEXT", required: true, unique: true, isTitle: true, sourceColumnIndex: 0 },
          ],
          recordCount: 9,
        },
      ],
      relationships: [],
      rationale: "trust me",
    };
    vi.stubGlobal("fetch", vi.fn(async () => chatResponse(JSON.stringify(hostile))));
    const result = await provider().analyzeSchema({ analysis: analysis() });
    // dropped column restored from deterministic facts…
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].fields.map((f) => f.key)).toEqual(["order_id", "amount", "status"]);
    // …invented table discarded…
    expect(result.tables[0].sourceSheet).toBe("Orders");
    // …AI labels kept where valid, title rule enforced.
    expect(result.tables[0].fields.filter((f) => f.isTitle)).toHaveLength(1);
    expect(() => schemaSuggestionSchema.parse(result)).not.toThrow();
  });

  it("uses deterministic types when AI invents an invalid field type", async () => {
    const badType = {
      name: "Shop",
      description: "x",
      tables: [
        {
          key: "orders",
          label: "Orders",
          singularLabel: "Order",
          sourceSheet: "Orders",
          fields: [
            { key: "order_id", label: "Order ID", type: "IDENTIFIER", required: true, unique: true, isTitle: false, sourceColumnIndex: 0 },
            { key: "amount", label: "Amount", type: "MONEY", required: false, unique: false, isTitle: false, sourceColumnIndex: 1 },
            { key: "status", label: "Status", type: "ENUM", required: false, unique: false, isTitle: true, options: ["New", "Paid"], sourceColumnIndex: 2 },
          ],
          recordCount: 3,
        },
      ],
      relationships: [],
    };
    vi.stubGlobal("fetch", vi.fn(async () => chatResponse(JSON.stringify(badType))));
    const result = await provider().analyzeSchema({ analysis: analysis() });
    // "MONEY" is not a valid type: strict validation fails, so the
    // deterministic inference (CURRENCY) survives untouched.
    expect(result.tables[0].fields.find((f) => f.key === "amount")?.type).toBe("CURRENCY");
    expect(() => schemaSuggestionSchema.parse(result)).not.toThrow();
  });

  it("repairs a fenced response before validating", async () => {
    const baseline = buildDeterministicSchema(analysis());
    const fenced = "```json\n" + JSON.stringify({ ...baseline, rationale: "ok" }) + "\n```";
    vi.stubGlobal("fetch", vi.fn(async () => chatResponse(fenced)));
    const result = await provider().analyzeSchema({ analysis: analysis() });
    expect(result.tables).toHaveLength(1);
    expect(() => schemaSuggestionSchema.parse(result)).not.toThrow();
  });
});
