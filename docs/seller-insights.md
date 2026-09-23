# Seller leads and Insights

The seller Leads page combines enquiries, contact unlocks and site visits. Each record is a request, not a unique buyer. Internal Dummy, Fresh Lead, Signup and Rep Contact acquisition records are excluded. Views count PropertyView records, Watching counts PropertyWatch rows, and Shortlisted counts current favorites. Empty datasets display zero; no fictional requests or activity are created.

Contacts require an Active owner-sell or owner-rent subscription whose start/end dates include now, **except for real leads (see below), which are free.** Boosts do not qualify for the subscription-gated portion. Existing subscriptions retain access even when their plan is disabled for new purchases. Contact masking also applies to the older seller endpoints and seller enquiry WhatsApp alerts. Buyer-created enquiries record an explicit buyerUserId; historical CRM creator IDs are not assumed to be buyers. Historical unlinked enquiries remain visible, with contact sharing unavailable.

Contact shares and notifications are written in one transaction, with a unique seller/buyer/property key. A notification failure rolls back the share so the seller can retry. No delivery or callback is promised beyond creating the in-app notification. `shareSellerContact` (the seller sharing their own contact with a buyer) keeps its plan gate regardless of leadType — it is a separate feature from real-lead unmasking.

## Two-type seller lead flow

`sellerInsights.leads` and `sellerInsights.dummyLeads` cards carry a `leadType`:

- **`real`** — an `enquiry`-kind row (never `unlock`/`visit`) whose buyer account is active, phone-OTP-verified (`phoneVerified`), linked (`buyerUserId`), and not the seller themselves. Property-specificity is guaranteed by the query already scoping to the seller's own properties. Real leads are unmasked for free, on any plan: the **verified account phone** is shown (not the possibly-stale form-entered `Lead.phone`), plus email, Call and WhatsApp buttons. This bypasses `hasSellerContactAccess` entirely for that row only — unlock/visit rows and non-qualifying enquiries keep the pre-existing plan-gated masking.
- **`dummy`** — a sample-interest preview (`DummyLeadAssignment`). Always masked and never unlockable. Shown on **every Active listing the seller owns**, to **every seller**: free sellers always, paid sellers while the `leads.samples_for_paid_sellers` SiteSetting is on (**default on**, admin-toggled under Property Types → Listing Rules). The response carries `paid` so the UI drops the plan pitch for paying sellers. Two additive timestamps (`matchRequestedAt`, `sellerContactSharedAt`) record whether the seller clicked "Share Intent" (`requestSampleMatch`) or submitted "Share My Number" (`shareSampleSellerContact`) on that card — both idempotent no-ops on repeat calls, and both fire the same sales follow-up signal as the pre-existing click-threshold escalation (`escalateSellerFollowUp`, deduped per seller via the `repContactId` ledger on any `DummyLeadAssignment` row). Neither action means a real buyer accepted, received, or withdrew anything — the UI copy says only that NxtSft will follow up if a genuine match exists.

**Prerequisite:** sample cards require a seeded, active `DummyBuyer` pool — `pnpm --filter @nxtsft/db exec tsx prisma/seed-dummy-buyers.ts` (idempotent, upserts by phone). With an empty pool `ensureDummyLeadsAssigned` silently no-ops and no card can ever render, on any plan. Nothing in the app or deploy wires this seed up; it is a manual one-off per environment.

`dummyLeads` treats ownership and sample-eligibility as separate questions: `NOT_FOUND` means "not your listing", and an owned listing that isn't Active returns no samples instead. ("View Leads →" in My Listings deep-links by `propertyId` on listings of any status, so folding the status filter into the ownership query 404'd those links.)

### Reversal: samples for paid sellers (2026-09-23)

The original flow restricted samples to free sellers on free listings, and both payment paths (`subscriptions.verifyOwnerPayment`, the PayU callback) permanently set `suppressedAt` on purchase. That is reversed: samples are the engagement surface for all sellers, gated by the SiteSetting above rather than by entitlement or a suppression flag. The payment-time suppression writes are gone, and `packages/db/migrations/20260923_samples_for_paid_sellers.sql` clears the column for sellers who already paid — without it they stay permanently blank and the toggle looks broken. `suppressedAt` survives as a manual per-row kill switch; every read still filters `suppressedAt IS NULL`.

**Copy rule — history.** Wording that asserts a specific buyer exists, requested privacy masking, or may accept/respond (e.g. "Buyer requested privacy on number masking… if buyer accepts, number will be shown here", "Your numbers shared with buyer. Wait for his call") is a misleading claim: there is no buyer behind a `DummyBuyer` row. Said to a paying seller it is an unfair trade practice under the Consumer Protection Act 2019, and it is the claim class that was sanitized in LA-340-343.

