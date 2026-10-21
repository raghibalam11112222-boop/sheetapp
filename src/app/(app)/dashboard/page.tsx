import Link from "next/link";
import { ChevronRight, Database, FileSpreadsheet, Grid3X3, Plus } from "lucide-react";
import { requireOrg } from "@/lib/auth/guards";
import { getAppRecordCounts, getOrgApps } from "@/lib/data/shell";
import { getDashboardStats, type DashboardStats } from "@/lib/data/stats";
import { formatMoney, formatCompact } from "@/lib/security/csv";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityChart } from "@/components/dashboard/activity-chart";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard",
  description: "Your workspace overview: applications, records, and recent activity.",
};

export default async function DashboardPage() {
  const ctx = await requireOrg();

  // Shared (per-request cached) with the app shell: no extra COUNT queries.
  const [applications, appCountMap] = await Promise.all([
    getOrgApps(ctx.orgId, 20),
    getAppRecordCounts(ctx.orgId),
  ]);

  // Total derives from the per-app counts above — no third org-wide COUNT.
  const totalRecords = [...appCountMap.values()].reduce((sum, c) => sum + c, 0);

  if (applications.length === 0) {
    return (
      <div className="pt-6">
        <EmptyState
          icon={<FileSpreadsheet className="h-5 w-5" />}
          title="No applications yet."
          description="Upload your first spreadsheet and we'll turn it into an internal app."
          action={
            <div className="flex gap-2">
              <Link
                href="/onboarding"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#111111] px-4 text-sm font-medium text-white hover:bg-[#333333]"
              >
                <Plus className="h-4 w-4" /> Upload Spreadsheet
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const primary = applications[0];
  const stats: DashboardStats = await getDashboardStats(
    ctx.orgId,
    primary.id,
    ""
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = ctx.userName.split(" ").filter(Boolean)[0] ?? ctx.userName;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#111111]">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-[#6B7280]">
          {applications.length} app{applications.length === 1 ? "" : "s"} ·{" "}
          {totalRecords.toLocaleString()} records
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <Grid3X3 className="h-4 w-4" /> Applications
            </div>
            <p className="mt-1 text-2xl font-semibold text-[#111111]">
              {applications.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <Database className="h-4 w-4" /> Tables
            </div>
            <p className="mt-1 text-2xl font-semibold text-[#111111]">
              {applications.reduce((sum, a) => sum + a.tables.length, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <FileSpreadsheet className="h-4 w-4" /> Records
            </div>
            <p className="mt-1 text-2xl font-semibold text-[#111111]">
              {totalRecords.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {stats.statusHighlights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {stats.statusHighlights.map((h) => (
                <li
                  key={`${h.table}-${h.value}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] px-3 py-2.5"
                >
                  <span className="min-w-0 text-sm text-[#6B7280]">
                    <span className="block truncate font-medium text-[#111111]">{h.value}</span>
                    <span className="block truncate text-xs">{h.table}</span>
                  </span>
                  <span className="text-xl font-semibold text-[#111111]">{h.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              New records — last 7 days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart data={stats.daily} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Money by the numbers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.currencyTotals.length === 0 ? (
              <p className="text-sm text-[#6B7280]">
                Currency columns in your tables will be summed here automatically.
              </p>
            ) : (
              stats.currencyTotals.map((item) => (
                <div key={`${item.table}-${item.field}`} className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">
                    {item.field}
                    <span className="block text-[11px] text-[#6B7280]">{item.table}</span>
                  </span>
                  <span className="text-sm font-semibold text-[#111111]">
                    {formatMoney(item.total)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {applications.map((app) => (
              <Link
                key={app.id}
                href={app.tables[0] ? `/tables/${app.tables[0].id}` : "/dashboard"}
                className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] px-3 py-2.5 hover:bg-[#F8F9FA]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F8F9FA] text-[#6B7280]">
                  <Grid3X3 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#111111]">
                    {app.name}
                  </span>
                  <span className="block text-xs text-[#6B7280]">
                    {app.tables.length} tables · {formatCompact(appCountMap.get(app.id) ?? 0)} records
                  </span>
                </span>
                <Badge variant={app.status === "READY" ? "success" : "warning"}>
                  {app.status}
                </Badge>
                <ChevronRight className="h-4 w-4 text-[#6B7280]" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {primary.name} — tables
              </CardTitle>
              <Badge variant="neutral">{formatCompact(stats.totalRecords)} records</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.tables.map((table) => (
              <Link
                key={table.id}
                href={`/tables/${table.id}`}
                className="flex items-center justify-between rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm hover:bg-[#F8F9FA]"
              >
                <span className="font-medium text-[#111111]">{table.label}</span>
                <span className="flex items-center gap-2 text-[#6B7280]">
                  {table.count.toLocaleString()}
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
            {stats.recent.length > 0 && (
              <div className="pt-2">
                <p className="pb-1 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                  Recent records
                </p>
                {stats.recent.slice(0, 4).map((record) => (
                  <Link
                    key={record.id}
                    href={`/tables/${record.tableId}/${record.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-[#F8F9FA]"
                  >
                    <span className="truncate text-[#111111]">{record.title}</span>
                    <span className="text-[11px] text-[#6B7280]">{record.tableLabel}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
