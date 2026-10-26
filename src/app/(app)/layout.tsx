import { SessionSync } from "@/components/auth/session-sync";
import { requireOrg, isPlatformAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getAppRecordCounts, getOrgApps } from "@/lib/data/shell";
import { AppShell, type ShellNav } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrg();

  const [orgs, applications, countMap, notifications] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: ctx.userId },
      include: { organization: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getOrgApps(ctx.orgId, 40),
    getAppRecordCounts(ctx.orgId),
    prisma.notification.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const nav: ShellNav = {
    user: { name: ctx.userName, email: ctx.userEmail },
    org: { id: ctx.orgId, name: orgs.find((m) => m.organization.id === ctx.orgId)?.organization.name ?? "Workspace" },
    role: ctx.role,
    isPlatformAdmin: isPlatformAdmin(ctx.firebaseUid),
    orgs: orgs.map((m) => ({ id: m.organization.id, name: m.organization.name })),
    apps: applications.map((app) => ({
      id: app.id,
      name: app.name,
      status: app.status,
      recordCount: countMap.get(app.id) ?? 0,
      tables: app.tables.map((t) => ({ id: t.id, label: t.label })),
    })),
    notifications: {
      unread: notifications.filter((n) => !n.readAt).length,
      items: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
      })),
    },
  };

  return (
    <>
      {/* Keeps the httpOnly cookie sealed with the rotating Firebase token —
          without it an open tab would 401 the moment the hour-old token turns
          over between server requests. */}
      <SessionSync />
      <AppShell nav={nav}>{children}</AppShell>
    </>
  );
}
