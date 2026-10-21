import { describe, expect, it } from "vitest";
import type { GeneratedField } from "@/generated/prisma/client";
import * as XLSX from "xlsx";
import { escapeCsvCell, formatCompact, formatMoney, toCsv } from "@/lib/security/csv";
import { toXlsx } from "@/lib/security/xlsx";
import { rateLimit } from "@/lib/security/rate-limit";

describe("CSV export safety", () => {
  it("neutralizes formula injection", () => {
    expect(escapeCsvCell("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
    expect(escapeCsvCell("+1+1")).toBe("'+1+1");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCsvCell("-2+3")).toBe("'-2+3");
  });

  it("quotes commas, quotes and newlines", () => {
    expect(escapeCsvCell("Acme, Inc")).toBe('"Acme, Inc"');
    expect(escapeCsvCell('Say "hi"')).toBe('"Say ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("builds a CSV with a header row and BOM", () => {
    const fields = [
      { name: "name", label: "Name" },
      { name: "amount", label: "Amount" },
    ] as unknown as GeneratedField[];

    const csv = toCsv(fields, [
      { name: "=EVIL()", amount: 10 },
      { name: "Acme, Inc", amount: 20 },
    ]);

    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe("Name,Amount");
    expect(lines[1]).toBe("'=EVIL(),10");
    expect(lines[2]).toBe('"Acme, Inc",20');
  });

  it("formats money compactly", () => {
    expect(formatMoney(1200)).toBe("$1,200");
    expect(formatCompact(1500)).toBe("1.5K");
  });

  it("builds an xlsx workbook with headers, typed values and neutralized formulas", () => {
    const fields = [
      { name: "name", label: "Name" },
      { name: "amount", label: "Amount" },
      { name: "active", label: "Active" },
      { name: "created", label: "Created" },
    ] as unknown as GeneratedField[];

    const buf = toXlsx(
      fields,
      [
        { name: "=EVIL()", amount: 12400, active: true, created: "2026-09-01" },
        { name: "Acme, Inc", amount: 20, active: false, created: "" },
      ],
      "Customers"
    );
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).toEqual(["Customers"]);
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets["Customers"], { header: 1 });
    expect(rows[0]).toEqual(["Name", "Amount", "Active", "Created"]);
    expect(rows[1]).toEqual(["'=EVIL()", 12400, "TRUE", "2026-09-01"]);
    expect(rows[2]).toEqual(["Acme, Inc", 20, "FALSE", ""]);
  });
});

describe("rate limiter", () => {
  it("allows up to the limit then blocks within the window", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(rateLimit(key, { limit: 5, windowMs: 60_000 })).toBe(true);
    expect(rateLimit(key, { limit: 5, windowMs: 60_000 })).toBe(false);
  });

  it("tracks keys independently", () => {
    expect(rateLimit(`other-${Math.random()}`, { limit: 1, windowMs: 60_000 })).toBe(true);
  });
});
