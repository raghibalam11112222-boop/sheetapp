-- AlterTable
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "clerkId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_clerkId_key" ON "user"("clerkId");
