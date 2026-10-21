/**
 * Spreadsheet ingestion sources (app.txt §22 "Google Sheets").
 *
 * MVP supports Excel/CSV uploads first. Everything downstream (validate →
 * parse → analyze → generate) consumes raw bytes plus metadata, so a future
 * Google Sheets connector only needs to implement this interface — e.g.
 * OAuth → Sheets API export (xlsx) → bytes — without touching the analysis
 * or generation pipeline. No fake functionality ships in MVP: the
 * "Connect Google Sheets" button in the upload step is disabled with a
 * "Coming soon" label until a real connector exists.
 */
export type SpreadsheetSourceKind = "file";

export interface SpreadsheetSource {
  kind: SpreadsheetSourceKind;
  /** File name or document title shown through onboarding and review. */
  displayName: string;
  /** Byte size when known upfront (0 when the source streams). */
  sizeBytes: number;
  /** Raw document bytes for validation and parsing. */
  load(): Promise<Uint8Array>;
}

/** A spreadsheet uploaded from disk (the only MVP source). */
export class UploadedFileSource implements SpreadsheetSource {
  readonly kind = "file" as const;

  constructor(
    private readonly file: File,
    private readonly bytes: Uint8Array
  ) {}

  get displayName(): string {
    return this.file.name;
  }

  get sizeBytes(): number {
    return this.file.size;
  }

  async load(): Promise<Uint8Array> {
    return this.bytes;
  }
}
