import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { analyzeWorkbook, parseWorkbook } from "@/lib/spreadsheet";
import { transformRow, type TransformContext } from "@/lib/generation/import";
import type { GeneratedField } from "@prisma/client";

function sheetCtx(columns: string[], mode: TransformContext["mode"] = "fix"): TransformContext {
  const bytes = (() => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([columns, ["x"]]),
      "S"
    );
    return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
  })();
  const workbook = parseWorkbook(bytes, "t.xlsx", bytes.length, "xlsx");
  const [sheet] = analyzeWorkbook(workbook).sheets;
  return { sheet, issues: new Map(), mode };
}

function field(partial: Partial<GeneratedField> & { name: string; type: GeneratedField["type"] }): GeneratedField {
  return {
    id: `f_${partial.name}`,
    tableId: "t1",
    position: 0,
    label: partial.name,
    required: false,
    unique: false,
    isTitle: false,
    options: [],
    ...partial,
  } as GeneratedField;
}

describe("transformRow import coercion", () => {
  it("matches enum options case-insensitively and stores the canonical option", () => {
    const ctx = sheetCtx(["Status"]);
    const { data, drop } = transformRow(
      [field({ name: "status", type: "ENUM", position: 0, options: ["Active", "Churned"] })],
      ["active"],
      ctx,
      2
    );
    expect(drop).toBe(false);
    expect(data["status"]).toBe("Active");
  });

  it("flags invalid enum values but keeps the row in fix mode", () => {
    const ctx = sheetCtx(["Status"], "fix");
    const { data, drop } = transformRow(
      [field({ name: "status", type: "ENUM", position: 0, options: ["Active"] })],
      ["Mystery"],
      ctx,
      2
    );
    expect(drop).toBe(false);
    expect(data["status"]).toBeNull();
    expect([...ctx.issues.values()].some((i) => i.code === "invalid_enum")).toBe(true);
  });

  it("drops invalid rows in skip mode and keeps raw text in raw mode", () => {
    const skipCtx = sheetCtx(["Amount"], "skip");
    const skipped = transformRow(
      [field({ name: "amount", type: "NUMBER", position: 0 })],
      ["not-a-number"],
      skipCtx,
      2
    );
    expect(skipped.drop).toBe(true);

    const rawCtx = sheetCtx(["Amount"], "raw");
    const kept = transformRow(
      [field({ name: "amount", type: "NUMBER", position: 0 })],
      ["not-a-number"],
      rawCtx,
      2
    );
    expect(kept.drop).toBe(false);
    expect(kept.data["amount"]).toBe("not-a-number");
  });

  it("marks rows missing required values without dropping them in fix mode", () => {
    const ctx = sheetCtx(["Email", "Name"], "fix");
    const { data, drop } = transformRow(
      [
        field({ name: "email", type: "EMAIL", position: 0, required: true }),
        field({ name: "name", type: "TEXT", position: 1 }),
      ],
      ["", "Amy"],
      ctx,
      2
    );
    expect(drop).toBe(false);
    expect(data["email"]).toBeNull();
    expect(data["name"]).toBe("Amy");
    expect([...ctx.issues.values()].some((i) => i.code === "missing_required")).toBe(true);
  });

  it("drops fully empty rows in every mode", () => {
    for (const mode of ["fix", "skip", "raw"] as const) {
      const ctx = sheetCtx(["Name"], mode);
      const { drop } = transformRow(
        [field({ name: "name", type: "TEXT", position: 0 })],
        [""],
        ctx,
        2
      );
      expect(drop).toBe(true);
    }
  });
});
