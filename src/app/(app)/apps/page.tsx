import Link from "next/link";
import { ChevronRight, Grid3X3 } from "lucide-react";
import { requireOrg } from "@/lib/auth/guards";
import { getAppRecordCounts, getOrgApps } from "@/lib/data/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Apps",
  description: "Every app generated from your spreadsheets, in one place.",
};

/** Application gallery: every generated app in the workspace. */
export default async function AppsPage() {
  const ctx = await requireOrg();

  // Shared (per-request cached) with the app shell: no extra COUNT queries.
  const [applications, countMap] = await Promise.all([
    getOrgApps(ctx.orgId),
    getAppRecordCounts(ctx.orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#111111]">Apps</h1>
        <p className="text-sm text-[#6B7280]">
          {applications.length} app{applications.length === 1 ? "" : "s"} in this workspace
        </p>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          title="No apps yet"
          description="Upload a spreadsheet from the dashboard to generate your first app."
          action={
            <Link
              href="/onboarding"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#111111] px-4 text-sm font-medium text-white hover:bg-[#333333]"
            >
              Upload Spreadsheet
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Grid3X3 className="h-4 w-4 text-[#6B7280]" />
                    {app.name}
                  </CardTitle>
                  <Badge variant={app.status === "READY" ? "success" : "warning"}>
                    {app.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-[#6B7280]">
                  {app.tables.length} table{app.tables.length === 1 ? "" : "s"} ·{" "}
                  {(countMap.get(app.id) ?? 0).toLocaleString()} records
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {app.tables.map((table) => (
                    <Link
                      key={table.id}
                      href={`/tables/${table.id}`}
                      className="rounded-md border border-[#E5E7EB] px-2 py-1 text-xs font-medium text-[#111111] hover:bg-[#F8F9FA]"
                    >
                      {table.label}
                    </Link>
                  ))}
                </div>
                <Link
                  href={app.tables[0] ? `/tables/${app.tables[0].id}` : "/dashboard"}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#111111] hover:underline"
                >
                  Open app <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
