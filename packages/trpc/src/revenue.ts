import prisma from "@nxtsft/db";

/**
 * Total money received, in rupees, for the admin / super-admin dashboards.
 *
 * Plan sales are counted from Subscription, the one record every sale path
 * writes: online checkout, PayU, rep payment links (Razorpay webhook) and admin
 * grants for customers who paid out-of-band. The last two write no Payment row,
 * which is why summing Payment alone under-reported revenue.
 *
 * Other successful payments (buyer credit packs, listing boosts) have no
 * subscription, so they're added from Payment, skipping the "<plan>
 * subscription" payments already counted above.
 */
export async function totalRevenueRupees(): Promise<number> {
  const [subs, otherPayments] = await Promise.all([
    prisma.subscription.aggregate({
      where: { status: { not: "Failed" } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: "Success",
        OR: [{ description: null }, { NOT: { description: { endsWith: " subscription" } } }],
      },
      _sum: { amount: true },
    }),
  ]);
  return (Number(subs._sum.amount ?? 0) + Number(otherPayments._sum.amount ?? 0)) / 100; // paise → ₹
}
