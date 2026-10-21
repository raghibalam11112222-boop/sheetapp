import type { FileKind } from "./types";

export const MAX_FILE_BYTES = 1000 * 1024 * 1024; // 1000 MB
export const MAX_SHEETS = 30;
export const MAX_ROWS_PER_SHEET = 50_000;
export const MAX_COLUMNS_PER_SHEET = 200;

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileValidationError";
  }
}

const EXTENSIONS: Record<string, FileKind> = {
  xlsx: "xlsx",
  xls: "xls",
  csv: "csv",
};

export function fileKindFromName(fileName: string): FileKind | null {
  const ext = fileName.toLowerCase().split(".").pop();
  return ext ? EXTENSIONS[ext] ?? null : null;
}

const OLE2 = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const ZIP_EMPTY = [0x50, 0x4b, 0x05, 0x06];

function startsWith(bytes: Uint8Array, sig: number[]): boolean {
  if (bytes.length < sig.length) return false;
  return sig.every((b, i) => bytes[i] === b);
}

/**
 * Validates an uploaded spreadsheet: extension, size and file signature.
 * Uploaded files are treated as untrusted input (app.txt §25).
 */
export function validateSpreadsheetFile(
  fileName: string,
  fileSize: number,
  bytes: Uint8Array
): FileKind {
  const kind = fileKindFromName(fileName);
  if (!kind) {
    throw new FileValidationError(
      "Unsupported file type. Please upload an XLSX, XLS or CSV file."
    );
  }
  if (fileSize <= 0) {
    throw new FileValidationError("The file is empty.");
  }
  if (fileSize > MAX_FILE_BYTES) {
    const mb = (MAX_FILE_BYTES / (1024 * 1024)).toFixed(0);
    throw new FileValidationError(`File is too large. The maximum size is ${mb} MB.`);
  }

  if (kind === "xlsx") {
    if (!startsWith(bytes, ZIP) && !startsWith(bytes, ZIP_EMPTY)) {
      throw new FileValidationError(
        "This file does not look like a valid XLSX workbook."
      );
    }
  } else if (kind === "xls") {
    if (!startsWith(bytes, OLE2)) {
      throw new FileValidationError("This file does not look like a valid XLS file.");
    }
  } else {
    // CSV: reject binary payloads pretending to be text.
    const probe = bytes.subarray(0, Math.min(bytes.length, 4096));
    if (probe.includes(0)) {
      throw new FileValidationError(
        "This file does not look like a valid CSV file."
      );
    }
  }
  return kind;
}
