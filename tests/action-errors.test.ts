import { describe, expect, it, vi } from "vitest";
import { ActionError, withAction } from "@/lib/action";
import { PermissionError } from "@/lib/auth/permissions";
import { AuthRequiredError } from "@/lib/auth/guards";

vi.mock("@/lib/db", () => ({
  prisma: { errorLog: { create: vi.fn() } },
}));

describe("withAction error mapping (app.txt §31)", () => {
  it("passes data through on success", async () => {
    await expect(withAction(async () => ({ id: "1" }))).resolves.toEqual({
      ok: true,
      data: { id: "1" },
    });
  });

  it("masks unexpected errors like Prisma failures", async () => {
    const prismaLike = Object.assign(
      new Error("Invalid `prisma.record.create()` invocation:\nArgument `data` is missing."),
      { name: "PrismaClientValidationError", code: "P2012" }
    );
    const result = await withAction(async () => {
      throw prismaLike;
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Something went wrong. Please try again.");
      expect(result.code).toBe("INTERNAL");
      expect(result.error).not.toContain("prisma");
    }
  });

  it("keeps curated ActionError messages", async () => {
    const result = await withAction(async () => {
      throw new ActionError("We couldn't save this record. Please try again.", "VALIDATION");
    });
    expect(result).toEqual({
      ok: false,
      error: "We couldn't save this record. Please try again.",
      code: "VALIDATION",
    });
  });

  it("maps permission and auth failures to friendly codes", async () => {
    const denied = await withAction(async () => {
      throw new PermissionError();
    });
    expect(denied).toEqual({
      ok: false,
      error: "You do not have permission to do that.",
      code: "FORBIDDEN",
    });

    const unauth = await withAction(async () => {
      throw new AuthRequiredError();
    });
    expect(unauth.ok).toBe(false);
    if (!unauth.ok) expect(unauth.code).toBe("UNAUTHENTICATED");
  });
});
