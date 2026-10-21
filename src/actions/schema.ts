"use server";

import { loadUpload } from "@/lib/storage";
import { withAction, ActionError } from "@/lib/action";
import { requireActionOrg, requirePermissionOn } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { generateSchemaSuggestion, schemaSuggestionSchema, type SchemaSuggestion } from "@/lib/ai";
import type { SpreadsheetAnalysis } from "@/lib/spreadsheet/types";
import { parseWorkbook, slimAnalysisForReview, type SlimAnalysis } from "@/lib/spreadsheet";
import type { FileKind } from "@/lib/spreadsheet/types";
import {
  buildTables,
  createApplicationShell,
  finalizeImport,
} from "@/lib/generation/persist";
import { getJobQueue } from "@/lib/jobs/queue";
import { canCreateApp, canImportRows, getOrgPlanId } from "@/lib/billing/limits";
import { importRecords, type ImportMode, type ImportReport } from "@/lib/generation/import";
import { track } from "@/lib/analytics/track";

export interface StoredAnalysisPayload {
  analysis: SpreadsheetAnalysis;
  hint?: string;
  suggestion?: SchemaSuggestion;
}

export interface SchemaReviewState {
  dataSourceId: string;
  fileName: string;
  status: string;
  analysis: SlimAnalysis;
  suggestion: SchemaSuggestion;
  provider: string;
}

export async function getSchemaReviewState(
  dataSourceId: string
): Promise<SchemaReviewState | null> {
  const ctx = await requireActionOrg().catch(() => null);
  if (!ctx) return null;
  const ds = await prisma.dataSource.findFirst({
    where: { id: dataSourceId, organizationId: ctx.orgId },
  });
  if (!ds) return null;
  const payload = (ds.analysis ?? {}) as unknown as StoredAnalysisPayload;
  if (!payload.analysis) return null;

  let suggestion = payload.suggestion;
  let provider = "stored";
  if (!suggestion) {
    const generated = await generateSchemaSuggestion(payload.analysis, payload.hint);
    suggestion = generated.suggestion;
    provider = generated.provider;
    await prisma.dataSource.update({
      where: { id: ds.id },
      data: { analysis: { ...payload, suggestion } as object },
    });
    await track("schema_generated", {
      orgId: ctx.orgId,
      userId: ctx.userId,
      metadata: { dataSourceId: ds.id, provider, tables: suggestion.tables.length },
    });
  }
  return {
    dataSourceId: ds.id,
    fileName: ds.fileName,
    status: ds.status,
    analysis: slimAnalysisForReview(payload.analysis),
    suggestion,
    provider,
  };
}

export async function regenerateSchemaAction(dataSourceId: string, hint?: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:create");
    const ds = await prisma.dataSource.findFirst({
      where: { id: dataSourceId, organizationId: ctx.orgId },
    });
    if (!ds) throw new ActionError("Spreadsheet not found.", "NOT_FOUND");
    const payload = (ds.analysis ?? {}) as unknown as StoredAnalysisPayload;
    if (!payload.analysis) throw new ActionError("Analysis not found.", "NOT_FOUND");

    const generated = await generateSchemaSuggestion(payload.analysis, hint);
    await prisma.dataSource.update({
      where: { id: ds.id },
      data: { analysis: { ...payload, suggestion: generated.suggestion, hint } as object },
    });
    await track("schema_generated", {
      orgId: ctx.orgId,
      userId: ctx.userId,
      metadata: {
        dataSourceId: ds.id,
        provider: generated.provider,
        tables: generated.suggestion.tables.length,
        regenerate: true,
      },
    });
    return { suggestion: generated.suggestion, provider: generated.provider };
  });
}

export interface GenerateAppInput {
  dataSourceId: string;
  suggestion: unknown;
  appName?: string;
  mode: ImportMode;
  dedupe: boolean;
}

