import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  FileValidationError,
  MAX_FILE_BYTES,
  analyzeWorkbook,
  parseWorkbook,
  UploadedFileSource,
  validateSpreadsheetFile,
} from "@/lib/spreadsheet";

function buildXlsx(rows: unknown[][]): Uint8Array {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customers");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Uint8Array(out);
}

describe("validateSpreadsheetFile", () => {
  it("rejects unsupported extensions", () => {
    expect(() => validateSpreadsheetFile("report.pdf", 100, new Uint8Array(10))).toThrow(
      FileValidationError
    );
  });

  it("rejects files over the size cap", () => {
    expect(() =>
      validateSpreadsheetFile("big.xlsx", MAX_FILE_BYTES + 1, new Uint8Array(10))
    ).toThrow(/too large/i);
  });

  it("rejects an .xlsx whose magic bytes are not a zip", () => {
    expect(() =>
      validateSpreadsheetFile("fake.xlsx", 10, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))
    ).toThrow(/valid XLSX/i);
  });

  it("accepts a real xlsx payload", () => {
    const bytes = buildXlsx([["Name"], ["Acme"]]);
    expect(validateSpreadsheetFile("customers.xlsx", bytes.length, bytes)).toBe("xlsx");
  });

  it("accepts plain csv and rejects binary csv", () => {
    const text = new TextEncoder().encode("name,amount\nAcme,10\n");
    expect(validateSpreadsheetFile("data.csv", text.length, text)).toBe("csv");

    const binary = new Uint8Array([0x61, 0x00, 0x62, 0x00]);
    expect(() => validateSpreadsheetFile("data.csv", binary.length, binary)).toThrow(/CSV/i);
  });
});

describe("parseWorkbook + analyzeWorkbook", () => {
  it("parses a workbook and infers column types", () => {
    const bytes = buildXlsx([
      ["Name", "Email", "Amount", "Status", "Signed Up", "Active"],
      ["Acme Corp", "billing@acme.com", 1200.5, "Active", "2026-01-15", true],
      ["Globex", "ap@globex.io", 900, "Lead", "2026-02-20", false],
      ["Initech", "hi@initech.com", 450.25, "Active", "2026-03-01", true],
      ["Umbrella", "ops@umbrella.net", 300, "Churned", "2026-03-11", false],
      ["Stark Industries", "finance@stark.com", 2500, "Active", "2026-04-02", true],
      ["Wayne Enterprises", "ap@wayne.co", 1800, "Lead", "2026-04-15", false],
    ]);

    const workbook = parseWorkbook(bytes, "customers.xlsx", bytes.length, "xlsx");
    expect(workbook.sheets).toHaveLength(1);
    expect(workbook.sheets[0].headers).toEqual([
      "Name",
      "Email",
      "Amount",
      "Status",
      "Signed Up",
      "Active",
    ]);
    expect(workbook.sheets[0].rowCount).toBe(6);

    const analysis = analyzeWorkbook(workbook);
    const columns = analysis.sheets[0].columns;
    const byName = (name: string) => columns.find((c) => c.name === name)!;

    expect(byName("Email").type).toBe("email");
    expect(byName("Amount").type).toBe("currency");
    expect(byName("Status").type).toBe("enum");
    expect(byName("Active").type).toBe("boolean");
    expect(byName("Signed Up").type).toBe("date");
    expect(byName("Name").key).toBe("name");
  });

  it("marks missing values and produces health findings", () => {
    const bytes = buildXlsx([
      ["Customer Name", "Email", "Notes"],
      ["Acme Corp", "a@acme.com", ""],
      ["", "new@lead.com", "follow up"],
      ["Acme Corp.", "other@acme.com", "hi"],
      ["Globex", "x@globex.io", ""],
      ["Initech", "y@initech.com", ""],
      ["Umbrella", "z@umb.co", ""],
      ["Wayne", "w@wayne.co", ""],
    ]);
    const workbook = parseWorkbook(bytes, "leads.xlsx", bytes.length, "xlsx");
    const analysis = analyzeWorkbook(workbook);

    const column = analysis.sheets[0].columns.find((c) => c.name === "Customer Name")!;
    expect(column.empty).toBe(1);
    expect(analysis.health.length).toBeGreaterThan(0);
    expect(analysis.duplicates.length).toBeGreaterThan(0);
    expect(analysis.duplicates[0].keyColumn).toBe("Customer Name");
  });

  it("parses csv payloads", () => {
    const csv = "name,amount\nAcme,10\nGlobex,20\n";
    const bytes = new TextEncoder().encode(csv);
    const workbook = parseWorkbook(bytes, "data.csv", bytes.length, "csv");
    expect(workbook.sheets[0].rowCount).toBe(2);
  });

  it("wraps an uploaded file as an ingestion source", async () => {
    const bytes = buildXlsx([["Name"], ["Acme"]]);
    const file = new File([bytes as unknown as BlobPart], "customers.xlsx");
    const source = new UploadedFileSource(file, bytes);
    expect(source.kind).toBe("file");
    expect(source.displayName).toBe("customers.xlsx");
    expect(source.sizeBytes).toBe(file.size);
    await expect(source.load()).resolves.toBe(bytes);
  });
});
