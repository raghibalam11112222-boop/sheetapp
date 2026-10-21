import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { analyzeWorkbook, parseWorkbook } from "@/lib/spreadsheet";
import { buildPromptPayload } from "@/lib/ai/provider";
import type { SpreadsheetAnalysis } from "@/lib/spreadsheet/types";

function buildXlsx(sheets: Record<string, unknown[][]>): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Uint8Array(out);
}

function analyze(sheets: Record<string, unknown[][]>) {
  const bytes = buildXlsx(sheets);
  const workbook = parseWorkbook(bytes, "test.xlsx", bytes.length, "xlsx");
  return analyzeWorkbook(workbook);
}

describe("analysis engine — spec extraction list (app.txt §7)", () => {
  it("matches the documented Customers example (identifier/text/currency/enum)", () => {
    const analysis = analyze({
      Customers: [
        ["Customer ID", "Company", "Revenue", "Status"],
        ["C-001", "Acme Corp", 1200.5, "Active"],
        ["C-002", "Globex", 900, "Lead"],
        ["C-003", "Initech", 450.25, "Active"],
        ["C-004", "Umbrella", 300, "Churned"],
        ["C-005", "Stark Industries", 2500, "Active"],
        ["C-006", "Wayne Enterprises", 1800, "Lead"],
      ],
    });

    const sheet = analysis.sheets[0];
    expect(sheet.name).toBe("Customers");
    expect(sheet.rowCount).toBe(6);
    const byName = (name: string) => sheet.columns.find((c) => c.name === name)!;

    expect(byName("Customer ID").type).toBe("identifier");
    expect(byName("Customer ID").likelyIdentifier).toBe(true);
    expect(byName("Company").type).toBe("text");
    expect(byName("Revenue").type).toBe("currency");
    expect(byName("Status").type).toBe("enum");
    expect(byName("Status").possibleStatus).toBe(true);
    expect(byName("Status").enumValues).toEqual(
      expect.arrayContaining(["Active", "Lead", "Churned"])
    );
  });

  it("detects phone columns and all-empty columns", () => {
    const analysis = analyze({
      Contacts: [
        ["Name", "Phone", "Legacy"],
        ["Amy", "+1 (555) 123-4567", ""],
        ["Bob", "+44 20 7946 0958", ""],
        ["Cyd", "+1-555-987-6543", ""],
        ["Dan", "+49 30 12345678", ""],
        ["Eve", "+1 (555) 222-3333", ""],
        ["Fin", "+33 1 23 45 67 89", ""],
      ],
    });

    const sheet = analysis.sheets[0];
    const phone = sheet.columns.find((c) => c.name === "Phone")!;
    expect(phone.type).toBe("phone");
    expect(sheet.emptyColumnCount).toBe(1);
    expect(sheet.columns.find((c) => c.name === "Legacy")!.emptyRatio).toBe(1);
    expect(
      analysis.health.some((h) => h.category === "unused_columns")
    ).toBe(true);
  });

  it("captures formulas as text without evaluating them, and flags broken ones", () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Item", "Qty", "Price", "Line Total", "Notes"],
      ["Widget", 2, 10, 20, "ok"],
      ["Gadget", 3, 5, 15, "#DIV/0!"],
      ["Sprocket", 1, 7, 7, "ok"],
      ["Cog", 4, 2, 8, "ok"],
      ["Gear", 5, 3, 15, "ok"],
      ["Spring", 6, 1, 6, "ok"],
    ]);
    ws["D2"] = { t: "n", f: "B2*C2", v: 20 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OrderLines");
    const bytes = new Uint8Array(
      XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
    );

    const workbook = parseWorkbook(bytes, "order.xlsx", bytes.length, "xlsx");
    const analysis = analyzeWorkbook(workbook);
    const sheet = analysis.sheets[0];

    // The live formula is recorded as text; the cached value stays a plain number.
    const live = sheet.formulas.find((f) => f.formula === "=B2*C2");
    expect(live).toBeDefined();
    // "Total" in the header marks it currency; the key point is it stays numeric.
    expect(["number", "currency"]).toContain(
      sheet.columns.find((c) => c.name === "Line Total")!.type
    );

    // The error cell is flagged and surfaced as a health finding.
    expect(sheet.formulas.some((f) => f.error === "#DIV/0!")).toBe(true);
    expect(
      analysis.health.some((h) => h.category === "broken_formulas" && h.severity === "error")
    ).toBe(true);
  });

  it("counts malformed emails and dates for the pre-import issues panel", () => {
    const emails = ["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com", "f@x.com", "g@x.com", "h@x.com", "i@x.com", "not-an-email"];
    const dates = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08", "someday", "never"];
    const analysis = analyze({
      Mixed: [
        ["Email", "Ordered"],
        ...emails.map((email, i) => [email, dates[i]]),
      ],
    });
    const sheet = analysis.sheets[0];
    const email = sheet.columns.find((c) => c.name === "Email")!;
    const ordered = sheet.columns.find((c) => c.name === "Ordered")!;
    expect(email.type).toBe("email");
    expect(email.invalidEmailCount).toBe(1);
    expect(ordered.type).toBe("date");
    expect(ordered.invalidDateCount).toBe(2);
  });

  it("suggests cross-sheet relationships from overlapping ID columns", () => {
    const ids = ["C-001", "C-002", "C-003", "C-004", "C-005", "C-006"];
    const analysis = analyze({
      Customers: [
        ["Customer ID", "Company"],
        ...ids.map((id, i) => [id, `Company ${i}`]),
      ],
      Orders: [
        ["Order ID", "Customer", "Total"],
        ...ids.map((id, i) => [`O-${i}`, id, (i + 1) * 100]),
      ],
    });

    expect(analysis.relationships.length).toBeGreaterThan(0);
    const rel = analysis.relationships.find(
      (r) => r.fromSheet === "Orders" && r.fromColumn === "Customer"
    )!;
    expect(rel).toBeDefined();
    expect(rel.toSheet).toBe("Customers");
    expect(rel.toColumn).toBe("Customer ID");
    expect(rel.confidence).toBeGreaterThanOrEqual(0.6);
  });
});