**Authorized reintroduction (2026-09-23).** By explicit product/business decision (owner: akhil@lookaround.in, on the "FINAL 2-FLOW" spec from management), the seller-facing sample flow was restyled as "Recent buyer requests" and the above copy was **deliberately reintroduced** — the Popup 2A/2B confirmations ("Intent Shared!… If buyer accepts your request, number will be shown here", "Your Numbers Shared With Buyer!… buyer will contact you on WhatsApp & SMS instantly"), the "…are active now"/"requested to connect" banners, the ONLINE/OFFLINE/REQUESTED activity pills, and the "Valid for 24 Hours" tag. This is a conscious override of the LA-340-343 fix, **not** an accidental regression — do not "fix" it back without checking with the owner. The legal exposure noted above still stands and was flagged at the time of the change; the underlying data is still `DummyBuyer` rows with no real buyer. The `SAMPLE`-nature of the data is otherwise unchanged: phones remain server-side masked, and the CRM follow-up signal still fires per seller.

A pre-existing quirk surfaced while testing this (not changed here): `unlock`-kind rows are masked by the same subscription-based `unlocked` flag as everything else, even though they represent a *separate paid-credit* unlock (`creditTransaction` reason `contact_unlock`). A seller who paid credits to unlock one contact but has no active subscription would not see the contact they paid for. Worth a follow-up issue.

## Deployment

Apply `packages/db/migrations/20260920_seller_insights.sql` **once, before deploying the application**, using the normal database deployment connection:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/migrations/20260920_seller_insights.sql
pnpm --filter @nxtsft/db db:generate
```

Apply `packages/db/migrations/20260922_two_type_seller_leads.sql` before deploying the two-type lead flow (adds `DummyLeadAssignment.matchRequestedAt` / `.sellerContactSharedAt`):

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/migrations/20260922_two_type_seller_leads.sql
pnpm --filter @nxtsft/db db:generate
```

Apply `packages/db/migrations/20260923_samples_for_paid_sellers.sql` **before deploying** the paid-seller sample change. It is a data fix only (clears `DummyLeadAssignment.suppressedAt`), no schema change and nothing to `db push`. Deploying the app first leaves every already-paid seller blank:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/migrations/20260923_samples_for_paid_sellers.sql
```

This repository has no existing Prisma migration history; the additive SQL migration deliberately does not introduce an incomplete Prisma baseline. It adds buyerUserId, PropertyWatch, SellerContactShare and the property_watch_alert trigger. A schema push alone does not install the trigger. The trigger delivers price/availability alerts atomically across seller edits, approved edits, staff operations and bulk expiry jobs, and does nothing for unchanged values. Soft deletion does not send an alert. Notification IDs use the existing c-prefixed 25-character format.

If application deployment is rolled back, leave the additive schema in place. Do not delete watch/share records. No backfill invents buyer identity or activity.

## Verification

Use a fresh disposable PostgreSQL instance on localhost:55439. Load the pre-change schema, then all three migrations in order (20260920, 20260921, 20260922) — including the `property_watch_alert` trigger, which a `prisma db push` does not install since it isn't Prisma-tracked; never run the integration test against a shared database. The test refuses other hosts/ports and uses only synthetic test accounts.

```sh
DATABASE_URL=postgresql://samer@localhost:55439/postgres NODE_ENV=test \
  packages/db/node_modules/.bin/tsx packages/trpc/tests/sellerInsights.integration.ts
node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json
```

The integration test covers free/paid/expired/unrelated-plan access, alternate endpoint masking, property ownership, real metrics, watch deduplication and alerts, notification failure rollback, concurrent sharing, real-vs-dummy lead typing (verified account phone shown, unverified/unlinked stays masked), samples on non-free listings, paid sellers keeping samples with the switch on and losing them with it off while free sellers keep theirs, the two sample-card actions' idempotent CRM follow-up and manual-suppression rejection, and signed Razorpay/PayU verification with duplicate callbacks, pending and failed payments. PayU response hashing follows [PayU’s documented sequence](https://docs.payu.in/docs/hashing-request-and-response), including the reserved fields. The external order API is mocked; no real payment or external message is sent.

Manually check mobile/desktop Leads and Insights, keyboard dialog navigation, the sample-card Share Intent / Share Your Number flow on both a free and a paid seller account, the admin Listing Rules toggle, and the Razorpay/PayU hosted checkout screens in the payment providers' test environments before release. New buyer-withdrawal controls are not included. Payment never changes request status.
