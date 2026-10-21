import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const blobMock = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));

vi.mock("@vercel/blob", () => blobMock);

import { deleteUploads, loadUpload, saveUpload } from "@/lib/storage";

const fetchMock = vi.fn();

function streamOf(bytes: number[]) {
  return new Response(new Uint8Array(bytes)).body as ReadableStream<Uint8Array>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadUpload host allowlist (SSRF guard)", () => {
  it("refuses any host outside *.blob.vercel-storage.com without fetching", async () => {
    await expect(loadUpload("https://evil.example.com/steal")).rejects.toThrow(
      "not a recognized blob store"
    );
    await expect(loadUpload("https://evil.blob.vercel-storage.com.evil.io/x")).rejects.toThrow(
      "not a recognized blob store"
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(blobMock.get).not.toHaveBeenCalled();
  });

  it("refuses malformed URLs instead of fetching", async () => {
    await expect(loadUpload("https://")).rejects.toThrow("not a valid URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("loadUpload private blobs", () => {
  it("reads via authenticated get(access:'private'), not a plain fetch", async () => {
    blobMock.get.mockResolvedValue({ statusCode: 200, stream: streamOf([1, 2, 3]) });
    const url = "https://abc123.private.blob.vercel-storage.com/org/file.xlsx";

    const bytes = await loadUpload(url);

    expect(blobMock.get).toHaveBeenCalledWith(url, { access: "private" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("fails loudly when the blob is missing", async () => {
    blobMock.get.mockResolvedValue(null);
    await expect(
      loadUpload("https://abc123.private.blob.vercel-storage.com/gone.xlsx")
    ).rejects.toThrow("unreachable (404)");
  });

  it("fails loudly on non-200 responses", async () => {
    blobMock.get.mockResolvedValue({ statusCode: 304, stream: null });
    await expect(
      loadUpload("https://abc123.private.blob.vercel-storage.com/gone.xlsx")
    ).rejects.toThrow("unreachable (304)");
  });
});

describe("loadUpload legacy public blobs", () => {
  it("reads public-host blobs with a plain fetch", async () => {
    fetchMock.mockResolvedValue({ ok: true, arrayBuffer: async () => new Uint8Array([9, 8]).buffer });
    const url = "https://abc123.public.blob.vercel-storage.com/org/file.xlsx";

    const bytes = await loadUpload(url);

    expect(fetchMock).toHaveBeenCalledWith(url);
    expect(blobMock.get).not.toHaveBeenCalled();
    expect(Array.from(bytes)).toEqual([9, 8]);
  });

  it("fails loudly when the public fetch is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    await expect(
      loadUpload("https://abc123.public.blob.vercel-storage.com/org/file.xlsx")
    ).rejects.toThrow("unreachable (403)");
  });
});

describe("loadUpload local disk", () => {
  it("reads a filesystem path without touching the network", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sheetapp-test-"));
    const file = path.join(dir, "sample.csv");
    await fs.writeFile(file, "a,b\n1,2\n");
    try {
      const bytes = await loadUpload(file);
      expect(new TextDecoder().decode(bytes)).toBe("a,b\n1,2\n");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(blobMock.get).not.toHaveBeenCalled();
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

describe("deleteUploads containment", () => {
  it("never deletes local paths outside the uploads root", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sheetapp-test-"));
    const outside = path.join(dir, "precious.csv");
    await fs.writeFile(outside, "keep me");
    try {
      await deleteUploads([outside]);
      await expect(fs.readFile(outside, "utf8")).resolves.toBe("keep me");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

describe("saveUpload public-host canary", () => {
  it("logs loudly when the store returns a public URL despite access:'private'", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "fake_token_for_branch");
    blobMock.put.mockResolvedValue({
      url: "https://abc123.public.blob.vercel-storage.com/org/f.csv",
    });
    try {
      const p = await saveUpload("org_1", "file_1", "csv", new Uint8Array([1]));
      expect(p).toContain(".public.");
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("PUBLIC"));
    } finally {
      vi.unstubAllEnvs();
      errSpy.mockRestore();
    }
  });
});
