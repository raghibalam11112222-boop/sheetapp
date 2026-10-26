import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const cookieMock = vi.hoisted(() => ({ get: vi.fn() }));
const verifyMock = vi.hoisted(() => vi.fn());

const chatMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieMock),
}));
vi.mock("@/lib/auth/firebase-token", () => ({
  verifyFirebaseIdToken: verifyMock,
}));
vi.mock("@/lib/auth/workspace", () => ({
  ensureOrganizationForUser: vi.fn(async () => "org_test"),
  createInitialWorkspace: vi.fn(async () => undefined),
}));
vi.mock("@/lib/analytics/track", () => ({
  logAudit: vi.fn(async () => undefined),
  track: vi.fn(async () => undefined),
}));
vi.mock("@/lib/ai/provider", () => {
  class OpenAICompatibleProvider {
    name = "groq";
    chat = chatMock;
  }
  return {
    OpenAICompatibleProvider,
    getAIProvider: () => new OpenAICompatibleProvider(),
  };
});

import {
  AccountAccessDeniedError,
  getSession,
  isPlatformAdmin,
} from "@/lib/auth/guards";
import { answerAssistantQuestion } from "@/lib/ai/assistant";

beforeEach(() => {
  vi.clearAllMocks();
  cookieMock.get.mockReturnValue(undefined);
  verifyMock.mockResolvedValue({ exp: 1, iat: 0 });
});

afterEach(() => {
  delete process.env.PLATFORM_ADMIN_FIREBASE_IDS;
});

describe("isPlatformAdmin allowlist parsing (M5)", () => {
  it("closes the admin surface when the env var is unset", () => {
    expect(isPlatformAdmin("user_a")).toBe(false);
  });

  it("matches exact ids in a comma-separated list", () => {
    process.env.PLATFORM_ADMIN_FIREBASE_IDS = "user_a,user_b";
    expect(isPlatformAdmin("user_a")).toBe(true);
    expect(isPlatformAdmin("user_c")).toBe(false);
    expect(isPlatformAdmin(null)).toBe(false);
    expect(isPlatformAdmin("")).toBe(false);
  });

  it("tolerates newlines and extra whitespace from dashboard edits", () => {
    process.env.PLATFORM_ADMIN_FIREBASE_IDS = "  user_a \n\t user_b  , user_c";
    expect(isPlatformAdmin("user_a")).toBe(true);
    expect(isPlatformAdmin("user_b")).toBe(true);
    expect(isPlatformAdmin("user_c")).toBe(true);
  });

  it("never partial-matches an id", () => {
    process.env.PLATFORM_ADMIN_FIREBASE_IDS = "user_admin";
    expect(isPlatformAdmin("user_adm")).toBe(false);
    expect(isPlatformAdmin("user_adminx")).toBe(false);
  });
});

describe("assistant AI gate (L9)", () => {
  beforeEach(() => {
    chatMock.mockResolvedValue("AI reply");
  });

  it("does not call the LLM unless the caller opts in explicitly", async () => {
    const reply = await answerAssistantQuestion("how much does it cost");
    expect(chatMock).not.toHaveBeenCalled();
    expect(reply).not.toBe("AI reply");
    expect(reply).toContain("Early access is free");
  });

  it("treats useAi: false as opt-out", async () => {
    const reply = await answerAssistantQuestion("how much does it cost", { useAi: false });
    expect(chatMock).not.toHaveBeenCalled();
    expect(reply).not.toBe("AI reply");
  });

  it("uses the LLM when useAi: true", async () => {
    const reply = await answerAssistantQuestion("how much does it cost", { useAi: true });
    expect(chatMock).toHaveBeenCalledTimes(1);
    expect(reply).toBe("AI reply");
  });
});

describe("session resolution refusals never create rows (H1)", () => {
  function signInWith(claims: Record<string, unknown>) {
    cookieMock.get.mockReturnValue({ value: "token-like" });
    verifyMock.mockResolvedValue({
      claims,
      exp: 1,
      iat: 0,
    });
  }

  it("denies an email already claimed by a different sign-in identity", async () => {
    signInWith({ uid: "user_a", email: "taken@x.com", name: "A", emailVerified: true });
    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if ("firebaseUid" in where) return null;
      return { id: "u2", firebaseUid: "user_other", email: "taken@x.com" };
    });

    await expect(getSession()).rejects.toThrow(AccountAccessDeniedError);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("denies linking a legacy row whose email is not verified in the token", async () => {
    signInWith({ uid: "user_a", email: "legacy@x.com", name: "L", emailVerified: false });
    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if ("firebaseUid" in where) return null;
      return { id: "u1", firebaseUid: null, email: "legacy@x.com" };
    });

    await expect(getSession()).rejects.toThrow(AccountAccessDeniedError);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("links a legacy row when the token email claim is verified", async () => {
    signInWith({ uid: "user_a", email: "legacy@x.com", name: "L", emailVerified: true });
    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if ("firebaseUid" in where) return null;
      return { id: "u1", firebaseUid: null, email: "legacy@x.com" };
    });
    prismaMock.user.update.mockResolvedValue({
      id: "u1",
      firebaseUid: "user_a",
      email: "legacy@x.com",
      name: "L",
      image: null,
    });

    const session = await getSession();
    expect(session?.user.id).toBe("u1");
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ firebaseUid: "user_a", emailVerified: true }),
      })
    );
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("absorbs the concurrent-create (P2002) race instead of failing the request", async () => {
    signInWith({ uid: "user_a", email: "new@x.com", name: "N", emailVerified: false });
    let findCalls = 0;
    prismaMock.user.findUnique.mockImplementation(async () => {
      findCalls += 1;
      if (findCalls <= 2) return null; // by firebaseUid, then by email
      return { id: "u9", firebaseUid: "user_a", email: "new@x.com", name: "N", image: null };
    });
    const { createInitialWorkspace } = await import("@/lib/auth/workspace");
    prismaMock.user.create.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );

    const session = await getSession();
    expect(session?.user.id).toBe("u9");
    expect(createInitialWorkspace).not.toHaveBeenCalled();
  });
});
