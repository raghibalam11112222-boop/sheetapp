import { prisma } from "@/lib/db";

export async function track(
  name: string,
  meta: {
    orgId?: string | null;
    userId?: string | null;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name,
        organizationId: meta.orgId ?? null,
        userId: meta.userId ?? null,
        metadata: (meta.metadata ?? undefined) as object | undefined,
      },
    });
  } catch {
    // analytics must never break the product flow
  }
}

export async function logAudit(opts: {
  orgId: string;
  actorUserId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: opts.orgId,
        actorUserId: opts.actorUserId ?? null,
        action: opts.action,
        entityType: opts.entityType ?? null,
        entityId: opts.entityId ?? null,
        metadata: (opts.metadata ?? undefined) as object | undefined,
        ipAddress: opts.ipAddress ?? null,
      },
    });
  } catch {
    // audit logging must never break the product flow
  }
}