describe("AI prompt payload privacy (app.txt §7)", () => {
  function bigAnalysis(): SpreadsheetAnalysis {
    const rows: unknown[][] = [["Note", "Tag"]];
    for (let i = 0; i < 100; i++) {
      rows.push([i === 90 ? "SENTINEL-SECRET-XYZ" : `note ${i}`, `tag-${i % 12}`]);
    }
    const bytes = buildXlsx({ Secrets: rows });
    const workbook = parseWorkbook(bytes, "secrets.xlsx", bytes.length, "xlsx");
    const analysis = analyzeWorkbook(workbook);
    // Force more relationships than the payload cap allows.
    analysis.relationships = Array.from({ length: 12 }, (_, i) => ({
      fromSheet: "Secrets",
      fromColumn: "Note",
      toSheet: `Other${i}`,
      toColumn: "Note",
      confidence: 0.9,
      reason: "test",
    }));
    return analysis;
  }

  it("never sends full row data to the AI provider", () => {
    const payload = buildPromptPayload({ analysis: bigAnalysis() });
    const serialized = JSON.stringify(payload);

    // A secret buried in row 90 must not appear anywhere in the payload.
    expect(serialized).not.toContain("SENTINEL-SECRET-XYZ");

    for (const sheet of payload.sheets) {
      for (const column of sheet.columns) {
        expect(column.samples.length).toBeLessThanOrEqual(3);
        if (column.enumValues) expect(column.enumValues.length).toBeLessThanOrEqual(10);
      }
    }
    expect(payload.detectedRelationships.length).toBeLessThanOrEqual(10);
    // No raw row arrays or cell matrices leave the server.
    expect(serialized).not.toContain("\"rows\":[");
    expect(payload).toHaveProperty("file", "secrets.xlsx");
  });
});
