import { describe, expect, it } from "vitest";
import { mergeRecordData } from "@/lib/data/duplicates";
import { normalizeDuplicateKey } from "@/lib/spreadsheet/duplicates";

describe("normalizeDuplicateKey (app.txt §17)", () => {
  it("treats case and spacing variants as identical", () => {
    expect(normalizeDuplicateKey("John Smith")).toBe(normalizeDuplicateKey("john smith"));
    expect(normalizeDuplicateKey("  John   Smith ")).toBe("john smith");
  });

  it("strips corporate suffixes so Acme variants match", () => {
    const a = normalizeDuplicateKey("Acme Inc.");
    expect(a).toBe(normalizeDuplicateKey("ACME INC"));
    expect(a).toBe(normalizeDuplicateKey("Acme Incorporated"));
    expect(a).toBe("acme");
  });
});

describe("mergeRecordData (app.txt §17)", () => {
  it("keeps the master values and backfills blanks from the others", () => {
    const merged = mergeRecordData([
      { data: { name: "Acme Co", email: "", revenue: 12400 } },
      { data: { name: "ACME INC", email: "ap@acme.com", revenue: null } },
    ]);
    expect(merged).toEqual({ name: "Acme Co", email: "ap@acme.com", revenue: 12400 });
  });

  it("ignores whitespace-only values when backfilling", () => {
    const merged = mergeRecordData([
      { data: { name: "  ", status: "Active" } },
      { data: { name: "Globex", status: "" } },
    ]);
    expect(merged).toEqual({ name: "Globex", status: "Active" });
  });
});
