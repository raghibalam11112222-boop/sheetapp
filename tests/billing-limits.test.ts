import { describe, expect, it } from "vitest";
import {
  canCreateApp,
  canImportRows,
  canInviteMember,
  getPlanLimits,
} from "@/lib/billing/limits";

describe("plan limits (app.txt §35)", () => {
  it("falls closed to FREE for unknown plans", () => {
    expect(getPlanLimits("ENTERPRISE").label).toBe("Free");
    expect(getPlanLimits(null).apps).toBe(1);
    expect(getPlanLimits("starter").apps).toBe(5);
  });

  it("caps apps per plan", () => {
    expect(canCreateApp("FREE", 0).ok).toBe(true);
    const blocked = canCreateApp("FREE", 1);
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toMatch(/upgrade your plan/i);
    expect(canCreateApp("BUSINESS", 24).ok).toBe(true);
    expect(canCreateApp("BUSINESS", 25).ok).toBe(false);
  });

  it("caps seats including pending invitations", () => {
    expect(canInviteMember("FREE", 2).ok).toBe(true);
    expect(canInviteMember("FREE", 3).ok).toBe(false);
    expect(canInviteMember("PRO", 99).ok).toBe(true);
  });

  it("caps total records on import", () => {
    expect(canImportRows("FREE", 400, 50).ok).toBe(true);
    const blocked = canImportRows("FREE", 490, 50);
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toMatch(/record limit/i);
    expect(canImportRows("STARTER", 490, 50).ok).toBe(true);
  });
});
