import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Loads select options for RELATION fields from the target table's title field.
 */
export async function loadRelationOptions(
  orgId: string,
  fields: { id: string; type: string }[]
): Promise<Record<string, { value: string; label: string }[]>> {
  const relationFields = fields.filter((f) => f.type === "RELATION");
  const result: Record<string, { value: string; label: string }[]> = {};

  for (const field of relationFields) {
    const relationship = await prisma.relationship.findFirst({
      where: { fromFieldId: field.id, organizationId: orgId },
    });
    if (!relationship) continue;
    const target = await prisma.generatedTable.findFirst({
      where: { id: relationship.toTableId, organizationId: orgId },
      include: { fields: { orderBy: { position: "asc" } } },
    });
    if (!target) continue;
    const titleField = target.fields.find((f) => f.isTitle) ?? target.fields[0];
    if (!titleField) continue;

    const rows = await prisma.$queryRaw<{ id: string; data: Record<string, unknown> }[]>(Prisma.sql`
      SELECT id, data FROM "record"
      WHERE "organizationId" = ${orgId} AND "tableId" = ${target.id}
      ORDER BY "createdAt" DESC
      LIMIT 200
    `);

    result[field.id] = rows.map((row) => {
      const label = String(row.data[titleField.name] ?? row.id).slice(0, 80);
      return { value: label, label };
    });
  }

  return result;
}
