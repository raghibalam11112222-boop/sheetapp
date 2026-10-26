"use server";

import { withAction } from "@/lib/action";
import { requireActionOrg } from "@/lib/auth/guards";

export interface SessionView {
  id: string;
  current: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

/**
 * Firebase Auth sessions live at Google — there is no prisma `session` row.
 * These actions are kept (same names/shapes) so Settings UI keeps working;
 * signing out everywhere = the device's own Firebase token is revoked via
 * the SDK and the httpOnly cookie clears.
 */
export async function listSessionsAction() {
  return withAction(async () => {
    await requireActionOrg();
    const items: SessionView[] = [];
    return { sessions: items };
  });
}

export async function revokeSessionAction(_sessionId: string) {
  return withAction(async () => {
    await requireActionOrg();
    return { id: _sessionId };
  });
}

export async function revokeOtherSessionsAction() {
  return withAction(async () => {
    await requireActionOrg();
    return { revoked: 0 };
  });
}
