import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireOrg, can } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { listRecords, type RecordFilter, type FilterOp } from "@/lib/data/records";
import { loadDuplicateGroups } from "@/lib/data/duplicates";
import { DataTable } from "@/components/records/data-table";
import { DuplicatesCard } from "@/components/records/duplicates-card";
import { ManageFields } from "@/components/records/manage-fields";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Table",
  description: "Search, filter, and manage your table records.",
};

function parseFilters(raw?: string): RecordFilter[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { field: string; op: string; value?: unknown }[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((f) => f && typeof f.field === "string" && typeof f.op === "string")
      .slice(0, 8)
      .map((f) => ({ field: f.field, op: f.op as FilterOp, value: f.value as RecordFilter["value"] }));
  } catch {
    return [];
  }
}

export default async function TablePage({
  params,
  searchParams,
}: {
  params: Promise<{ tableId: string }>;
  searchParams: Promise<{ q?: string; page?: string; sort?: string; dir?: string; filters?: string }>;
}) {
  const ctx = await requireOrg();
  const { tableId } = await params;
  const sp = await searchParams;

  const table = await prisma.generatedTable.findFirst({
    where: { id: tableId, organizationId: ctx.orgId },
    include: {
      fields: { orderBy: { position: "asc" } },
      application: { select: { id: true, name: true } },
    },
  });
  if (!table) notFound();

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const filters = parseFilters(sp.filters);
  const sortField = sp.sort ? table.fields.find((f) => f.name === sp.sort) : undefined;
  const sort: { field: string; dir: "asc" | "desc" } | undefined =
    sortField && sortField.sortable
      ? { field: sortField.name, dir: sp.dir === "asc" ? "asc" : "desc" }
      : undefined;

  const { rows, total, pageSize } = await listRecords({
    orgId: ctx.orgId,
    tableId,
    fields: table.fields,
    search: sp.q,
    filters,
    sort,
    page,
    pageSize: 25,
  });

  // Table + fields already loaded above — reuse them, and only the title
  // column is fetched for duplicate detection (never full record JSON).
  const { groups: duplicateGroups, dismissed: dismissedGroups } = await loadDuplicateGroups(
    ctx.orgId,
    tableId,
    { fields: table.fields.map((f) => ({ name: f.name, isTitle: f.isTitle })) }
  );

  const [siblings, tableRelationships] = await Promise.all([
    prisma.generatedTable.findMany({
      where: { applicationId: table.applicationId, organizationId: ctx.orgId, id: { not: tableId } },
      orderBy: { position: "asc" },
      select: {
        id: true,
        label: true,
        fields: { orderBy: { position: "asc" }, select: { id: true, name: true, label: true } },
      },
    }),
    prisma.relationship.findMany({
      where: {
        organizationId: ctx.orgId,
        OR: [{ fromTableId: tableId }, { toTableId: tableId }],
      },
      include: {
        fromTable: { select: { id: true, label: true } },
        toTable: { select: { id: true, label: true } },
      },
    }),
  ]);
  const relationshipViews = tableRelationships.map((rel) => {
    const outgoing = rel.fromTableId === tableId;
    if (outgoing) {
      return {
        id: rel.id,
        direction: "outgoing" as const,
        fieldLabel: table.fields.find((f) => f.id === rel.fromFieldId)?.label ?? "field",
        otherTableLabel: rel.toTable.label,
      };
    }
    return {
      id: rel.id,
      direction: "incoming" as const,
      fieldLabel: table.label,
      otherTableLabel: rel.fromTable.label,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#111111]"
          >
            <ChevronLeft className="h-3 w-3" /> Dashboard
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#111111]">
            {table.label}
          </h1>
          <p className="text-sm text-[#6B7280]">
            {table.application.name}
            {table.description ? ` · ${table.description}` : ""}
          </p>
        </div>
        {can(ctx.role, "app:edit") && (
          <ManageFields
            tableId={table.id}
            tableLabel={table.label}
            fields={table.fields.map((f) => ({
              id: f.id,
              name: f.name,
              label: f.label,
              type: f.type,
              required: f.required,
              unique: f.unique,
              isTitle: f.isTitle,
            }))}
            siblings={siblings.map((t) => ({
              id: t.id,
              label: t.label,
              fields: t.fields.map((f) => ({ id: f.id, name: f.name, label: f.label })),
            }))}
            relationships={relationshipViews}
          />
        )}
      </div>

      <DuplicatesCard
        tableId={table.id}
        groups={duplicateGroups}
        dismissed={dismissedGroups}
        canManage={can(ctx.role, "record:update") && can(ctx.role, "record:delete")}
      />

      <DataTable
        tableId={table.id}
        singularLabel={table.name}
        fields={table.fields}
        rows={rows.map(({ id, data, createdAt }) => ({
          id,
          data,
          createdAt: createdAt.toISOString(),
        }))}
        total={total}
        page={page}
        pageSize={pageSize}
        search={sp.q ?? ""}
        sort={sort}
        filters={filters}
        canCreate={can(ctx.role, "record:create")}
        canEdit={can(ctx.role, "record:update")}
        canDelete={can(ctx.role, "record:delete")}
        canExport={can(ctx.role, "record:export")}
      />
    </div>
  );
}
