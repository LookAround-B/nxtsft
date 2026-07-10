import prisma from "@nxtsft/db";

// Verified-badge entitlement (LA-343): a seller shows the Verified Owner +
// NRI Trusted badge set while they hold an active subscription worth
// ₹4,999 or more. Derived from Subscription.amount (paise) rather than a
// plan flag so admin price edits can't strand old purchases.
export const SELLER_BADGE_MIN_PAISE = 4999 * 100;

export async function hasSellerBadges(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "Active",
      endDate: { gt: new Date() },
      amount: { gte: SELLER_BADGE_MIN_PAISE },
    },
    select: { id: true },
  });
  return sub !== null;
}
