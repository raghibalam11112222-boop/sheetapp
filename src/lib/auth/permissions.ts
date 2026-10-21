export type Role = "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

export type Permission =
  | "record:create"
  | "record:update"
  | "record:delete"
  | "record:export"
  | "app:create"
  | "app:edit"
  | "app:delete"
  | "team:invite"
  | "team:manage"
  | "settings:manage"
  | "billing:manage"
  | "workflow:manage";

const MATRIX: Record<Role, readonly Permission[]> = {
  ADMIN: [
    "record:create",
    "record:update",
    "record:delete",
    "record:export",
    "app:create",
    "app:edit",
    "app:delete",
    "team:invite",
    "team:manage",
    "settings:manage",
    "billing:manage",
    "workflow:manage",
  ],
  MANAGER: ["record:create", "record:update"],
  MEMBER: ["record:create", "record:update"],
  VIEWER: [],
};

const RANK: Record<Role, number> = { VIEWER: 0, MEMBER: 1, MANAGER: 2, ADMIN: 3 };

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role].includes(permission);
}

export function isAtLeast(role: Role | null | undefined, min: Role): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[min];
}

export class PermissionError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "PermissionError";
  }
}

export function assertCan(role: Role | null | undefined, permission: Permission): void {
  if (!can(role, permission)) throw new PermissionError();
}

/**
 * Record-level edit check (app.txt §19 "Member: View/Create/Edit assigned
 * records"): members may only edit records assigned to them (createdById).
 * Records without a creator fall back to the role permission so legacy and
 * bulk-imported rows never lock anyone out.
 */
export function canEditRecord(
  role: Role | null | undefined,
  createdById: string | null | undefined,
  userId: string
): boolean {
  if (!can(role, "record:update")) return false;
  if (role === "MEMBER" && createdById && createdById !== userId) return false;
  return true;
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  MEMBER: "Member",
  VIEWER: "Viewer",
};
