CREATE TABLE IF NOT EXISTS "McpSecurityState" ("key" TEXT PRIMARY KEY, "data" JSONB NOT NULL, "expiresAt" TIMESTAMPTZ NOT NULL);
CREATE INDEX IF NOT EXISTS "McpSecurityState_expiresAt_idx" ON "McpSecurityState"("expiresAt");
REVOKE ALL ON "McpSecurityState" FROM PUBLIC;
ALTER TABLE "McpSecurityState" ENABLE ROW LEVEL SECURITY;
