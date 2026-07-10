/**
 * One-off seed for the ₹4,999 Silver seller plan (LA-343).
 *
 *   pnpm --filter @nxtsft/db exec tsx prisma/seed-seller-silver.ts
 *
 * Upserts a single owner-sell SKU that carries the verified-badge set
 * (Verified Owner + NRI Trusted). Badge entitlement is derived at read time
 * from an active subscription of amount >= ₹4,999 — see
 * packages/trpc/src/badges.ts — so no schema flag is needed here.
 *
 * Existing owner tiers are left untouched: the brief maps badges to "the
 * ₹4,999 plan and above", it does not retire other SKUs.
 *
 * Idempotent: safe to re-run.
 */
import prisma from "../client";

async function main() {
  const data = {
    name: "Silver",
    price: 4999,
    priceLabel: "₹4,999",
    credits: 0,
    validity: 90,
    tagline: "Verified badges + NRI-focused visibility",
    features: [
      // Keep "<n> listings" adjacent — sellerListingQuota parses the
      // allowance from this text with /(\d+)\s*listing/.
      "5 listings — residential or commercial",
      "Verified Owner badge on profile + listings",
      "NRI Trusted badge — shown to NRI buyers",
      "WhatsApp + email lead alerts",
      "Priority support",
    ],
    popular: true,
    type: "owner-sell",
    active: true,
  };
  await prisma.plan.upsert({
    where: { id: "owner-sell-silver" },
    create: { id: "owner-sell-silver", ...data },
    update: data,
  });
  console.log("upserted owner-sell-silver — ₹4,999 / 90 days");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
