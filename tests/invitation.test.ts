import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  invitation: { findUnique: vi.fn(), update: vi.fn() },
  membership: { findUnique: vi.fn(), create: vi.fn() },
  errorLog: { create: vi.fn() },
}));

const requireActionOrgMock = vi.hoisted(() => vi.fn());

const cookieJarMock = vi.hoisted(() => ({ set: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/guards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/guards")>();
  return { ...actual, requireActionOrg: requireActionOrgMock };
});
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieJarMock),
}));

import { acceptInvitationAction } from "@/actions/team";

const PENDING = {
  id: "inv_1",
  token: "tok_1",
  email: "invitee@Acme.com",
  status: "PENDING",
  role: "MEMBER",
  organizationId: "org_1",
  expiresAt: new Date(Date.now() + 86_400_000),
  invitedById: "u_inviter",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  requireActionOrgMock.mockResolvedValue({
    userId: "u_me",
    userEmail: "invitee@acme.com",
    userName: "Me",
    orgId: "org_current",
    role: "MEMBER",
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("acceptInvitationAction (C2 defense in depth)", () => {
  it("rejects when the signed-in email differs from the invitation email", async () => {
    requireActionOrgMock.mockResolvedValue({
      userId: "u_me",
      userEmail: "someone.else@acme.com",
      userName: "Me",
      orgId: "org_current",
      role: "MEMBER",
    });
    prismaMock.invitation.findUnique.mockResolvedValue(PENDING);

    const result = await acceptInvitationAction("tok_1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("FORBIDDEN");
      expect(result.error).toContain("different email");
    }
    expect(prismaMock.membership.create).not.toHaveBeenCalled();
    expect(prismaMock.invitation.update).not.toHaveBeenCalled();
    expect(cookieJarMock.set).not.toHaveBeenCalled();
  });

  it("matches emails case-insensitively", async () => {
    prismaMock.invitation.findUnique.mockResolvedValue(PENDING);
    prismaMock.membership.findUnique.mockResolvedValue(null);
    prismaMock.membership.create.mockResolvedValue({});
    prismaMock.invitation.update.mockResolvedValue({});

    const result = await acceptInvitationAction("tok_1");

    expect(result.ok).toBe(true);
    expect(prismaMock.membership.create).toHaveBeenCalledWith({
      data: { organizationId: "org_1", userId: "u_me", role: "MEMBER" },
    });
  });

  it("rejects expired invitations and marks them EXPIRED", async () => {
    prismaMock.invitation.findUnique.mockResolvedValue({
      ...PENDING,
      expiresAt: new Date(Date.now() - 1),
    });

    const result = await acceptInvitationAction("tok_1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("EXPIRED");
    expect(prismaMock.invitation.update).toHaveBeenCalledWith({
      where: { id: "inv_1" },
      data: { status: "EXPIRED" },
    });
    expect(prismaMock.membership.create).not.toHaveBeenCalled();
    expect(cookieJarMock.set).not.toHaveBeenCalled();
  });

  it("rejects unknown or already-used invitations", async () => {
    prismaMock.invitation.findUnique.mockResolvedValue(null);
    const notFound = await acceptInvitationAction("tok_x");
    expect(notFound.ok).toBe(false);
    if (!notFound.ok) expect(notFound.code).toBe("NOT_FOUND");

    prismaMock.invitation.findUnique.mockResolvedValue({ ...PENDING, status: "ACCEPTED" });
    const used = await acceptInvitationAction("tok_1");
    expect(used.ok).toBe(false);
    if (!used.ok) expect(used.code).toBe("NOT_FOUND");
    expect(prismaMock.membership.create).not.toHaveBeenCalled();
  });

  it("sets the active-org cookie with hardened options", async () => {
    vi.stubEnv("NODE_ENV", "production");
    prismaMock.invitation.findUnique.mockResolvedValue(PENDING);
    prismaMock.membership.findUnique.mockResolvedValue(null);
    prismaMock.membership.create.mockResolvedValue({});
    prismaMock.invitation.update.mockResolvedValue({});

    await acceptInvitationAction("tok_1");

    expect(cookieJarMock.set).toHaveBeenCalledTimes(1);
    const [name, value, opts] = cookieJarMock.set.mock.calls[0];
    expect(name).toBe("sheetapp_active_org");
    expect(value).toBe("org_1");
    expect(opts).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  });
});
