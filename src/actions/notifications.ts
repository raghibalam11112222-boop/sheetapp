"use server";

import { withAction } from "@/lib/action";
import { requireActionOrg } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

/** Marks all workspace notifications as read. */
export async function markNotificationsReadAction() {
  return withAction(async () => {
    const ctx = await requireActionOrg();
    const result = await prisma.notification.updateMany({
      where: { organizationId: ctx.orgId, readAt: null },
      data: { readAt: new Date() },
    });
    return { marked: result.count };
  });
}
