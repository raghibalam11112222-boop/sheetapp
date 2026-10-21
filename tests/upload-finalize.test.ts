import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  dataSource: { create: vi.fn() },
  errorLog: { create: vi.fn() },
}));

const requirePermissionOnMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/guards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/guards")>();
  return { ...actual, requirePermissionOn: requirePermissionOnMock };
});
vi.mock("@/lib/analytics/track", () => ({
  track: vi.fn(async () => undefined),
  logAudit: vi.fn(async () => undefined),
}));

import { finalizeSpreadsheetUploadAction } from "@/actions/upload";
import { isBlobStoreUrl, isOrgScopedBlobUrl } from "@/lib/storage";

const ORG = "org_mine";
const MY_URL = `https://abc123.private.blob.vercel-storage.com/${ORG}/file-1.xlsx`;
const OTHER_ORG_URL = `https://abc123.private.blob.vercel-storage.com/org_other/file-1.xlsx`;

beforeEach(() => {
  vi.clearAllMocks();
  requirePermissionOnMock.mockResolvedValue({
    userId: "u_me",
    userEmail: "me@acme.com",
    userName: "Me",
    orgId: ORG,
    role: "ADMIN",
  });
});

describe("blob URL guards", () => {
  it("accepts only *.blob.vercel-storage.com hosts", () => {
    expect(isBlobStoreUrl(MY_URL)).toBe(true);
    expect(isBlobStoreUrl("https://abc123.public.blob.vercel-storage.com/x")).toBe(true);
    expect(isBlobStoreUrl("https://evil.example.com/x")).toBe(false);
    expect(isBlobStoreUrl("https://evil.blob.vercel-storage.com.evil.io/x")).toBe(false);
    expect(isBlobStoreUrl("not a url")).toBe(false);
  });

  it("scopes org paths to the exact org prefix", () => {
    expect(isOrgScopedBlobUrl(MY_URL, ORG)).toBe(true);
    expect(isOrgScopedBlobUrl(OTHER_ORG_URL, ORG)).toBe(false);
    // org id prefix confusion: org_mine2 must not match org_mine
    expect(isOrgScopedBlobUrl(`https://abc123.private.blob.vercel-storage.com/${ORG}2/x.xlsx`, ORG)).toBe(false);
    expect(isOrgScopedBlobUrl("https://evil.example.com/org_mine/x.xlsx", ORG)).toBe(false);
  });
});

describe("finalizeSpreadsheetUploadAction input hardening", () => {
  it("rejects a non-blob URL without touching the network or DB", async () => {
    const result = await finalizeSpreadsheetUploadAction({
      blobUrl: "https://evil.example.com/steal.xlsx",
      fileName: "book.xlsx",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_FILE");
    expect(prismaMock.dataSource.create).not.toHaveBeenCalled();
  });

  it("rejects a blob under another workspace's prefix", async () => {
    const result = await finalizeSpreadsheetUploadAction({
      blobUrl: OTHER_ORG_URL,
      fileName: "book.xlsx",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_FILE");
    expect(prismaMock.dataSource.create).not.toHaveBeenCalled();
  });

  it("rejects missing inputs", async () => {
    const result = await finalizeSpreadsheetUploadAction({ blobUrl: "", fileName: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_FILE");
  });

  it("requires app:create permission", async () => {
    requirePermissionOnMock.mockRejectedValue(new Error("forbidden"));
    const result = await finalizeSpreadsheetUploadAction({ blobUrl: MY_URL, fileName: "b.xlsx" });
    expect(result.ok).toBe(false);
    expect(prismaMock.dataSource.create).not.toHaveBeenCalled();
  });
});
