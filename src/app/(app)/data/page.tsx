import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { Database, Table2 } from "lucide-react";
import { requireOrg } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Data",
  description: "Browse every table across all of your applications.",
};

/** Org-wide data overview: every table across all applications. */
export default async function DataPage() {
  const ctx = await requireOrg();

  const tables = await prisma.generatedTable.findMany({
    where: { organizationId: ctx.orgId },
    include: {
      application: { select: { id: true, name: true, status: true } },
      fields: { select: { id: true }, orderBy: { position: "asc" } },
    },
    orderBy: [{ application: { createdAt: "desc" } }, { position: "asc" }],
  });

  const counts = tables.length
    ? await prisma.$queryRaw<{ tableId: string; c: number }[]>(Prisma.sql`
        SELECT "tableId", COUNT(*)::int AS c
        FROM "record"
        WHERE "organizationId" = ${ctx.orgId}
        GROUP BY "tableId"
      `)
    : [];
  const countMap = new Map(counts.map((r) => [r.tableId, r.c]));
  const totalRecords = [...countMap.values()].reduce((sum, c) => sum + c, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#111111]">Data</h1>
        <p className="text-sm text-[#6B7280]">
          {tables.length} table{tables.length === 1 ? "" : "s"} ·{" "}
          {totalRecords.toLocaleString()} records across your apps
        </p>
      </div>

      {tables.length === 0 ? (
        <EmptyState
          icon={<Database className="h-5 w-5" />}
          title="No tables yet"
          description="Generate an app from a spreadsheet and its tables will show up here."
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">All tables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tables.map((table) => (
              <Link
                key={table.id}
                href={`/tables/${table.id}`}
                className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] px-3 py-2.5 hover:bg-[#F8F9FA]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#F8F9FA] text-[#6B7280]">
                  <Table2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#111111]">
                    {table.label}
                  </span>
                  <span className="block truncate text-xs text-[#6B7280]">
                    {table.application.name} · {table.fields.length} fields
                  </span>
                </span>
                <Badge variant="neutral">
                  {(countMap.get(table.id) ?? 0).toLocaleString()} records
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
