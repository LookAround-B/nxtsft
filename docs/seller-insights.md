# Seller leads and Insights

The seller Leads page combines enquiries, contact unlocks and site visits. Each record is a request, not a unique buyer. Internal Dummy, Fresh Lead, Signup and Rep Contact acquisition records are excluded. Views count PropertyView records, Watching counts PropertyWatch rows, and Shortlisted counts current favorites. Empty datasets display zero; no fictional requests or activity are created.

Contacts require an Active owner-sell or owner-rent subscription whose start/end dates include now. Boosts do not qualify. Existing subscriptions retain access even when their plan is disabled for new purchases. Contact masking also applies to the older seller endpoints and seller enquiry WhatsApp alerts. Buyer-created enquiries record an explicit buyerUserId; historical CRM creator IDs are not assumed to be buyers. Historical unlinked enquiries remain visible, with contact sharing unavailable.

Contact shares and notifications are written in one transaction, with a unique seller/buyer/property key. A notification failure rolls back the share so the seller can retry. No delivery or callback is promised beyond creating the in-app notification.

## Deployment

Apply `packages/db/migrations/20260920_seller_insights.sql` **once, before deploying the application**, using the normal database deployment connection:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/migrations/20260920_seller_insights.sql
pnpm --filter @nxtsft/db db:generate
```

This repository has no existing Prisma migration history; the additive SQL migration deliberately does not introduce an incomplete Prisma baseline. It adds buyerUserId, PropertyWatch, SellerContactShare and the property_watch_alert trigger. A schema push alone does not install the trigger. The trigger delivers price/availability alerts atomically across seller edits, approved edits, staff operations and bulk expiry jobs, and does nothing for unchanged values. Soft deletion does not send an alert. Notification IDs use the existing c-prefixed 25-character format.

If application deployment is rolled back, leave the additive schema in place. Do not delete watch/share records. No backfill invents buyer identity or activity.

## Verification

Use a fresh disposable PostgreSQL instance on localhost:55439. Load the pre-change schema, then the migration; never run the integration test against a shared database. The test refuses other hosts/ports and uses only synthetic test accounts.

```sh
DATABASE_URL=postgresql://samer@localhost:55439/postgres NODE_ENV=test \
  packages/db/node_modules/.bin/tsx packages/trpc/tests/sellerInsights.integration.ts
node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json
```

The integration test covers free/paid/expired/unrelated-plan access, alternate endpoint masking, property ownership, real metrics, watch deduplication and alerts, notification failure rollback, concurrent sharing, and signed Razorpay/PayU verification with duplicate callbacks, pending and failed payments. PayU response hashing follows [PayU’s documented sequence](https://docs.payu.in/docs/hashing-request-and-response), including the reserved fields. The external order API is mocked; no real payment or external message is sent.

Manually check mobile/desktop Leads and Insights, keyboard dialog navigation, and the Razorpay/PayU hosted checkout screens in the payment providers' test environments before release. Staff follow-up automation and new buyer-withdrawal controls are not included. Payment never changes request status.