function parseSuggestion(input: unknown): SchemaSuggestion {
  try {
    return schemaSuggestionSchema.parse(input);
  } catch {
    throw new ActionError(
      "The schema is invalid. Please review it again.",
      "INVALID_SCHEMA"
    );
  }
}

async function loadDataSource(orgId: string, dataSourceId: string) {
  const ds = await prisma.dataSource.findFirst({
    where: { id: dataSourceId, organizationId: orgId },
  });
  if (!ds) throw new ActionError("Spreadsheet not found.", "NOT_FOUND");
  const payload = (ds.analysis ?? {}) as unknown as StoredAnalysisPayload;
  if (!payload.analysis) throw new ActionError("Analysis not found.", "NOT_FOUND");
  return { ds, payload };
}

/** Stage 1 — Analyzing data: confirms the stored analysis is intact. */
export async function verifyAnalysisAction(dataSourceId: string) {
  return withAction(async () => {
    const ctx = await requireActionOrg();
    const { payload } = await loadDataSource(ctx.orgId, dataSourceId);
    return {
      sheets: payload.analysis.sheetCount,
      rows: payload.analysis.totalRows,
      columns: payload.analysis.totalColumns,
    };
  });
}

/** Stage 2 — Building database: creates the application shell. */
export async function startGenerationAction(input: GenerateAppInput) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:create");
    if (!rateLimitGenerate(ctx.userId)) {
      throw new ActionError("Please wait a moment before generating again.", "RATE_LIMITED");
    }
    const suggestion = parseSuggestion(input.suggestion);
    if (!suggestion.tables.length) {
      throw new ActionError("Keep at least one table to generate your app.", "INVALID_SCHEMA");
    }
    const planId = await getOrgPlanId(ctx.orgId);
    const appCount = await prisma.application.count({
      where: { organizationId: ctx.orgId },
    });
    const appCheck = canCreateApp(planId, appCount);
    if (!appCheck.ok) throw new ActionError(appCheck.message ?? "App limit reached.", "LIMIT");
    await loadDataSource(ctx.orgId, input.dataSourceId);
    return createApplicationShell({
      orgId: ctx.orgId,
      dataSourceId: input.dataSourceId,
      suggestion,
      appName: input.appName,
    });
  });
}

/** Stage 3 — Creating tables: persists tables, fields and relationships. */
export async function buildTablesAction(input: GenerateAppInput & { applicationId: string }) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:create");
    const suggestion = parseSuggestion(input.suggestion);
    const app = await prisma.application.findFirst({
      where: { id: input.applicationId, organizationId: ctx.orgId },
    });
    if (!app) throw new ActionError("Application not found.", "NOT_FOUND");
    return buildTables({ orgId: ctx.orgId, applicationId: app.id, suggestion });
  });
}

/**
 * Stages 4+5 — Generating forms / Creating dashboard: verifies the persisted
 * structure both are rendered from (forms and dashboard read tables + fields).
 */
export async function verifyStructureAction(applicationId: string) {
  return withAction(async () => {
    const ctx = await requireActionOrg();
    const app = await prisma.application.findFirst({
      where: { id: applicationId, organizationId: ctx.orgId },
      include: { tables: { include: { fields: true } } },
    });
    if (!app || !app.tables.length) {
      throw new ActionError("Application tables are missing.", "NOT_FOUND");
    }
    const fields = app.tables.reduce((sum, t) => sum + t.fields.length, 0);
    return { tables: app.tables.length, fields };
  });
}

