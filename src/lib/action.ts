import { PermissionError } from "@/lib/auth/permissions";
import { AuthRequiredError } from "@/lib/auth/guards";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export class ActionError extends Error {
  code: string;
  constructor(message: string, code = "BAD_REQUEST") {
    super(message);
    this.name = "ActionError";
    this.code = code;
  }
}

function friendlyMessage(err: unknown): { message: string; code: string } {
  if (err instanceof PermissionError) return { message: err.message, code: "FORBIDDEN" };
  if (err instanceof AuthRequiredError)
    return { message: "Your session expired. Please sign in again.", code: "UNAUTHENTICATED" };
  if (err instanceof ActionError) return { message: err.message, code: err.code };
  return {
    message: "Something went wrong. Please try again.",
    code: "INTERNAL",
  };
}

/** Wraps a server action with centralized error handling (never leaks internals). */
export async function withAction<T>(
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    const { message, code } = friendlyMessage(err);
    if (code === "INTERNAL") {
      console.error("[SheetApp] action failed:", err);
      try {
        const { prisma } = await import("@/lib/db");
        await prisma.errorLog.create({
          data: {
            level: "error",
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack?.slice(0, 4000) : null,
          },
        });
        // Retention: error logs older than 30 days are pruned so the table
        // can't grow unbounded in production.
        await prisma.errorLog.deleteMany({
          where: { createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        });
      } catch {
        // DB unavailable — logging must never break the response.
      }
    }
    return { ok: false, error: message, code };
  }
}
