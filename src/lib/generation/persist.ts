import { prisma } from "@/lib/db";
import type { SpreadsheetAnalysis } from "@/lib/spreadsheet/types";
import type { SchemaSuggestion } from "@/lib/ai/types";
import { FieldType } from "@/generated/prisma/client";

export interface PersistSchemaOptions {
  orgId: string;
  userId: string;
  dataSourceId: string | null;
  suggestion: SchemaSuggestion;
  appName?: string;
  status?: "GENERATING" | "READY";
}

/** Creates the application shell and marks the source as importing. */
export async function createApplicationShell(opts: {
  orgId: string;
  dataSourceId: string | null;
  suggestion: SchemaSuggestion;
  appName?: string;
}): Promise<{ applicationId: string }> {
  const { orgId, dataSourceId, suggestion, appName } = opts;
  const application = await prisma.application.create({
    data: {
      organizationId: orgId,
      name: (appName || suggestion.name).slice(0, 60),
      description: suggestion.description ?? null,
      status: "GENERATING",
    },
  });

  if (dataSourceId) {
    const dataSource = await prisma.dataSource.findFirst({
      where: { id: dataSourceId, organizationId: orgId },
    });
    if (!dataSource) throw new Error("Spreadsheet not found.");
    await prisma.dataSource.update({
      where: { id: dataSource.id },
      data: { applicationId: application.id, status: "IMPORTING" },
    });
  }
  return { applicationId: application.id };
}

/** Persists tables, fields and relationships for an existing application shell. */
export async function buildTables(opts: {
  orgId: string;
  applicationId: string;
  suggestion: SchemaSuggestion;
}): Promise<{ tables: number; fields: number }> {
  const { orgId, applicationId, suggestion } = opts;
  const tableKeyToId = new Map<string, string>();
  let fieldCount = 0;

  for (const [position, table] of suggestion.tables.entries()) {
    const created = await prisma.generatedTable.create({
      data: {
        applicationId,
        organizationId: orgId,
        name: table.singularLabel,
        pluralName: table.label,
        label: table.label,
        description: table.description ?? null,
        sourceSheet: table.sourceSheet,
        position,
        fields: {
          create: table.fields.map((field, index) => ({
            organizationId: orgId,
            name: field.key,
            label: field.label,
            type: field.type as FieldType,
            required: field.required,
            unique: field.unique,
            isTitle: field.isTitle,
            position: index,
            options: field.options ?? [],
            helpText: field.helpText ?? null,
            searchable: !["LONG_TEXT", "DATE", "DATETIME"].includes(field.type),
            sortable: !["LONG_TEXT"].includes(field.type),
          })),
        },
      },
      include: { fields: true },
    });
    tableKeyToId.set(table.key, created.id);
    fieldCount += created.fields.length;
  }

  for (const rel of suggestion.relationships) {
    const fromTableId = tableKeyToId.get(rel.fromTableKey);
    const toTableId = tableKeyToId.get(rel.toTableKey);
    if (!fromTableId || !toTableId) continue;
    const fromTable = suggestion.tables.find((t) => t.key === rel.fromTableKey);
    const fromField = fromTable?.fields.find((f) => f.key === rel.fromFieldKey);
    const fromFieldRow = await prisma.generatedField.findFirst({
      where: { tableId: fromTableId, name: fromField?.key ?? rel.fromFieldKey },
    });
    if (!fromFieldRow) continue;
    await prisma.relationship.create({
      data: {
        applicationId,
        organizationId: orgId,
        fromTableId,
        fromFieldId: fromFieldRow.id,
        toTableId,
        type: "ONE_TO_MANY",
        label: rel.label ?? null,
        confirmed: rel.confidence >= 0.8,
      },
    });
    // Only high-confidence relationships reshape the schema: the FK-side field
    // becomes a relation picker. Low-confidence (often reverse-direction)
    // suggestions stay as plain fields so titles/identifiers keep working.
    if (rel.confidence < 0.8) continue;
    await prisma.generatedField.update({
      where: { id: fromFieldRow.id },
      data: { type: "RELATION" },
    });
  }

  const firstTable = suggestion.tables[0];
  await prisma.application.update({
    where: { id: applicationId },
    data: { primaryTableId: firstTable ? tableKeyToId.get(firstTable.key) : null },
  });

  return { tables: tableKeyToId.size, fields: fieldCount };
}

export async function persistSchema(
  opts: PersistSchemaOptions & { userId: string }
): Promise<{ applicationId: string }> {
  const { orgId, userId, dataSourceId, suggestion, appName, status } = opts;
  void userId;
  const { applicationId } = await createApplicationShell({
    orgId,
    dataSourceId,
    suggestion,
    appName,
  });
  await buildTables({ orgId, applicationId, suggestion });
  if (status && status !== "GENERATING") {
    await prisma.application.update({ where: { id: applicationId }, data: { status } });
  }
  return { applicationId };
}

export async function finalizeImport(
  applicationId: string,
  dataSourceId: string,
  report: unknown
) {
  await prisma.application.update({
    where: { id: applicationId },
    data: { status: "READY" },
  });
  await prisma.dataSource.update({
    where: { id: dataSourceId },
    data: { status: "IMPORTED", importReport: report as object },
  });
}

export type { SpreadsheetAnalysis };
