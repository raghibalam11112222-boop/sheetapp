-- Adds the Firebase Authentication identity bridge to the user table.
-- Mirrors the legacy clerkId link: unique, nullable, and used by guards.ts
-- to resolve a verified Firebase ID-token uid to the internal user row.
ALTER TABLE "user" ADD COLUMN "firebaseUid" TEXT;

-- Table-level follow-up: create the uniqueness constraint the same way the
-- clerkId column got it (named index so prisma migrate deploy is idempotent).
CREATE UNIQUE INDEX "user_firebaseUid_key" ON "user"("firebaseUid");
