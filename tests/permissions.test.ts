import { describe, expect, it } from "vitest";
import {
  assertCan,
  can,
  canEditRecord,
  isAtLeast,
  PermissionError,
  ROLE_LABELS,
  type Role,
} from "@/lib/auth/permissions";

describe("role permission matrix", () => {
  it("admins can do everything", () => {
    const permissions = [
      "record:create",
      "record:update",
      "record:delete",
      "record:export",
      "app:create",
      "app:edit",
      "app:delete",
      "team:invite",
      "team:manage",
      "settings:manage",
      "billing:manage",
      "workflow:manage",
    ] as const;
    for (const p of permissions) expect(can("ADMIN", p)).toBe(true);
  });

  it("viewers can do nothing", () => {
    expect(can("VIEWER", "record:create")).toBe(false);
    expect(can("VIEWER", "record:export")).toBe(false);
    expect(can("VIEWER", "team:invite")).toBe(false);
    expect(isAtLeast("VIEWER", "MEMBER")).toBe(false);
  });

  it("members can edit records but not manage the workspace", () => {
    expect(can("MEMBER", "record:create")).toBe(true);
    expect(can("MEMBER", "record:update")).toBe(true);
    expect(can("MEMBER", "record:delete")).toBe(false);
    expect(can("MEMBER", "team:invite")).toBe(false);
    expect(can("MEMBER", "settings:manage")).toBe(false);
  });

  it("managers can create and edit records but not delete or manage", () => {
    expect(can("MANAGER", "record:create")).toBe(true);
    expect(can("MANAGER", "record:update")).toBe(true);
    expect(can("MANAGER", "record:delete")).toBe(false);
    expect(can("MANAGER", "record:export")).toBe(false);
    expect(can("MANAGER", "workflow:manage")).toBe(false);
    expect(can("MANAGER", "billing:manage")).toBe(false);
    expect(can("MANAGER", "app:delete")).toBe(false);
    expect(can("MANAGER", "app:create")).toBe(false);
  });

  it("rank ordering is consistent", () => {
    const roles: Role[] = ["VIEWER", "MEMBER", "MANAGER", "ADMIN"];
    for (let i = 1; i < roles.length; i++) {
      expect(isAtLeast(roles[i], roles[i - 1])).toBe(true);
      expect(isAtLeast(roles[i - 1], roles[i])).toBe(false);
    }
  });

  it("assertCan throws PermissionError when denied", () => {
    expect(() => assertCan("ADMIN", "record:delete")).not.toThrow();
    expect(() => assertCan("VIEWER", "record:delete")).toThrow(PermissionError);
    expect(() => assertCan(null, "record:delete")).toThrow(PermissionError);
  });

  it("members can only edit records assigned to them", () => {
    expect(canEditRecord("MEMBER", "user-1", "user-1")).toBe(true);
    expect(canEditRecord("MEMBER", "user-2", "user-1")).toBe(false);
    // Records without a creator never lock anyone out.
    expect(canEditRecord("MEMBER", null, "user-1")).toBe(true);
    expect(canEditRecord("ADMIN", "user-2", "user-1")).toBe(true);
    expect(canEditRecord("MANAGER", "user-2", "user-1")).toBe(true);
    expect(canEditRecord("VIEWER", "user-1", "user-1")).toBe(false);
    expect(canEditRecord(null, "user-1", "user-1")).toBe(false);
  });

  it("has a label for every role", () => {
    for (const role of ["ADMIN", "MANAGER", "MEMBER", "VIEWER"] as Role[]) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });
});
