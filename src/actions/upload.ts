"use server";

import crypto from "node:crypto";
import { withAction, ActionError } from "@/lib/action";
import { requirePermissionOn } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  analyzeWorkbook,
  parseWorkbook,
  validateSpreadsheetFile,
  FileValidationError,
  UploadedFileSource,
} from "@/lib/spreadsheet";
import type { ParsedWorkbook, SpreadsheetAnalysis } from "@/lib/spreadsheet/types";
import { prisma } from "@/lib/db";
import { saveUpload, deleteUploads, isOrgScopedBlobUrl, storageBackend, loadUpload } from "@/lib/storage";
import { track } from "@/lib/analytics/track";

export interface StoredDataSource {
  dataSourceId: string;
}

type UploadResult =
  | { ok: true; data: StoredDataSource }
  | { ok: false; error: string; code?: string };

type IngestCtx = { userId: string; orgId: string };

interface AnalyzedUpload {
  fileKind: ReturnType<typeof validateSpreadsheetFile>;
  workbook: ParsedWorkbook;
  analysis: SpreadsheetAnalysis;
  hint: string;
}

/** Validate → parse → analyze. Throws ActionError for junk/non-spreadsheet input. */
async function analyzeUpload(
  bytes: Uint8Array,
  fileName: string,
  hint: string
): Promise<AnalyzedUpload> {
  let fileKind: ReturnType<typeof validateSpreadsheetFile>;
  try {
    fileKind = validateSpreadsheetFile(fileName, bytes.length, bytes);
  } catch (err) {
    if (err instanceof FileValidationError) throw new ActionError(err.message, "INVALID_FILE");
    throw err;
  }
  const workbook = parseWorkbook(bytes, fileName, bytes.length, fileKind);
  const analysis: SpreadsheetAnalysis = analyzeWorkbook(workbook);
  return { fileKind, workbook, analysis, hint };
}

/** Persist the analyzed workbook as a DataSource row + analytics events. */
async function persistDataSource(
  ctx: IngestCtx,
  analyzed: AnalyzedUpload,
  opts: { sizeBytes: number; fileName: string; storagePath: string }
): Promise<StoredDataSource> {
  const { fileKind, workbook, analysis, hint } = analyzed;
  const dataSource = await prisma.dataSource.create({
    data: {
      organizationId: ctx.orgId,
      fileName: opts.fileName.slice(0, 200),
      fileSize: opts.sizeBytes,
      fileKind,
      storagePath: opts.storagePath,
      sheetCount: workbook.sheets.length,
      rowCount: analysis.totalRows,
      columnCount: analysis.totalColumns,
      status: "ANALYZED",
      uploadedById: ctx.userId,
      analysis: { analysis, hint } as object,
    },
  });

  // Analytics carries aggregate stats only — never the file name, which
  // may itself contain personal data (app.txt §34).
  await track("spreadsheet_uploaded", {
    orgId: ctx.orgId,
    userId: ctx.userId,
    metadata: { size: opts.sizeBytes, sheets: workbook.sheets.length },
  });
  await track("analysis_completed", {
    orgId: ctx.orgId,
    userId: ctx.userId,
    metadata: { rows: analysis.totalRows, columns: analysis.totalColumns },
  });

  return { dataSourceId: dataSource.id };
}

/**
 * In-process path: the whole file travels inside the server-action FormData
 * and is parsed here. Fine for local dev and files within the platform body
 * limit; Vercel rejects request bodies over 4.5 MB at the edge, so production
 * large files must use finalizeSpreadsheetUploadAction (direct-to-Blob).
 */
export async function uploadSpreadsheetAction(formData: FormData): Promise<UploadResult> {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:create");

    if (!rateLimit(`upload:${ctx.userId}`, { limit: 10, windowMs: 60_000 })) {
      throw new ActionError("You are uploading too fast. Please wait a minute.", "RATE_LIMITED");
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new ActionError("Please choose a spreadsheet file to upload.");
    }

    // Ingestion goes through a SpreadsheetSource so a future Google Sheets
    // connector can supply bytes here without changing anything below.
    const source = new UploadedFileSource(file, new Uint8Array(await file.arrayBuffer()));
    const bytes = await source.load();
    const hint = String(formData.get("hint") ?? "").trim().slice(0, 120);

    const analyzed = await analyzeUpload(bytes, source.displayName, hint);
    // Store only after validation succeeded, so junk never touches disk/blob.
    const storagePath = await saveUpload(ctx.orgId, crypto.randomUUID(), "xlsx", bytes);
    return await persistDataSource(
      { userId: ctx.userId, orgId: ctx.orgId },
      analyzed,
      { sizeBytes: bytes.length, fileName: source.displayName, storagePath }
    );
  });
}

/**
 * Large-file path: the browser uploads bytes straight to Vercel Blob (via
 * /api/blob client tokens — never through this serverless function's 4.5 MB
 * body limit), then finalizes here. This action downloads the blob with the
 * server token, validates + analyzes it, and links the EXISTING blob URL as
 * `storagePath` — the bytes are never re-uploaded.
 *
 * Rejects any URL outside the caller's org prefix on the app's Blob store, so
 * a crafted input can neither SSRF nor attach another workspace's file.
 */
export async function finalizeSpreadsheetUploadAction(input: {
  blobUrl: string;
  fileName: string;
  hint?: string;
}): Promise<UploadResult> {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:create");

    if (!rateLimit(`upload:${ctx.userId}`, { limit: 10, windowMs: 60_000 })) {
      throw new ActionError("You are uploading too fast. Please wait a minute.", "RATE_LIMITED");
    }

    const blobUrl = typeof input?.blobUrl === "string" ? input.blobUrl : "";
    const fileName = typeof input?.fileName === "string" ? input.fileName.trim() : "";
    const hint = (typeof input?.hint === "string" ? input.hint : "").trim().slice(0, 120);
    if (!blobUrl || !fileName) {
      throw new ActionError("Please choose a spreadsheet file to upload.", "INVALID_FILE");
    }
    if (!isOrgScopedBlobUrl(blobUrl, ctx.orgId)) {
      throw new ActionError("That upload reference is not valid.", "INVALID_FILE");
    }
    if (storageBackend() !== "blob") {
      throw new ActionError("Large uploads are not available right now.", "UNAVAILABLE");
    }

    let bytes: Uint8Array;
    let analyzed: AnalyzedUpload;
    try {
      // Authenticated private read + host allowlist (storage.ts loadUpload).
      bytes = await loadUpload(blobUrl);
      analyzed = await analyzeUpload(bytes, fileName, hint);
    } catch (err) {
      // Validation failed or the blob is unreadable — it is linked to no
      // row, so clean it up so truncated/junk uploads never linger. Best-effort.
      if (err instanceof ActionError) await deleteUploads([blobUrl]);
      throw err;
    }

    return await persistDataSource(
      { userId: ctx.userId, orgId: ctx.orgId },
      analyzed,
      { sizeBytes: bytes.length, fileName, storagePath: blobUrl }
    );
  });
}
