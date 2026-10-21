import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export interface RelatedGroup {
  tableId: string;
  tableLabel: string;
  fieldLabel: string;
  records: { id: string; title: string }[];
}

/**
 * Finds records in other tables whose RELATION field points at this record's
 * title value (relation fields store the target's title string).
 */
export async function loadRelatedRecords(
  orgId: string,
  targetTableId: string,
  titleValue: string
): Promise<RelatedGroup[]> {
  const value = titleValue.trim();
  if (!value) return [];

  const relationships = await prisma.relationship.findMany({
    where: { organizationId: orgId, toTableId: targetTableId },
    include: {
      fromTable: { include: { fields: { orderBy: { position: "asc" } } } },
    },
    take: 6,
  });

  const groups: RelatedGroup[] = [];
  for (const rel of relationships) {
    const field = rel.fromTable.fields.find((f) => f.id === rel.fromFieldId);
    if (!field) continue;
    const titleField =
      rel.fromTable.fields.find((f) => f.isTitle) ?? rel.fromTable.fields[0];
    if (!titleField) continue;

    const rows = await prisma.$queryRaw<{ id: string; data: Record<string, unknown> }[]>(
      Prisma.sql`
        SELECT id, data FROM "record"
        WHERE "organizationId" = ${orgId} AND "tableId" = ${rel.fromTable.id}
          AND lower(coalesce(data->>${field.name}, '')) = lower(${value})
        ORDER BY "createdAt" DESC
        LIMIT 5
      `
    );
    if (!rows.length) continue;

    groups.push({
      tableId: rel.fromTable.id,
      tableLabel: rel.fromTable.label,
      fieldLabel: field.label,
      records: rows.map((row) => ({
        id: row.id,
        title: String(row.data[titleField.name] ?? row.id).slice(0, 80),
      })),
    });
  }

  return groups;
}
