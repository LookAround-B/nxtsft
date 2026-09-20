-- Additive migration. Apply once before deploying the seller Insights release.
BEGIN;
ALTER TABLE "Lead" ADD COLUMN "buyerUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Existing CRM userId is not reliable evidence of buyer identity. Historical
-- leads remain visible, but sharing requires an explicit buyer association.
CREATE TABLE "PropertyWatch" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "propertyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PropertyWatch_userId_propertyId_key" ON "PropertyWatch"("userId", "propertyId");
CREATE INDEX "PropertyWatch_propertyId_idx" ON "PropertyWatch"("propertyId");
CREATE TABLE "SellerContactShare" (
  "id" TEXT PRIMARY KEY, "sellerId" TEXT NOT NULL, "buyerId" TEXT NOT NULL, "propertyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SellerContactShare_sellerId_buyerId_propertyId_key" ON "SellerContactShare"("sellerId", "buyerId", "propertyId");
CREATE INDEX "SellerContactShare_propertyId_idx" ON "SellerContactShare"("propertyId");

-- Property writes occur in seller/admin routes, approved edits, and expiry jobs.
-- A database trigger covers all of them, atomically, including bulk updates.
CREATE FUNCTION notify_property_watchers() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  price_changed BOOLEAN;
  availability_changed BOOLEAN;
BEGIN
  price_changed := NEW."price" IS DISTINCT FROM OLD."price" AND NEW."status" = 'Active';
  availability_changed := OLD."status" = 'Active' AND NEW."status" IN ('Sold', 'Rented', 'Inactive');
  IF NEW."deletedAt" IS NULL AND (price_changed OR availability_changed) THEN
    INSERT INTO "Notification" ("id", "userId", "type", "title", "content", "actionUrl", "read", "createdAt")
    SELECT 'c' || substr(md5(random()::text || clock_timestamp()::text || w."id"), 1, 24),
      w."userId", 'property_alert',
      CASE WHEN availability_changed THEN 'Property availability updated' ELSE 'Property price updated' END,
      NEW."title" || CASE WHEN availability_changed THEN ' is now ' || lower(NEW."status") || '.'
                         ELSE ': price changed from ₹' || OLD."price"::text || ' to ₹' || NEW."price"::text || '.' END,
      CASE WHEN NEW."status" = 'Active' THEN '/properties/' || NEW."slug" ELSE '/user-portal#watching' END,
      false, CURRENT_TIMESTAMP
    FROM "PropertyWatch" w JOIN "User" u ON u."id" = w."userId"
    WHERE w."propertyId" = NEW."id" AND u."active" = true AND w."userId" <> NEW."ownerId";
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER property_watch_alert AFTER UPDATE OF "price", "status" ON "Property"
FOR EACH ROW EXECUTE FUNCTION notify_property_watchers();
COMMIT;
