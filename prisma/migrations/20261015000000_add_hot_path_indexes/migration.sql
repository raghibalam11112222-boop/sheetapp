-- Covering indexes for foreign keys flagged by the Supabase linter
-- (unindexed_foreign_keys). Speeds up per-org/per-user lookups on hot paths.
CREATE INDEX IF NOT EXISTS "analytics_event_organizationId_idx" ON "analytics_event"("organizationId");
CREATE INDEX IF NOT EXISTS "analytics_event_userId_idx" ON "analytics_event"("userId");
CREATE INDEX IF NOT EXISTS "audit_log_actorUserId_idx" ON "audit_log"("actorUserId");
CREATE INDEX IF NOT EXISTS "data_source_uploadedById_idx" ON "data_source"("uploadedById");
CREATE INDEX IF NOT EXISTS "invitation_invitedById_idx" ON "invitation"("invitedById");
CREATE INDEX IF NOT EXISTS "record_createdById_idx" ON "record"("createdById");
CREATE INDEX IF NOT EXISTS "relationship_fromTableId_idx" ON "relationship"("fromTableId");
CREATE INDEX IF NOT EXISTS "relationship_toTableId_idx" ON "relationship"("toTableId");
CREATE INDEX IF NOT EXISTS "workflow_organizationId_idx" ON "workflow"("organizationId");
CREATE INDEX IF NOT EXISTS "workflow_run_organizationId_idx" ON "workflow_run"("organizationId");
