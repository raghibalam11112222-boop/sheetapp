import { Prisma } from "@prisma/client";
import { requireOrg, can } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { SettingsView, type SettingsState } from "./settings-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings",
  description: "Workspace, profile, and application management.",
};

export default async function SettingsPage() {
  const ctx = await requireOrg();

  const [org, applications, recordCounts, subscription, memberCount, tableCount] =
    await Promise.all([
      prisma.organization.findUnique({ where: { id: ctx.orgId } }),
      prisma.application.findMany({
        where: { organizationId: ctx.orgId },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          _count: { select: { tables: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.$queryRaw<{ applicationId: string; c: number }[]>(Prisma.sql`
        SELECT "applicationId", COUNT(*)::int AS c
        FROM "record"
        WHERE "organizationId" = ${ctx.orgId}
        GROUP BY "applicationId"
      `),
      prisma.subscription.findUnique({ where: { organizationId: ctx.orgId } }),
      prisma.membership.count({ where: { organizationId: ctx.orgId } }),
      prisma.generatedTable.count({ where: { organizationId: ctx.orgId } }),
    ]);

  // Clerk manages sessions — no prisma rows. Keep shape for SettingsView.
  const sessionTotal = 0;

  const appCountMap = new Map(recordCounts.map((r) => [r.applicationId, r.c]));

  const state: SettingsState = {
    orgName: org?.name ?? "Workspace",
    profileName: ctx.userName,
    email: ctx.userEmail,
    canManage: can(ctx.role, "settings:manage"),
    plan: subscription?.plan ?? "FREE",
    memberCount,
    tableCount,
    totalRecords: [...appCountMap.values()].reduce((sum, c) => sum + c, 0),
    sessionTotal,
    sessions: [],
    applications: applications.map((app) => ({
      id: app.id,
      name: app.name,
      status: app.status,
      createdAt: app.createdAt.toISOString(),
      tableCount: app._count.tables,
      recordCount: appCountMap.get(app.id) ?? 0,
    })),
  };

  return (
    <div className="space-y-5">
      <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#111111]">Settings</h1>
          <p className="text-sm text-[#6B7280]">Workspace, profile and application management.</p>
      </div>
      <SettingsView state={state} />
    </div>
  );
}
