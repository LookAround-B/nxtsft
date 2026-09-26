import prisma from "@nxtsft/db";

// Moving a paying owner's listings off the free tier.
//
// `Property.freeListing` (last-page ranking + the "Free Listing" badge) is a
// per-listing flag, while a plan is a per-owner Subscription — nothing linked
// the two, so customers who paid (self-serve checkout, PayU, a rep's payment
// link, or an admin grant) kept their listing badged "Free". Every path that
// creates an owner subscription calls liftFreeTier() so the plan and the
// listing agree.

/**
 * How many listings an owner (owner-*) plan allows. The allowance isn't a
 * structured field — plans encode it in their feature list ("1 listing",
 * "3 listings", "Unlimited listings"). Unlimited → null (no cap); otherwise the
 * first "<n> listing" number wins; if the text drops the count, 1.
 */
export function listingAllowance(features: string[]): number | null {
  const joined = features.join(" ").toLowerCase();
  if (joined.includes("unlimited listing")) return null;
  const match = joined.match(/(\d+)\s*listing/);
  return match ? Number(match[1]) : 1;
}

/**
 * Lift the owner's live free-tier listings off the free tier, up to the plan's
 * listing allowance. Listings already off the free tier count against the
 * allowance, and the oldest free listings are lifted first — so a 1-listing
 * plan never upgrades a second listing. Returns how many were lifted.
 *
 * Best-effort: callers run it after the payment is recorded and must not fail
 * the payment if it throws.
 */
export async function liftFreeTier(userId: string, planId: string): Promise<number> {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { type: true, features: true } });
  if (!plan || !plan.type.startsWith("owner")) return 0;

  const allowance = listingAllowance(plan.features);
  const live = { ownerId: userId, deletedAt: null, status: "Active" };
  const [alreadyPaid, free] = await Promise.all([
    prisma.property.count({ where: { ...live, freeListing: false } }),
    prisma.property.findMany({
      where: { ...live, freeListing: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);
  const slots = allowance === null ? free.length : Math.max(0, allowance - alreadyPaid);
  const ids = free.slice(0, slots).map((p) => p.id);
  if (ids.length) {
    await prisma.property.updateMany({ where: { id: { in: ids } }, data: { freeListing: false } });
  }
  return ids.length;
}
