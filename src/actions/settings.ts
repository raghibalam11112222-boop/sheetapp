"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { withAction, ActionError } from "@/lib/action";
import { requireActionOrg, requirePermissionOn, ACTIVE_ORG_COOKIE } from "@/lib/auth/guards";
import { FieldType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { deleteUploads } from "@/lib/storage";
import { logAudit } from "@/lib/analytics/track";

const FIELD_TYPES = Object.values(FieldType) as string[];

async function loadOwnedTable(orgId: string, tableId: string) {
  const table = await prisma.generatedTable.findFirst({
    where: { id: tableId, organizationId: orgId },
    include: { fields: { orderBy: { position: "asc" } } },
  });
  if (!table) throw new ActionError("Table not found.", "NOT_FOUND");
  return table;
}

function slugKey(label: string, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/^(\d)/, "_$1") || "field";
  let key = base;
  let i = 2;
  while (taken.has(key)) key = `${base}_${i++}`;
  return key;
}

/**
 * Post-generation field editing (app.txt §39): rename labels, change types,
 * toggle required/unique/title. Keys never change so stored record data
 * keeps resolving.
 */
export async function updateTableFieldAction(
  tableId: string,
  fieldId: string,
  patch: { label?: string; type?: string; required?: boolean; unique?: boolean; isTitle?: boolean }
) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:edit");
    const table = await loadOwnedTable(ctx.orgId, tableId);
    const field = table.fields.find((f) => f.id === fieldId);
    if (!field) throw new ActionError("Field not found.", "NOT_FOUND");

    const data: {
      label?: string;
      type?: FieldType;
      required?: boolean;
      unique?: boolean;
      isTitle?: boolean;
      options?: string[];
    } = {};
    if (patch.label !== undefined) {
      const clean = patch.label.trim().slice(0, 80);
      if (!clean) throw new ActionError("Field name cannot be empty.", "VALIDATION");
      data.label = clean;
    }
    if (patch.type !== undefined) {
      if (!FIELD_TYPES.includes(patch.type) || patch.type === "RELATION") {
        throw new ActionError("Invalid field type.", "VALIDATION");
      }
      data.type = patch.type as FieldType;
      // Switching to an option list without options: seed from live values.
      if (patch.type === "ENUM" && !field.options.length) {
        const distinct = await prisma.$queryRaw<{ v: string }[]>`
          SELECT DISTINCT data->>${field.name} AS v
          FROM "record"
          WHERE "organizationId" = ${ctx.orgId} AND "tableId" = ${table.id}
            AND data->>${field.name} IS NOT NULL AND data->>${field.name} <> ''
          LIMIT 30
        `;
        data.options = distinct.map((r) => r.v.slice(0, 80)).filter(Boolean);
      }
    }
    if (patch.required !== undefined) data.required = patch.required;
    if (patch.unique !== undefined) data.unique = patch.unique;
    if (patch.isTitle !== undefined) {
      if (patch.isTitle) {
        await prisma.generatedField.updateMany({
          where: { tableId: table.id, isTitle: true },
          data: { isTitle: false },
        });
      }
      data.isTitle = patch.isTitle;
      if (!patch.isTitle && !table.fields.some((f) => f.isTitle && f.id !== field.id)) {
        throw new ActionError("Every table needs exactly one title field.", "VALIDATION");
      }
    }

    await prisma.generatedField.update({ where: { id: field.id }, data });
    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "table.field_updated",
      entityType: "field",
      entityId: field.id,
      metadata: { tableId },
    });
    return { id: field.id };
  });
}

/** Adds a field to a generated table (existing rows read it as empty). */
export async function addTableFieldAction(tableId: string, input: { label: string; type: string }) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:edit");
    const table = await loadOwnedTable(ctx.orgId, tableId);
    const label = input.label.trim().slice(0, 80);
    if (!label) throw new ActionError("Give the new field a name.", "VALIDATION");
    if (!FIELD_TYPES.includes(input.type) || input.type === "RELATION") {
      throw new ActionError("Invalid field type.", "VALIDATION");
    }
    const key = slugKey(label, new Set(table.fields.map((f) => f.name)));
    const position = table.fields.reduce((max, f) => Math.max(max, f.position), -1) + 1;
    const created = await prisma.generatedField.create({
      data: {
        organizationId: ctx.orgId,
        tableId: table.id,
        name: key,
        label,
        type: input.type as FieldType,
        position,
      },
    });
    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "table.field_added",
      entityType: "field",
      entityId: created.id,
      metadata: { tableId },
    });
    return { id: created.id, key };
  });
}

