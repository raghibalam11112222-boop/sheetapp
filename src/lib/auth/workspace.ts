import { prisma } from "@/lib/db";

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "workspace";
}

/**
 * Creates the personal workspace for a brand new user (called from the
 * Clerk-provisioned signup path in guards.ts) and makes sure the user always
 * one organization + membership + subscription, even if the hook failed.
 */
export async function createInitialWorkspace(userId: string, label: string) {
  const suffix = userId.slice(-6).toLowerCase();
  const slug = `${slugify(label)}-${suffix}`;

  const existing = await prisma.membership.findFirst({ where: { userId } });
  if (existing) return existing.organizationId;

  const organization = await prisma.organization.create({
    data: {
      name: label.slice(0, 60) || "My workspace",
      slug,
      memberships: { create: { userId, role: "ADMIN" } },
      subscriptions: {
        create: {
          plan: "FREE",
          status: "TRIALING",
          currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
        },
      },
    },
  });
  return organization.id;
}

export async function ensureOrganizationForUser(userId: string): Promise<string> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });
  if (membership) return membership.organizationId;
  return createInitialWorkspace(userId, "My workspace");
}
