import fs from "node:fs/promises";
import path from "node:path";

/**
 * Spreadsheet bytes storage.
 *
 * - Local (default): `.data/uploads/{orgId}/{id}.{ext}` on server disk.
 *   Used for local dev and single-instance deploys.
 * - Vercel Blob: set `BLOB_READ_WRITE_TOKEN` (Vercel Dashboard → Storage →
 *   Blob) and files live in object storage instead, surviving redeploys and
 *   scaling past one machine. `storagePath` becomes the blob URL.
 *
 * Blobs are written with `access: "private"` so uploaded business data is
 * never world-readable. Reads go through `loadUpload()`, which authenticates
 * with the Blob token server-side (legacy public blobs are still readable via
 * a plain fetch fallback).
 *
 * Callers never touch the filesystem directly — they store the returned
 * `storagePath` in `dataSource.storagePath` and read it back with
 * `loadUpload()`, which handles both backends. Blob URLs are never exposed
 * to the client.
 */

const UPLOAD_ROOT = path.join(process.cwd(), ".data", "uploads");

/** Only the app's own Blob store hosts are ever fetched over the network. */
const BLOB_HOST_RE = /\.blob\.vercel-storage\.com$/;

/** True when the URL points at some Vercel Blob store host (SSRF allowlist). */
export function isBlobStoreUrl(url: string): boolean {
  try {
    return BLOB_HOST_RE.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * True when the blob URL's pathname lives under this org's prefix
 * (`/<orgId>/...`). Enforced at token generation and again when finalizing an
 * upload, so one workspace can never attach another workspace's blob.
 */
export function isOrgScopedBlobUrl(url: string, orgId: string): boolean {
  try {
    const parsed = new URL(url);
    if (!BLOB_HOST_RE.test(parsed.hostname)) return false;
    return parsed.pathname.startsWith(`/${orgId}/`);
  } catch {
    return false;
  }
}

async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function isBlobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function storageBackend(): "blob" | "local" {
  return isBlobEnabled() ? "blob" : "local";
}

/** Persists uploaded bytes; returns the opaque storagePath for the DB row. */
export async function saveUpload(
  orgId: string,
  id: string,
  fileKind: string,
  bytes: Uint8Array
): Promise<string> {
  if (isBlobEnabled()) {
    const { put } = await import("@vercel/blob");
    const contentType =
      fileKind === "csv"
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const blob = await put(`${orgId}/${id}.${fileKind}`, new Blob([bytes as BlobPart], { type: contentType }), {
      access: "private",
      contentType,
    });
    // Canary: private uploads must never land on a public host (the store
    // can be configured public regardless of the request — fail loudly so a
    // world-readable store is noticed immediately, not during an incident).
    if (new URL(blob.url).hostname.includes(".public.")) {
      console.error(
        `[SheetApp] Blob store returned a PUBLIC url despite access:"private" — upload is world-readable: ${blob.url}`
      );
    }
    return blob.url;
  }
  const dir = path.join(UPLOAD_ROOT, orgId);
  await fs.mkdir(dir, { recursive: true });
  const storagePath = path.join(dir, `${id}.${fileKind}`);
  await fs.writeFile(storagePath, bytes);
  return storagePath;
}

/** Reads bytes back, whether storagePath is a blob URL or a local path. */
export async function loadUpload(storagePath: string): Promise<Uint8Array> {
  if (/^https?:\/\//.test(storagePath)) {
    let host: string;
    try {
      host = new URL(storagePath).hostname;
    } catch {
      throw new Error("Stored file path is not a valid URL.");
    }
    // Strict allowlist: never fetch arbitrary URLs (a tampered storagePath
    // must not turn this server into an SSRF proxy). Failures are loud by
    // design — no silent downgrades followed by reading anyway.
    if (!BLOB_HOST_RE.test(host)) {
      throw new Error("Stored file host is not a recognized blob store.");
    }
    if (host.includes(".private.")) {
      // Private blobs: authenticated server-side read via the Blob token
      // (`get` sends the Authorization header). getDownloadUrl() only appends
      // ?download=1 — it does NOT sign — so plain fetching a private blob 401s.
      const { get } = await import("@vercel/blob");
      const result = await get(storagePath, { access: "private" });
      if (!result || result.statusCode !== 200) {
        throw new Error(`Stored file is unreachable (${result ? result.statusCode : 404}).`);
      }
      return streamToBytes(result.stream);
    }
    // Legacy public blobs (pre-hardening uploads) are readable by URL alone.
    const res = await fetch(storagePath);
    if (!res.ok) throw new Error(`Stored file is unreachable (${res.status}).`);
    return new Uint8Array(await res.arrayBuffer());
  }
  return new Uint8Array(await fs.readFile(storagePath));
}

/** Best-effort removal (never throws — callers must not fail on cleanup). */
export async function deleteUploads(storagePaths: (string | null)[]): Promise<void> {
  const remote = storagePaths.filter(
    (p): p is string => !!p && /^https?:\/\//.test(p)
  );
  if (remote.length && isBlobEnabled()) {
    try {
      const { del } = await import("@vercel/blob");
      await del(remote);
    } catch {
      // Already gone or unreachable — nothing to do.
    }
  }
  for (const storagePath of storagePaths) {
    if (!storagePath || /^https?:\/\//.test(storagePath)) continue;
    const resolved = path.resolve(storagePath);
    // Containment: only delete inside the uploads directory.
    if (!resolved.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) continue;
    try {
      await fs.unlink(resolved);
    } catch {
      // Already gone or unreadable — nothing to do.
    }
  }
}
