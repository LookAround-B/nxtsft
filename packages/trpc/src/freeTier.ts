import prisma from "@nxtsft/db";
import { TRPCError } from "@trpc/server";

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

// ── Listing cap (boss 09-28): free users get 1 listing; a paid owner plan
// allows its own number (from the plan's features, so new / edited plans apply
// automatically; "Unlimited listings" = no cap). Applies to self-serve users
// listing for themselves. Staff listing on a customer's behalf are not capped.
// Existing listings are never touched; only NEW ones are refused over the cap.
export const FREE_LISTING_ALLOWANCE = 1;
const UNCAPPED_ROLES = ["sales", "virtual-rep", "admin", "super-admin", "supervisor", "support-admin"];

/** Listings that occupy a slot: live or awaiting approval. */
const IN_USE_STATUSES = ["Active", "Pending"];

export async function listingCap(userId: string): Promise<{
  allowance: number | null;
  inUse: number;
  planName: string | null;
}> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "Active", endDate: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { planId: true, planName: true },
  });
  const plan = sub
    ? await prisma.plan.findUnique({ where: { id: sub.planId }, select: { type: true, features: true } })
    : null;
  const ownerPlan = plan && plan.type.startsWith("owner") ? plan : null;
  const inUse = await prisma.property.count({
    where: { ownerId: userId, deletedAt: null, status: { in: IN_USE_STATUSES } },
  });
  return {
    allowance: ownerPlan ? listingAllowance(ownerPlan.features) : FREE_LISTING_ALLOWANCE,
    inUse,
    planName: ownerPlan ? sub!.planName : null,
  };
}

/** Throw a friendly FORBIDDEN when `adding` more listings would exceed the cap. */
export async function assertListingCap(user: { id: string; role: string }, adding = 1): Promise<void> {
  if (UNCAPPED_ROLES.includes(user.role)) return;
  const cap = await listingCap(user.id);
  if (cap.allowance === null || cap.inUse + adding <= cap.allowance) return;
  const left = Math.max(0, cap.allowance - cap.inUse);
  const planLabel = cap.planName ? `Your ${cap.planName}` : "The free plan";
  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      adding > 1 && left > 0
        ? `${planLabel} allows ${cap.allowance} listing${cap.allowance === 1 ? "" : "s"}; you can add ${left} more, but this file has ${adding}. Upgrade your plan to add more.`
        : `${planLabel} allows ${cap.allowance} listing${cap.allowance === 1 ? "" : "s"} and you've used ${cap.inUse}. Upgrade your plan to add more.`,
  });
}
