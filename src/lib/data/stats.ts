import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export interface DashboardStats {
  tableCount: number;
  totalRecords: number;
  tables: { id: string; label: string; count: number; href: string }[];
  currencyTotals: { table: string; field: string; total: number }[];
  /** Per-table "active" counts from status-like enum fields (e.g. Active Customers). */
  statusHighlights: { table: string; value: string; count: number }[];
  recent: { id: string; tableId: string; tableLabel: string; title: string; createdAt: string }[];
  daily: { date: string; count: number }[];
}

export async function getDashboardStats(
  orgId: string,
  applicationId: string,
  appHref: string
): Promise<DashboardStats> {
  const tables = await prisma.generatedTable.findMany({
    where: { applicationId, organizationId: orgId },
    include: { fields: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  });

  const counts = await prisma.$queryRaw<{ tableId: string; c: number }[]>(Prisma.sql`
    SELECT "tableId", COUNT(*)::int AS c
    FROM "record"
    WHERE "organizationId" = ${orgId} AND "applicationId" = ${applicationId}
    GROUP BY "tableId"
  `);
  const countMap = new Map(counts.map((r) => [r.tableId, r.c]));

  const tableStats = tables.map((t) => ({
    id: t.id,
    label: t.label,
    count: countMap.get(t.id) ?? 0,
    href: `${appHref}/tables/${t.id}`,
  }));

  const currencyTotals: DashboardStats["currencyTotals"] = [];
  const sums = await Promise.all(
    tables.slice(0, 5).map(async (table) => {
      const currencyField = table.fields.find((f) => f.type === "CURRENCY");
      if (!currencyField) return null;
      const [{ sum }] = await prisma.$queryRaw<{ sum: number | null }[]>(Prisma.sql`
        SELECT COALESCE(SUM(CASE WHEN data->>${currencyField.name} ~ '^-?[0-9.]+$'
          THEN (data->>${currencyField.name})::numeric END), 0)::float AS sum
        FROM "record"
        WHERE "organizationId" = ${orgId} AND "tableId" = ${table.id}
      `);
      return sum
        ? { table: table.label, field: currencyField.label, total: Number(sum) }
        : null;
    })
  );
  for (const row of sums) {
    if (row) currencyTotals.push(row);
  }

  const titleFields = new Map(tables.map((t) => [t.id, t.fields.find((f) => f.isTitle) ?? t.fields[0]]));
  const recentRaw = await prisma.$queryRaw<
    { id: string; tableId: string; data: Record<string, unknown>; createdAt: Date }[]
  >(Prisma.sql`
    SELECT id, "tableId", data, "createdAt"
    FROM "record"
    WHERE "organizationId" = ${orgId} AND "applicationId" = ${applicationId}
    ORDER BY "createdAt" DESC
    LIMIT 8
  `);

  const recent = recentRaw.map((r) => {
    const table = tables.find((t) => t.id === r.tableId);
    const titleField = titleFields.get(r.tableId);
    const title =
      (titleField ? (r.data[titleField.name] as string | undefined) : undefined) ??
      (table ? String(r.data[Object.keys(r.data)[0]] ?? "Untitled") : "Untitled");
    return {
      id: r.id,
      tableId: r.tableId,
      tableLabel: table?.label ?? "Records",
      title: String(title).slice(0, 60),
      createdAt: r.createdAt.toISOString(),
    };
  });

  const dailyRaw = await Prisma.sql`
    SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
    FROM "record"
    WHERE "organizationId" = ${orgId} AND "applicationId" = ${applicationId}
      AND "createdAt" > now() - interval '7 days'
    GROUP BY 1 ORDER BY 1
  `;
  const daily = await prisma.$queryRaw<{ date: string; count: number }[]>(dailyRaw);

  // Status highlights: for tables with a status-like enum field, surface the
  // dominant "active" value (Active Customers, In Stock Products, New Orders…).
  // Everything derives from the generated schema — nothing is hardcoded.
  const ACTIVE_VALUES = new Set([
    "active",
    "open",
    "new",
    "paid",
    "approved",
    "available",
    "in stock",
    "in-stock",
    "in_stock",
    "enabled",
    "true",
    "yes",
  ]);
  const STATUS_NAME = /status|state|stage|stock|availability/i;
  const statusHighlights: DashboardStats["statusHighlights"] = [];
  // Breakdowns are independent — run them concurrently, not one by one.
  const breakdowns = await Promise.all(
    tables.slice(0, 5).map(async (table) => {
      const statusField = table.fields.find(
        (f) => f.type === "ENUM" && STATUS_NAME.test(f.name)
      );
      if (!statusField) return null;
      const rows = await prisma.$queryRaw<{ v: string; c: number }[]>(Prisma.sql`
        SELECT data->>${statusField.name} AS v, COUNT(*)::int AS c
        FROM "record"
        WHERE "organizationId" = ${orgId} AND "tableId" = ${table.id}
          AND data->>${statusField.name} IS NOT NULL AND data->>${statusField.name} <> ''
        GROUP BY v ORDER BY c DESC LIMIT 20
      `);
      const top = rows.find((row) => ACTIVE_VALUES.has(row.v.toLowerCase().trim()));
      return top ? { table: table.label, value: top.v, count: top.c } : null;
    })
  );
  for (const row of breakdowns) {
    if (row) statusHighlights.push(row);
    if (statusHighlights.length >= 4) break;
  }

  return {
    tableCount: tables.length,
    totalRecords: tableStats.reduce((sum, t) => sum + t.count, 0),
    tables: tableStats,
    currencyTotals,
    statusHighlights,
    recent,
    daily,
  };
}
