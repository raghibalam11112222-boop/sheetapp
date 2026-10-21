import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireOrg, can } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { loadRelationOptions } from "@/lib/data/relation-options";
import { RecordForm } from "@/components/records/record-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New record",
  description: "Add a new record to your table.",
};

export default async function NewRecordPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const ctx = await requireOrg();
  const { tableId } = await params;

  const table = await prisma.generatedTable.findFirst({
    where: { id: tableId, organizationId: ctx.orgId },
    include: { fields: { orderBy: { position: "asc" } } },
  });
  if (!table) notFound();
  if (!can(ctx.role, "record:create")) redirect(`/tables/${tableId}`);

  const relationOptions = await loadRelationOptions(ctx.orgId, table.fields);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href={`/tables/${tableId}`}
          className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#111111]"
        >
          <ChevronLeft className="h-3 w-3" /> {table.label}
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#111111]">
          Add {table.name}
        </h1>
        <p className="text-sm text-[#6B7280]">Add a new {table.name} to {table.label}.</p>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <RecordForm
          tableId={tableId}
          fields={table.fields}
          relationOptions={relationOptions}
          redirectHref={`/tables/${tableId}`}
          onCancelHref={`/tables/${tableId}`}
          submitLabel={`Create ${table.name}`}
        />
      </div>
    </div>
  );
}
