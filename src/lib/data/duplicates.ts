import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { normalizeDuplicateKey } from "@/lib/spreadsheet/duplicates";

export interface LiveDuplicateRecord {
  id: string;
  title: string;
  createdAt: string;
}

export interface LiveDuplicateGroup {
  key: string;
  values: string[];
  records: LiveDuplicateRecord[];
}

export interface DismissedGroup extends LiveDuplicateGroup {
  decision: "KEPT_SEPARATE" | "IGNORED";
}

const MAX_RECORDS_SCANNED = 2000;
const MAX_GROUPS = 20;
const MAX_RECORDS_PER_GROUP = 10;

/**
 * Merges a duplicate group into a single value set: the master (oldest)
 * record wins, blanks are backfilled from the other records (app.txt §17).
 * Pure function — unit tested.
 */
export function mergeRecordData(
  records: { data: Record<string, unknown> }[]
): Record<string, unknown> {
  // Newest first so the oldest (master) record overwrites on conflicts.
  const result: Record<string, unknown> = {};
  for (const record of [...records].reverse()) {
    for (const [key, value] of Object.entries(record.data ?? {})) {
      if (value === null || value === undefined || String(value).trim() === "") continue;
      result[key] = value;
    }
  }
  return result;
}

/**
 * Finds live duplicate groups for a table by normalizing title values
 * (case, punctuation and corporate suffixes ignored). Groups with a stored
 * decision are returned separately so they can be reopened.
 *
 * Pass `fields` when the caller already loaded them (e.g. the table page)
 * to skip a redundant table query. Only the title column is fetched —
 * never full record JSON.
 */
export async function loadDuplicateGroups(
  orgId: string,
  tableId: string,
  opts?: { fields?: { name: string; isTitle: boolean }[] }
): Promise<{ groups: LiveDuplicateGroup[]; dismissed: DismissedGroup[] }> {
  const fields =
    opts?.fields ??
    (
      await prisma.generatedTable.findFirst({
        where: { id: tableId, organizationId: orgId },
        include: { fields: { orderBy: { position: "asc" } } },
      })
    )?.fields;
  const titleField = fields?.find((f) => f.isTitle) ?? fields?.[0];
  if (!fields || !titleField) return { groups: [], dismissed: [] };

  const rows = await prisma.$queryRaw<{ id: string; title: string | null; createdAt: Date }[]>(
    Prisma.sql`
      SELECT id, data->>${titleField.name} AS title, "createdAt"
      FROM "record"
      WHERE "organizationId" = ${orgId} AND "tableId" = ${tableId}
      ORDER BY "createdAt" ASC
      LIMIT ${MAX_RECORDS_SCANNED}
    `
  );

  const buckets = new Map<string, { values: Set<string>; recs: LiveDuplicateRecord[] }>();
  for (const row of rows) {
    const text = (row.title ?? "").trim();
    if (text.length < 2) continue;
    const key = normalizeDuplicateKey(text);
    if (!key) continue;
    const bucket = buckets.get(key) ?? { values: new Set<string>(), recs: [] };
    bucket.values.add(text);
    bucket.recs.push({ id: row.id, title: text.slice(0, 80), createdAt: row.createdAt.toISOString() });
    buckets.set(key, bucket);
  }

  const decisions = await prisma.duplicateDecision.findMany({
    where: { organizationId: orgId, tableId },
  });
  const decided = new Map(decisions.map((d) => [d.key, d.decision]));

  const groups: LiveDuplicateGroup[] = [];
  const dismissed: DismissedGroup[] = [];
  for (const [key, bucket] of buckets) {
    if (bucket.recs.length < 2) continue;
    const entry = {
      key,
      values: [...bucket.values].slice(0, MAX_RECORDS_PER_GROUP),
      records: bucket.recs,
    };
    const decision = decided.get(key);
    if (decision) dismissed.push({ ...entry, decision });
    else groups.push(entry);
  }

  groups.sort((a, b) => b.records.length - a.records.length);
  return { groups: groups.slice(0, MAX_GROUPS), dismissed: dismissed.slice(0, MAX_GROUPS) };
}
