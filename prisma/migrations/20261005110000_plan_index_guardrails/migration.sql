-- AUDIT §34: codify the plan-required indexes that were applied manually to
-- production during the 2026-10-04 controlled release but were missing from
-- the migration chain (fresh databases failed the Phase 24 index guardrail).
-- Idempotent: safe on databases that already have them.

CREATE INDEX IF NOT EXISTS "ImportSource_healthStatus_idx" ON public."ImportSource" USING btree ("healthStatus");
CREATE INDEX IF NOT EXISTS "ImportSource_nextRunAt_idx" ON public."ImportSource" USING btree ("nextRunAt");
CREATE INDEX IF NOT EXISTS "ImportSource_priority_idx" ON public."ImportSource" USING btree (priority);
CREATE INDEX IF NOT EXISTS "OpportunitySourceObservation_opportunityId_idx" ON public."OpportunitySourceObservation" USING btree ("opportunityId");
CREATE INDEX IF NOT EXISTS "OpportunitySourceObservation_organizationId_idx" ON public."OpportunitySourceObservation" USING btree ("organizationId");
CREATE INDEX IF NOT EXISTS "OpportunitySourceObservation_sourceUrl_idx" ON public."OpportunitySourceObservation" USING btree ("sourceUrl");
CREATE INDEX IF NOT EXISTS "OpportunitySourceObservation_vacancyNumber_idx" ON public."OpportunitySourceObservation" USING btree ("vacancyNumber");
CREATE INDEX IF NOT EXISTS "Opportunity_organizationId_idx" ON public."Opportunity" USING btree ("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON public."Organization" USING btree (slug);