/** Removes a field (stored values stay in record JSON but stop rendering). */
export async function removeTableFieldAction(tableId: string, fieldId: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:edit");
    const table = await loadOwnedTable(ctx.orgId, tableId);
    if (table.fields.length <= 1) {
      throw new ActionError("A table needs at least one field.", "VALIDATION");
    }
    const field = table.fields.find((f) => f.id === fieldId);
    if (!field) throw new ActionError("Field not found.", "NOT_FOUND");
    if (field.isTitle) {
      throw new ActionError("Move the title to another field before removing this one.", "VALIDATION");
    }
    await prisma.generatedField.delete({ where: { id: field.id } });
    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "table.field_removed",
      entityType: "field",
      entityId: field.id,
      metadata: { tableId, label: field.label },
    });
    return { id: field.id };
  });
}

/** Links a field to another table (the field becomes a relation picker). */
export async function addTableRelationshipAction(input: {
  fromTableId: string;
  fromFieldId: string;
  toTableId: string;
}) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:edit");
    const fromTable = await loadOwnedTable(ctx.orgId, input.fromTableId);
    const toTable = await loadOwnedTable(ctx.orgId, input.toTableId);
    if (fromTable.id === toTable.id) {
      throw new ActionError("Pick two different tables.", "VALIDATION");
    }
    if (fromTable.applicationId !== toTable.applicationId) {
      throw new ActionError("Tables must belong to the same app.", "VALIDATION");
    }
    const fromField = fromTable.fields.find((f) => f.id === input.fromFieldId);
    if (!fromField) throw new ActionError("Field not found.", "NOT_FOUND");
    const duplicate = await prisma.relationship.findFirst({
      where: {
        organizationId: ctx.orgId,
        fromTableId: fromTable.id,
        fromFieldId: fromField.id,
        toTableId: toTable.id,
      },
    });
    if (duplicate) throw new ActionError("That relationship already exists.", "DUPLICATE");
    const created = await prisma.relationship.create({
      data: {
        organizationId: ctx.orgId,
        applicationId: fromTable.applicationId,
        fromTableId: fromTable.id,
        fromFieldId: fromField.id,
        toTableId: toTable.id,
        type: "ONE_TO_MANY",
        confirmed: true,
      },
    });
    await prisma.generatedField.update({
      where: { id: fromField.id },
      data: { type: "RELATION" },
    });
    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "table.relationship_added",
      entityType: "relationship",
      entityId: created.id,
      metadata: { fromTableId: fromTable.id, toTableId: toTable.id },
    });
    return { id: created.id };
  });
}

/** Removes a relationship (the field keeps its current type). */
export async function removeTableRelationshipAction(relationshipId: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:edit");
    const rel = await prisma.relationship.findFirst({
      where: { id: relationshipId, organizationId: ctx.orgId },
    });
    if (!rel) throw new ActionError("Relationship not found.", "NOT_FOUND");
    await prisma.relationship.delete({ where: { id: rel.id } });
    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "table.relationship_removed",
      entityType: "relationship",
      entityId: rel.id,
    });
    return { id: rel.id };
  });
}

