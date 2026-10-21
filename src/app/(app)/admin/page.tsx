import { requirePlatformAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
  description: "System health and platform metrics for operators.",
};

export default async function AdminPage() {
  // Platform operators only (PLATFORM_ADMIN_CLERK_IDS) — never org admins.
  await requirePlatformAdmin();

  const [
    users,
    orgs,
    records,
    dataSources,
    dbStatus,
    recentErrors,
    eventTotals,
    recentFiles,
    generationJobs,
    aiUsage,
    failedJobs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.record.count(),
    prisma.dataSource.count(),
    prisma.$queryRaw`SELECT 1 AS ok`,
    prisma.errorLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.$queryRaw<{ name: string; c: number }[]>`
      SELECT name, COUNT(*)::int AS c
      FROM "analytics_event"
      WHERE "createdAt" > now() - interval '7 days'
      GROUP BY name ORDER BY c DESC LIMIT 10
    `,
    prisma.dataSource.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        fileKind: true,
        status: true,
        createdAt: true,
        organization: { select: { name: true } },
      },
    }),
    prisma.application.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        organization: { select: { name: true } },
        _count: { select: { tables: true } },
      },
    }),
    prisma.$queryRaw<{ provider: string; c: number }[]>`
      SELECT COALESCE(metadata->>'provider', 'unknown') AS provider, COUNT(*)::int AS c
      FROM "analytics_event"
      WHERE name = 'schema_generated' AND "createdAt" > now() - interval '7 days'
      GROUP BY provider ORDER BY c DESC
    `,
    prisma.application.count({
      where: { status: { in: ["GENERATING", "FAILED"] } },
    }),
  ]);

  const dbOk = Array.isArray(dbStatus) && dbStatus.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#111111]">Admin</h1>
        <p className="text-sm text-[#6B7280]">
          System health and platform metrics for SheetApp operators.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wider text-[#6B7280]">Database</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-[#111111]">
              <Badge variant={dbOk ? "success" : "danger"}>{dbOk ? "OK" : "DOWN"}</Badge>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wider text-[#6B7280]">Users</p>
            <p className="mt-1 text-2xl font-semibold text-[#111111]">{users}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wider text-[#6B7280]">Workspaces</p>
            <p className="mt-1 text-2xl font-semibold text-[#111111]">{orgs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wider text-[#6B7280]">Records</p>
            <p className="mt-1 text-2xl font-semibold text-[#111111]">{records}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              Generation jobs
              {failedJobs > 0 && (
                <Badge variant="warning">{failedJobs} stuck/failed</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generationJobs.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No applications generated yet.</p>
            ) : (
              <ul className="space-y-2">
                {generationJobs.map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-[#111111]">
                      {job.name}
                      <span className="block truncate text-xs text-[#6B7280]">
                        {job.organization.name} · {job._count.tables} tables ·{" "}
                        {job.createdAt.toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                    <Badge variant={job.status === "READY" ? "success" : "warning"}>
                      {job.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Uploaded files</CardTitle>
          </CardHeader>
          <CardContent>
            {recentFiles.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No uploads yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentFiles.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-[#111111]">
                      {file.fileName}
                      <span className="block truncate text-xs text-[#6B7280]">
                        {file.organization.name} · {(file.fileSize / 1024).toFixed(0)} KB ·{" "}
                        {file.fileKind}
                      </span>
                    </span>
                    <Badge variant={file.status === "IMPORTED" ? "success" : "neutral"}>
                      {file.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI usage — last 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            {aiUsage.length === 0 ? (
              <p className="text-sm text-[#6B7280]">
                No schema generations yet. Deterministic is the default; AI runs only with a key configured.
              </p>
            ) : (
              <ul className="space-y-2">
                {aiUsage.map((row) => (
                  <li
                    key={row.provider}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-[#111111]">{row.provider}</span>
                    <span className="tabular-nums font-medium text-[#111111]">
                      {row.c}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Product analytics — last 7 days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventTotals.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No events in the last 7 days.</p>
            ) : (
              <ul className="space-y-2">
                {eventTotals.map((event) => (
                  <li
                    key={event.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-[#111111]">{event.name}</span>
                    <span className="tabular-nums font-medium text-[#111111]">
                      {event.c}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent errors</CardTitle>
          </CardHeader>
          <CardContent>
            {recentErrors.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No errors logged. All clear.</p>
            ) : (
              <ul className="space-y-3">
                {recentErrors.map((error) => (
                  <li key={error.id} className="border-b border-[#F0F1F3] pb-2 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={error.level === "error" ? "danger" : "warning"}>
                        {error.level}
                      </Badge>
                      <span className="text-[11px] text-[#6B7280]">
                        {error.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#111111]">{error.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Storage</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#6B7280]">
          {dataSources} uploaded spreadsheet{dataSources === 1 ? "" : "s"} stored in{" "}
          <code className="rounded bg-[#F8F9FA] px-1 py-0.5 text-xs">.data/uploads</code>.
        </CardContent>
      </Card>
    </div>
  );
}