/** Stage 5 — Creating dashboard: resolves the summary the dashboard renders. */
export async function prepareDashboardAction(applicationId: string) {
  return withAction(async () => {
    const ctx = await requireActionOrg();
    const app = await prisma.application.findFirst({
      where: { id: applicationId, organizationId: ctx.orgId },
      include: { tables: { include: { _count: { select: { records: true } } } } },
    });
    if (!app) throw new ActionError("Application not found.", "NOT_FOUND");
    return {
      name: app.name,
      tables: app.tables.map((t) => ({ label: t.label, records: t._count.records })),
    };
  });
}
/** Stage 6 — Importing records: parses the stored file and imports rows. */
export async function importRecordsAction(input: GenerateAppInput & { applicationId: string }) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:create");
    const app = await prisma.application.findFirst({
      where: { id: input.applicationId, organizationId: ctx.orgId },
    });
    if (!app) throw new ActionError("Application not found.", "NOT_FOUND");
    const { ds, payload } = await loadDataSource(ctx.orgId, input.dataSourceId);
    const planId = await getOrgPlanId(ctx.orgId);
    const existingRecords = await prisma.record.count({
      where: { organizationId: ctx.orgId },
    });
    const rowCheck = canImportRows(planId, existingRecords, payload.analysis.totalRows);
    if (!rowCheck.ok) throw new ActionError(rowCheck.message ?? "Record limit reached.", "LIMIT");
    let report: ImportReport;
    try {
      const bytes = await loadUpload(ds.storagePath);
      const workbook = parseWorkbook(bytes, ds.fileName, ds.fileSize, ds.fileKind as FileKind);
      // Long pole goes through the job queue: inline today, a real worker
      // later, with no caller changes (app.txt §37).
      report = await getJobQueue().enqueue({
        name: "import-records",
        run: () =>
          importRecords({
            orgId: ctx.orgId,
            userId: ctx.userId,
            applicationId: app.id,
            workbook,
            analysis: payload.analysis,
            mode: input.mode,
            dedupe: input.dedupe,
          }),
      });
    } catch (err) {
      console.error("[SheetApp] import failed:", err);
      await prisma.application.update({
        where: { id: app.id },
        data: { status: "FAILED" },
      });
      throw new ActionError(
        "The app was created but importing records failed. Please try again.",
        "IMPORT_FAILED"
      );
    }
    return {
      imported: report.totalImported,
      skipped: report.totalSkipped,
      tables: report.tables,
      issues: report.issues,
    };
  });
}

export interface FinalizeGenerationInput {
  applicationId: string;
  dataSourceId: string;
  report: unknown;
}

/** Stage 7 — Finalizing app: marks ready, links the source, tracks analytics. */
export async function finalizeGenerationAction(input: FinalizeGenerationInput) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:create");
    const app = await prisma.application.findFirst({
      where: { id: input.applicationId, organizationId: ctx.orgId },
      include: { tables: true },
    });
    if (!app) throw new ActionError("Application not found.", "NOT_FOUND");
    await finalizeImport(app.id, input.dataSourceId, input.report);
    // Note: the client passes the summarized import report ({ imported,
    // skipped, ... }), not the full ImportReport ({ totalImported, ... }).
    const report = (input.report ?? {}) as { imported?: number; totalImported?: number };
    const imported = report.imported ?? report.totalImported ?? 0;
    await track("app_generated", {
      orgId: ctx.orgId,
      userId: ctx.userId,
      metadata: {
        applicationId: app.id,
        tables: app.tables.length,
        imported,
      },
    });
    await track("record_created", {
      orgId: ctx.orgId,
      userId: ctx.userId,
      metadata: { count: imported, bulk: true },
    });
    return { applicationId: app.id };
  });
}

/** Marks a partially generated application as failed (stage error cleanup). */
export async function abandonGenerationAction(applicationId: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:create");
    await prisma.application.updateMany({
      where: { id: applicationId, organizationId: ctx.orgId },
      data: { status: "FAILED" },
    });
    return { abandoned: true };
  });
}

const generateWindow = new Map<string, number[]>();

function rateLimitGenerate(userId: string): boolean {
  const now = Date.now();
  const list = (generateWindow.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= 5) {
    generateWindow.set(userId, list);
    return false;
  }
  list.push(now);
  generateWindow.set(userId, list);
  return true;
}