/** Permanently deletes the current user's account and data (Privacy/ToS right to deletion). */
export async function deleteAccountAction() {
  return withAction(async () => {
    const ctx = await requireActionOrg();

    // ONE transaction for every DB mutation: a mid-sequence crash can no
    // longer strand a half-deleted account, and a failure rolls everything
    // back so the user can simply retry. Storage paths of files belonging to
    // workspaces this user owns alone are collected first (they would vanish
    // from the DB with the org cascade otherwise) and removed after commit.
    const { deletedPaths } = await prisma.$transaction(async (tx) => {
      const memberships = await tx.membership.findMany({ where: { userId: ctx.userId } });
      const deletedPaths: (string | null)[] = [];

      for (const m of memberships) {
        await tx.membership.deleteMany({
          where: { organizationId: m.organizationId, userId: ctx.userId },
        });
        const remaining = await tx.membership.count({
          where: { organizationId: m.organizationId },
        });
        if (remaining === 0) {
          const sources = await tx.dataSource.findMany({
            where: { organizationId: m.organizationId },
            select: { storagePath: true },
          });
          deletedPaths.push(...sources.map((s) => s.storagePath));
          await tx.organization.delete({ where: { id: m.organizationId } });
        }
      }

      await tx.session.deleteMany({ where: { userId: ctx.userId } });
      await tx.account.deleteMany({ where: { userId: ctx.userId } });
      await tx.invitation.deleteMany({ where: { invitedById: ctx.userId } });
      await tx.auditLog.deleteMany({ where: { actorUserId: ctx.userId } });
      await tx.analyticsEvent.deleteMany({ where: { userId: ctx.userId } });
      await tx.user.delete({ where: { id: ctx.userId } });
      return { deletedPaths };
    });

    // Best-effort file removal: rows are already gone, cleanup never fails
    // the overall delete (deleteUploads never throws).
    await removeStoredFiles(deletedPaths);

    // The Firebase identity itself is revoked by the client right after this
    // action resolves (its own SDK holds the user handle; the server does not
    // need — and deliberately does not keep — any Firebase Admin credential).
    // Data-first/identity-last order preserved from the Clerk era: if the
    // identity call fails, the user is reprovisioned an empty account on
    // their next request and can retry deletion themselves.
    return { deleted: true };
  });
}

/** Best-effort removal of stored spreadsheet files (never blocks the delete). */
async function removeStoredFiles(storagePaths: (string | null)[]) {
  await deleteUploads(storagePaths);
}

export async function updateOrganizationNameAction(name: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("settings:manage");
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 60) {
      throw new ActionError("Workspace name must be 2–60 characters.", "VALIDATION");
    }
    await prisma.organization.update({ where: { id: ctx.orgId }, data: { name: clean } });
    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "settings.organization_renamed",
      entityType: "organization",
      entityId: ctx.orgId,
      metadata: { name: clean },
    });
    revalidatePath("/", "layout");
    return { name: clean };
  });
}

export async function setActiveOrgAction(orgId: string) {
  return withAction(async () => {
    const ctx = await requireActionOrg();
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: ctx.userId } },
    });
    if (!membership) throw new ActionError("Workspace not found.", "NOT_FOUND");
    const jar = await cookies();
    jar.set(ACTIVE_ORG_COOKIE, orgId, {
      httpOnly: true,
      sameSite: "lax",
      // Sent only over HTTPS in production; plain HTTP is local dev.
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    revalidatePath("/", "layout");
    return { orgId };
  });
}

export async function updateProfileAction(name: string) {
  return withAction(async () => {
    const ctx = await requireActionOrg();
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 60) {
      throw new ActionError("Name must be 2–60 characters.", "VALIDATION");
    }
    await prisma.user.update({ where: { id: ctx.userId }, data: { name: clean } });
    revalidatePath("/", "layout");
    return { name: clean };
  });
}

export async function deleteApplicationAction(applicationId: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:delete");
    const app = await prisma.application.findFirst({
      where: { id: applicationId, organizationId: ctx.orgId },
    });
    if (!app) throw new ActionError("Application not found.", "NOT_FOUND");

    const sources = await prisma.dataSource.findMany({
      where: { applicationId: app.id, organizationId: ctx.orgId },
      select: { id: true, storagePath: true },
    });
    await prisma.application.delete({ where: { id: app.id } });
    // The datasource rows cascade via SetNull; remove them explicitly along
    // with the sensitive spreadsheet bytes on disk.
    if (sources.length) {
      await prisma.dataSource.deleteMany({
        where: { id: { in: sources.map((s) => s.id) }, organizationId: ctx.orgId },
      });
      await removeStoredFiles(sources.map((s) => s.storagePath));
    }
    await logAudit({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "app.deleted",
      entityType: "application",
      entityId: app.id,
      metadata: { name: app.name },
    });
    revalidatePath("/", "layout");
    return { id: app.id };
  });
}

export async function renameApplicationAction(applicationId: string, name: string) {
  return withAction(async () => {
    const ctx = await requirePermissionOn("app:edit");
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 60) {
      throw new ActionError("App name must be 2–60 characters.", "VALIDATION");
    }
    const app = await prisma.application.findFirst({
      where: { id: applicationId, organizationId: ctx.orgId },
    });
    if (!app) throw new ActionError("Application not found.", "NOT_FOUND");
    await prisma.application.update({ where: { id: app.id }, data: { name: clean } });
    revalidatePath("/", "layout");
    return { name: clean };
  });
}
