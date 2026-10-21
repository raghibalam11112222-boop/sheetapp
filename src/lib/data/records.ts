import { Prisma, type GeneratedField } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type FilterOp =
  | "eq"
  | "neq"
  | "contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "empty"
  | "not_empty";

export interface RecordFilter {
  field: string;
  op: FilterOp;
  value?: string | number | boolean | Array<string | number>;
}

export interface ListRecordsOptions {
  orgId: string;
  tableId: string;
  fields: GeneratedField[];
  search?: string;
  filters?: RecordFilter[];
  sort?: { field: string; dir: "asc" | "desc" };
  page?: number;
  pageSize?: number;
}

export interface RecordRow {
  id: string;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NUMERIC_TYPES = new Set(["NUMBER", "CURRENCY", "PERCENT"]);
const TEXT_SEARCH_LIMIT = 8;

function fieldByName(fields: GeneratedField[], name: string) {
  return fields.find((f) => f.name === name);
}

function valueExpr(field: GeneratedField): Prisma.Sql {
  return Prisma.sql`(data->>${field.name})`;
}

function sortExpr(field: GeneratedField): Prisma.Sql {
  if (NUMERIC_TYPES.has(field.type)) {
    return Prisma.sql`CASE WHEN ${valueExpr(field)} ~ '^-?[0-9.]+$' THEN (${valueExpr(field)})::numeric END`;
  }
  if (field.type === "BOOLEAN") return Prisma.sql`(${valueExpr(field)})::boolean`;
  return Prisma.sql`lower(${valueExpr(field)})`;
}

function filterSql(field: GeneratedField, filter: RecordFilter): Prisma.Sql | null {
  const expr = valueExpr(field);
  const numeric = NUMERIC_TYPES.has(field.type);

  switch (filter.op) {
    case "empty":
      return Prisma.sql`(${expr} IS NULL OR ${expr} = '')`;
    case "not_empty":
      return Prisma.sql`(${expr} IS NOT NULL AND ${expr} <> '')`;
    case "contains": {
      const q = String(filter.value ?? "")
        .replace(/[%_]/g, "")
        .toLowerCase();
      if (!q) return null;
      return Prisma.sql`lower(coalesce(${expr}, '')) LIKE ${`%${q}%`}`;
    }
    case "in": {
      const values = Array.isArray(filter.value) ? filter.value : [filter.value];
      const cleaned = values
        .map((v) => String(v ?? ""))
        .filter((v) => v !== "")
        .slice(0, 50);
      if (!cleaned.length) return null;
      const params = cleaned.map((v) => Prisma.sql`${v}`);
      return Prisma.sql`${expr} IN (${Prisma.join(params)})`;
    }
    case "eq":
    case "neq":
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const raw = filter.value;
      if (raw === undefined || raw === null || raw === "") return null;
      if (numeric) {
        const n = Number(raw);
        if (!Number.isFinite(n)) return null;
        const op = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=" }[
          filter.op
        ];
        const guarded = Prisma.sql`CASE WHEN ${expr} ~ '^-?[0-9.]+$' THEN (${expr})::numeric END`;
        return Prisma.sql`${guarded} ${Prisma.raw(op)} ${n}`;
      }
      const op = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=" }[filter.op];
      const comparison =
        filter.op === "eq"
          ? Prisma.sql`${expr} = ${String(raw)}`
          : filter.op === "neq"
            ? Prisma.sql`(${expr} IS DISTINCT FROM ${String(raw)})`
            : Prisma.sql`coalesce(${expr}, '') ${Prisma.raw(op)} ${String(raw)}`;
      return comparison;
    }
    default:
      return null;
  }
}

/** Server-side record query with search, filters, sorting and pagination. */
export async function listRecords(opts: ListRecordsOptions): Promise<{
  rows: RecordRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { orgId, tableId, fields } = opts;
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(Math.max(1, opts.pageSize ?? 25), 100);
  const offset = (page - 1) * pageSize;

  const wheres: Prisma.Sql[] = [
    Prisma.sql`"organizationId" = ${orgId} AND "tableId" = ${tableId}`,
  ];

  const search = opts.search?.trim().replace(/[%_]/g, "");
  if (search) {
    const searchable = fields
      .filter((f) => f.searchable && f.type !== "NUMBER" && f.type !== "CURRENCY")
      .slice(0, TEXT_SEARCH_LIMIT);
    if (searchable.length) {
      const parts = searchable.map(
        (f) => Prisma.sql`lower(coalesce(data->>${f.name}, '')) LIKE ${`%${search.toLowerCase()}%`}`
      );
      wheres.push(Prisma.sql`(${Prisma.join(parts, " OR ")})`);
    }
  }

  for (const filter of opts.filters ?? []) {
    const field = fieldByName(fields, filter.field);
    if (!field) continue;
    const sql = filterSql(field, filter);
    if (sql) wheres.push(Prisma.sql`(${sql})`);
  }

  let orderBy: Prisma.Sql = Prisma.sql`"createdAt" DESC`;
  if (opts.sort?.field) {
    const field = fieldByName(fields, opts.sort.field);
    if (field) {
      const dir = opts.sort.dir === "asc" ? Prisma.raw("ASC") : Prisma.raw("DESC");
      orderBy = Prisma.sql`${sortExpr(field)} ${dir} NULLS LAST, id ASC`;
    }
  }

  const where = Prisma.join(wheres, " AND ");
  // Total must not depend on the page window: COUNT(*) OVER() is absent when
  // the page is empty, so count separately (still a single indexed query).
  const [{ count: total }] = await prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
    SELECT COUNT(*)::int AS count
    FROM "record"
    WHERE ${where}
  `);
  const rows = await prisma.$queryRaw<
    {
      id: string;
      data: Record<string, unknown>;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >(Prisma.sql`
    SELECT id, data, "createdAt", "updatedAt"
    FROM "record"
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ${pageSize} OFFSET ${offset}
  `);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      data: row.data,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    total,
    page,
    pageSize,
  };
}

export async function getRecordRow(orgId: string, recordId: string) {
  return prisma.record.findFirst({
    where: { id: recordId, organizationId: orgId },
  });
}

/** Returns the field name that conflicts with an existing unique value, if any. */
export async function findUniqueConflict(opts: {
  orgId: string;
  tableId: string;
  fields: GeneratedField[];
  data: Record<string, unknown>;
  excludeRecordId?: string;
}): Promise<string | null> {
  const { orgId, tableId, fields, data, excludeRecordId } = opts;
  for (const field of fields) {
    if (!field.unique) continue;
    const value = data[field.name];
    if (value === null || value === undefined || value === "") continue;
    const match = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM "record"
      WHERE "organizationId" = ${orgId} AND "tableId" = ${tableId}
        AND lower(coalesce(data->>${field.name}, '')) = lower(${String(value)})
        AND id <> ${excludeRecordId ?? ""}
      LIMIT 1
    `);
    if (match.length) return field.name;
  }
  return null;
}
