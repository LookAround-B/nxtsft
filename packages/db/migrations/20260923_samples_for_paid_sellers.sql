-- Sample-interest previews for paid sellers (no schema change).
--
-- Until now both payment paths (Razorpay verifyOwnerPayment, PayU callback)
-- permanently set DummyLeadAssignment.suppressedAt on purchase, because paid
-- sellers were never meant to see sample cards. That rule is reversed: samples
-- are now the engagement surface for every seller, gated instead by the
-- SiteSetting key 'leads.samples_for_paid_sellers' (default on).
--
-- Those payment writes were the only code that ever set this column, so every
-- non-null value is a past purchase. Clearing them is what makes the new rule
-- apply to sellers who already paid; without this they stay blank forever and
-- the admin toggle looks broken.
--
-- suppressedAt survives as a manual per-row kill switch (all reads still
-- filter suppressedAt IS NULL). Run before deploying the application.

UPDATE "DummyLeadAssignment"
SET "suppressedAt" = NULL
WHERE "suppressedAt" IS NOT NULL;
