import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveActiveOrgId } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { can, PermissionError, type Role } from "@/lib/auth/permissions";
import { listRecords, type RecordFilter, type FilterOp } from "@/lib/data/records";
import { toCsv } from "@/lib/security/csv";
import { toXlsx } from "@/lib/security/xlsx";
import { rateLimit } from "@/lib/security/rate-limit";

const EXPORT_PAGE_SIZE = 100;
const EXPORT_MAX_ROWS = 5000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!rateLimit(`export:${session.user.id}`, { limit: 10, windowMs: 60_000 })) {
      return NextResponse.json({ error: "Too many exports" }, { status: 429 });
    }

    const orgId = await resolveActiveOrgId(session.user.id);
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: session.user.id } },
    });
    if (!membership || !can(membership.role as Role, "record:export")) {
      throw new PermissionError();
    }

    const { tableId } = await params;
    const table = await prisma.generatedTable.findFirst({
      where: { id: tableId, organizationId: orgId },
      include: { fields: { orderBy: { position: "asc" } } },
    });
    if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const url = new URL(req.url);
    const search = url.searchParams.get("search") ?? undefined;
    let filters: RecordFilter[] = [];
    try {
      const raw = url.searchParams.get("filters");
      if (raw) {
        const parsed = JSON.parse(raw) as { field: string; op: string; value?: unknown }[];
        filters = parsed
          .filter((f) => typeof f.field === "string" && typeof f.op === "string")
          .map((f) => ({ field: f.field, op: f.op as FilterOp, value: f.value as RecordFilter["value"] }));
      }
    } catch {
      filters = [];
    }
    const sortField = url.searchParams.get("sort");
    const sortDir = url.searchParams.get("dir") === "asc" ? "asc" : "desc";

    const rows: Record<string, unknown>[] = [];
    let page = 1;
    let total = 0;
    while (rows.length < EXPORT_MAX_ROWS) {
      const result = await listRecords({
        orgId,
        tableId,
        fields: table.fields,
        search,
        filters,
        sort: sortField ? { field: sortField, dir: sortDir } : undefined,
        page,
        pageSize: EXPORT_PAGE_SIZE,
      });
      total = result.total;
      rows.push(
        ...result.rows.map((r) => ({ ...r.data, __created: r.createdAt.toISOString() }))
      );
      if (rows.length >= total || result.rows.length === 0) break;
      page += 1;
    }

    const createdField = { name: "__created", label: "Created" } as Parameters<
      typeof toCsv
    >[0][number];
    const exportFields = [...table.fields, createdField];
    const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    const baseName = table.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

    if (format === "xlsx") {
      const xlsx = toXlsx(exportFields, rows.slice(0, EXPORT_MAX_ROWS), table.label);
      return new NextResponse(new Uint8Array(xlsx), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const csv = toCsv(exportFields, rows.slice(0, EXPORT_MAX_ROWS));
    const filename = `${baseName}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[SheetApp] export failed:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
