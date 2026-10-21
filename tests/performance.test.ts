import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { analyzeWorkbook, parseWorkbook, slimAnalysisForReview } from "@/lib/spreadsheet";
import { getJobQueue } from "@/lib/jobs/queue";

function sampleAnalysis() {
  const wb = XLSX.utils.book_new();
  const rows: unknown[][] = [["Name", "Email"]];
  for (let i = 0; i < 50; i++) rows.push([`Company ${i}`, `user${i}@example.com`]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Customers");
  const bytes = new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as ArrayBuffer);
  return analyzeWorkbook(parseWorkbook(bytes, "big.xlsx", bytes.length, "xlsx"));
}

describe("slimAnalysisForReview (app.txt §37)", () => {
  it("shrinks the browser payload while keeping everything the UI needs", () => {
    const analysis = sampleAnalysis();
    const full = JSON.stringify(analysis).length;
    const slim = slimAnalysisForReview(analysis);
    const slimmed = JSON.stringify(slim).length;
    expect(slimmed).toBeLessThan(full);

    // Everything schema-review.tsx consumes is retained.
    expect(slim.fileName).toBe("big.xlsx");
    expect(slim.totalRows).toBe(50);
    expect(slim.sheets[0].columns[0]).toMatchObject({ name: "Name", type: "text" });
    expect(slim.sheets[0].columns[1].invalidEmailCount).toBe(0);
    expect(slim.health).toEqual(analysis.health);

    // Per-value payloads never leave the server.
    const serialized = JSON.stringify(slim);
    expect(serialized).not.toContain("Company 42");
    expect(serialized).not.toContain("sampleValues");
  });
});

describe("job queue (app.txt §37)", () => {
  it("runs jobs inline and returns their result", async () => {
    const queue = getJobQueue();
    await expect(
      queue.enqueue({ name: "test-job", run: async () => 42 })
    ).resolves.toBe(42);
  });

  it("propagates job failures to the caller", async () => {
    const queue = getJobQueue();
    await expect(
      queue.enqueue({
        name: "failing-job",
        run: async () => {
          throw new Error("boom");
        },
      })
    ).rejects.toThrow("boom");
  });

  it("is a shared instance", () => {
    expect(getJobQueue()).toBe(getJobQueue());
  });
});
