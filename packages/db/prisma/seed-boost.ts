/**
 * One-off migration for the listing-boost feature.
 *
 *   pnpm --filter @nxtsft/db exec tsx prisma/seed-boost.ts
 *
 * 1. Upserts the three boost SKUs (Bronze / Silver / Gold). Admins can edit
 *    price, validity, tagline and features afterwards in the Plans tab.
 * 2. Deactivates `decor-monthly`. It is a near-duplicate of `designer-monthly`
 *    (identical price, identical "Business Listing" name) and gates nothing —
 *    the decor directory is gated by an admin `status` flag and contact reveal
 *    by user credits. It has zero subscriptions, so nobody is stranded. The row
 *    is kept, not deleted, so historical Payments still resolve their plan.
 *
 * Idempotent: safe to re-run.
 */
import prisma from "../client";

const BOOST_PLANS = [
  {
    id: "boost-bronze",
    name: "Bronze Boost",
    price: 499,
    priceLabel: "₹499",
    boostTier: "bronze",
    tagline: "Push your listing to page 3 of search",
    features: ["Page 3 of search results", "\"Boosted\" tag on your card", "10-day validity"],
    popular: false,
  },
  {
    id: "boost-silver",
    name: "Silver Boost",
    price: 999,
    priceLabel: "₹999",
    boostTier: "silver",
    tagline: "Push your listing to page 2 of search",
    features: ["Page 2 of search results", "\"Top Pick\" tag on your card", "10-day validity"],
    popular: true,
  },
  {
    id: "boost-gold",
    name: "Gold Boost",
    price: 1499,
    priceLabel: "₹1,499",
    boostTier: "gold",
    tagline: "Page 1 of search, plus a home-page slot",
    features: ["Page 1 of search results", "Featured on the home page", "\"Featured\" tag on your card", "10-day validity"],
    popular: false,
  },
] as const;

async function main() {
  for (const p of BOOST_PLANS) {
    const data = {
      name: p.name,
      price: p.price,
      priceLabel: p.priceLabel,
      credits: 0,
      validity: 10,
      tagline: p.tagline,
      features: [...p.features],
      popular: p.popular,
      type: "boost",
      boostTier: p.boostTier,
      active: true,
    };
    await prisma.plan.upsert({ where: { id: p.id }, create: { id: p.id, ...data }, update: data });
    console.log(`upserted ${p.id} — ${p.priceLabel} ${p.boostTier}`);
  }

  const decor = await prisma.plan.findUnique({ where: { id: "decor-monthly" } });
  if (!decor) {
    console.log("decor-monthly not present — nothing to deactivate");
  } else if (!decor.active) {
    console.log("decor-monthly already inactive");
  } else {
    const subs = await prisma.subscription.count({ where: { planId: "decor-monthly" } });
    if (subs > 0) {
      console.warn(`REFUSING to deactivate decor-monthly: ${subs} subscription(s) reference it.`);
    } else {
      await prisma.plan.update({ where: { id: "decor-monthly" }, data: { active: false } });
      console.log("decor-monthly deactivated (0 subscriptions)");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
