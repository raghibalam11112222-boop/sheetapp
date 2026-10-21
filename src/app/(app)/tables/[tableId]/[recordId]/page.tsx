import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { requireOrg, can } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { loadRelationOptions } from "@/lib/data/relation-options";
import { loadRelatedRecords } from "@/lib/data/related";
import { RecordForm } from "@/components/records/record-form";
import { DetailTabs } from "@/components/records/detail-tabs";
import { RecordCell } from "@/components/records/cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteRecordButton } from "./delete-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Record",
  description: "View and edit a single record.",
};

export default async function RecordDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tableId: string; recordId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const ctx = await requireOrg();
  const { tableId, recordId } = await params;
  const sp = await searchParams;

  const [table, record] = await Promise.all([
    prisma.generatedTable.findFirst({
      where: { id: tableId, organizationId: ctx.orgId },
      include: { fields: { orderBy: { position: "asc" } } },
    }),
    prisma.record.findFirst({
      where: { id: recordId, organizationId: ctx.orgId, tableId },
    }),
  ]);
  if (!table || !record) notFound();

  const editing = sp.edit === "1" && can(ctx.role, "record:update");
  const data = record.data as Record<string, unknown>;
  const titleField = table.fields.find((f) => f.isTitle) ?? table.fields[0];
  const title = titleField ? String(data[titleField.name] ?? "Untitled") : "Untitled";
  const statusField = table.fields.find(
    (f) => f.type === "ENUM" && /status|state|stage/i.test(f.name)
  );
  const statusValue = statusField ? String(data[statusField.name] ?? "") : "";

  const [relationOptions, auditLogs, relatedGroups] = await Promise.all([
    loadRelationOptions(ctx.orgId, table.fields),
    prisma.auditLog.findMany({
      where: { organizationId: ctx.orgId, entityId: recordId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { actor: { select: { name: true, email: true } } },
    }),
    loadRelatedRecords(ctx.orgId, tableId, title),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/tables/${tableId}`}
            className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#111111]"
          >
            <ChevronLeft className="h-3 w-3" /> {table.label}
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-[#111111]">
            {title}
            {statusValue && <Badge variant="neutral">{statusValue}</Badge>}
          </h1>
          <p className="text-xs text-[#6B7280]">
            Created {record.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })} ·
            Updated {record.updatedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can(ctx.role, "record:update") && (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/tables/${tableId}/${recordId}${editing ? "" : "?edit=1"}`}>
                <Pencil className="h-3.5 w-3.5" />
                {editing ? "View" : "Edit"}
              </Link>
            </Button>
          )}
          {can(ctx.role, "record:delete") && (
            <DeleteRecordButton tableId={tableId} recordId={recordId} />
          )}
        </div>
      </div>

      {editing ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
          <RecordForm
            tableId={tableId}
            fields={table.fields}
            initial={data}
            recordId={recordId}
            relationOptions={relationOptions}
            redirectHref={`/tables/${tableId}/${recordId}`}
            onCancelHref={`/tables/${tableId}/${recordId}`}
            submitLabel={`Save ${table.name}`}
          />
        </div>
      ) : (
        <DetailTabs
          tabs={[
            {
              id: "overview",
              label: "Overview",
              content: (
                <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    {table.fields.map((field) => (
                      <div key={field.name} className={field.type === "LONG_TEXT" ? "sm:col-span-2" : undefined}>
                        <dt className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                          {field.label}
                        </dt>
                        <dd className="mt-1 text-sm">
                          <RecordCell field={field} value={data[field.name]} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ),
            },
            ...relatedGroups.map((group) => ({
              id: `related-${group.tableId}`,
              label: group.tableLabel,
              content: (
                <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                    {group.tableLabel} · by {group.fieldLabel}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {group.records.map((related) => (
                      <li key={related.id}>
                        <Link
                          href={`/tables/${group.tableId}/${related.id}`}
                          className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-[#111111] hover:bg-[#F8F9FA]"
                        >
                          <span className="truncate">{related.title}</span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#6B7280]" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            })),
            {
              id: "activity",
              label: "Activity",
              content: (
                <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
                  {auditLogs.length === 0 ? (
                    <p className="text-sm text-[#6B7280]">
                      No activity yet. Creations and edits will appear here.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {auditLogs.map((log) => (
                        <li key={log.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-[#111111]">{log.action.split(".").join(" ")}</span>
                          <span className="flex items-center gap-2">
                            <Badge variant="neutral">{log.actor?.name ?? "System"}</Badge>
                            <span className="text-[11px] text-[#6B7280]">
                              {log.createdAt.toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
