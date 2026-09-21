-- Additive migration for the sales-roadmap release.
-- Apply this before deploying code that reads Property.tags or the telecalling CRM.
-- The statements are safe to retry after a partial deployment; production schema
-- drift must still be investigated before applying this migration.
BEGIN;

ALTER TABLE "Property"
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS "RepContact" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "city" TEXT,
  "interest" TEXT,
  "source" TEXT,
  "batchId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'New',
  "value" INTEGER,
  "lastCallAt" TIMESTAMP(3),
  "lastOutcome" TEXT,
  "callbackAt" TIMESTAMP(3),
  "callCount" INTEGER NOT NULL DEFAULT 0,
  "leadId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RepContact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepContact_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "RepContactNote" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepContactNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepContactNote_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "RepContact"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "RepCall" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "repId" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "durationSec" INTEGER,
  "remark" TEXT,
  "providerRef" TEXT,
  "recordingUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepCall_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepCall_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "RepContact"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "RepContact_ownerId_phone_key"
  ON "RepContact"("ownerId", "phone");
CREATE INDEX IF NOT EXISTS "RepContact_ownerId_status_idx"
  ON "RepContact"("ownerId", "status");
CREATE INDEX IF NOT EXISTS "RepContact_callbackAt_idx"
  ON "RepContact"("callbackAt");
CREATE INDEX IF NOT EXISTS "RepContact_batchId_idx"
  ON "RepContact"("batchId");
CREATE INDEX IF NOT EXISTS "RepContactNote_contactId_createdAt_idx"
  ON "RepContactNote"("contactId", "createdAt");
CREATE INDEX IF NOT EXISTS "RepCall_repId_createdAt_idx"
  ON "RepCall"("repId", "createdAt");
CREATE INDEX IF NOT EXISTS "RepCall_contactId_createdAt_idx"
  ON "RepCall"("contactId", "createdAt");

COMMIT;
