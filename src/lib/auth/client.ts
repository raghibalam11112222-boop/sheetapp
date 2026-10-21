"use client";

/**
 * Clerk-backed client auth helpers. Kept under the old path so existing
 * imports keep working; new code should prefer `@clerk/nextjs` directly.
 */
export { useUser as useSession, useClerk } from "@clerk/nextjs";
