-- Additive migration for the two-type seller lead flow.
-- Apply this before deploying code that reads/writes
-- DummyLeadAssignment.matchRequestedAt / .sellerContactSharedAt.
BEGIN;

ALTER TABLE "DummyLeadAssignment"
  ADD COLUMN IF NOT EXISTS "matchRequestedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sellerContactSharedAt" TIMESTAMP(3);

COMMIT;
