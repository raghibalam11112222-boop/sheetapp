"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { withAction, ActionError } from "@/lib/action";
import { requireActionOrg, requirePermissionOn, ACTIVE_ORG_COOKIE } from "@/lib/auth/guards";
import { canInviteMember, getOrgPlanId } from "@/lib/billing/limits";
import { rateLimit } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/db";
import { logAudit, track } from "@/lib/analytics/track";

const roleSchema = z.enum(["ADMIN", "MANAGER", "MEMBER", "VIEWER"]);
const INVITE_TTL_DAYS = 7;

export interface TeamMemberView {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  isYou: boolean;
}

export interface InvitationView {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export async function getTeamState(): Promise<{
  orgId: string;
  orgName: string;
  members: TeamMemberView[];
  invitations: InvitationView[];
}> {
  const ctx = await requireActionOrg();
  const org = await prisma.organization.findUnique({ where: { id: ctx.orgId } });
  const memberships = await prisma.membership.findMany({
    where: { organizationId: ctx.orgId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  const invitations = await prisma.invitation.findMany({
    where: { organizationId: ctx.orgId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  return {
    orgId: ctx.orgId,
    orgName: org?.name ?? "Workspace",
    members: memberships.map((m) => ({
      id: m.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.createdAt.toISOString(),
      isYou: m.userId === ctx.userId,
    })),
    invitations: invitations.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
  };
}

export async function inviteMemberAction(email: string, role: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("team:invite");
    if (!rateLimit(`invite:${ctx.userId}`, { limit: 20, windowMs: 60_000 })) {
      throw new ActionError("You are inviting too fast. Please wait a minute.", "RATE_LIMITED");
    }
    const parsedRole = roleSchema.safeParse(role);
    if (!parsedRole.success) throw new ActionError("Invalid role.", "VALIDATION");

    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(normalized)) {
      throw new ActionError("Please enter a valid email address.", "VALIDATION");
    }

    const existingMember = await prisma.membership.findFirst({
      where: { organizationId: ctx.orgId, user: { email: normalized } },
    });
    if (existingMember) throw new ActionError("That person is already a member.", "DUPLICATE");

    const planId = await getOrgPlanId(ctx.orgId);
    const [memberCount, pendingCount] = await Promise.all([
      prisma.membership.count({ where: { organizationId: ctx.orgId } }),
      prisma.invitation.count({
        where: { organizationId: ctx.orgId, status: "PENDING" },
      }),
    ]);
    const seatCheck = canInviteMember(planId, memberCount + pendingCount);
    if (!seatCheck.ok) throw new ActionError(seatCheck.message ?? "Seat limit reached.", "LIMIT");

    const pending = await prisma.invitation.findFirst({
      where: { organizationId: ctx.orgId, email: normalized, status: "PENDING" },
    });
    if (pending) throw new ActionError("That person already has a pending invitation.", "DUPLICATE");

    const token = crypto.randomUUID();
    await prisma.invitation.create({
      data: {
        organizationId: ctx.orgId,
        email: normalized,
        role: parsedRole.data,
        token,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
        invitedById: ctx.userId,
      },
    });

    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "team.invited",
      entityType: "invitation",
      metadata: { email: normalized, role: parsedRole.data },
    });
    await track("team_invited", { orgId: ctx.orgId, userId: ctx.userId });

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return {
      inviteUrl: `${base}/invite/${token}`,
      note: "No email provider is configured — share this link with your teammate.",
    };
  });
}

export async function updateMemberRoleAction(membershipId: string, role: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("team:manage");
    const parsedRole = roleSchema.safeParse(role);
    if (!parsedRole.success) throw new ActionError("Invalid role.", "VALIDATION");

    const membership = await prisma.membership.findFirst({
      where: { id: membershipId, organizationId: ctx.orgId },
    });
    if (!membership) throw new ActionError("Member not found.", "NOT_FOUND");

    if (membership.role === "ADMIN" && parsedRole.data !== "ADMIN") {
      const admins = await prisma.membership.count({
        where: { organizationId: ctx.orgId, role: "ADMIN" },
      });
      if (admins <= 1) {
        throw new ActionError("Your workspace needs at least one admin.", "LAST_ADMIN");
      }
    }

    await prisma.membership.update({
      where: { id: membershipId },
      data: { role: parsedRole.data },
    });
    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "team.role_changed",
      entityType: "membership",
      entityId: membershipId,
      metadata: { role: parsedRole.data },
    });
    return { id: membershipId, role: parsedRole.data };
  });
}

export async function removeMemberAction(membershipId: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("team:manage");
    const membership = await prisma.membership.findFirst({
      where: { id: membershipId, organizationId: ctx.orgId },
    });
    if (!membership) throw new ActionError("Member not found.", "NOT_FOUND");

    if (membership.role === "ADMIN") {
      const admins = await prisma.membership.count({
        where: { organizationId: ctx.orgId, role: "ADMIN" },
      });
      if (admins <= 1) throw new ActionError("Your workspace needs at least one admin.", "LAST_ADMIN");
    }

    await prisma.membership.delete({ where: { id: membershipId } });
    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "team.member_removed",
      entityType: "membership",
      entityId: membershipId,
    });
    return { id: membershipId };
  });
}

export async function revokeInvitationAction(invitationId: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("team:manage");
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: ctx.orgId },
    });
    if (!invitation) throw new ActionError("Invitation not found.", "NOT_FOUND");
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "REVOKED" },
    });
    return { id: invitationId };
  });
}

/** Reissues a pending invitation with a fresh token and expiry (app.txt §20). */
export async function resendInvitationAction(invitationId: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("team:manage");
    if (!rateLimit(`invite:${ctx.userId}`, { limit: 20, windowMs: 60_000 })) {
      throw new ActionError("You are inviting too fast. Please wait a minute.", "RATE_LIMITED");
    }
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: ctx.orgId },
    });
    if (!invitation) throw new ActionError("Invitation not found.", "NOT_FOUND");
    if (invitation.status !== "PENDING") {
      throw new ActionError("Only pending invitations can be resent.", "INVALID");
    }
    const token = crypto.randomUUID();
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        token,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "team.invitation_resent",
      entityType: "invitation",
      entityId: invitation.id,
      metadata: { email: invitation.email },
    });
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return { inviteUrl: `${base}/invite/${token}` };
  });
}

export async function acceptInvitationAction(token: string) {
  return withAction(async () => {
    const ctx = await requireActionOrg();
    const invitation = await prisma.invitation.findUnique({ where: { token } });
    if (!invitation || invitation.status !== "PENDING") {
      throw new ActionError("This invitation is no longer valid.", "NOT_FOUND");
    }
    // Defense in depth: the page hides the button, but server actions are
    // callable directly — the invitation must match the signed-in email.
    if (invitation.email.toLowerCase() !== ctx.userEmail.toLowerCase()) {
      throw new ActionError(
        "This invitation was sent to a different email address.",
        "FORBIDDEN"
      );
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      throw new ActionError("This invitation has expired.", "EXPIRED");
    }

    const existing = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: ctx.userId,
        },
      },
    });
    if (!existing) {
      await prisma.membership.create({
        data: {
          organizationId: invitation.organizationId,
          userId: ctx.userId,
          role: invitation.role,
        },
      });
    }
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    const jar = await cookies();
    jar.set(ACTIVE_ORG_COOKIE, invitation.organizationId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return { organizationId: invitation.organizationId };
  });
}
