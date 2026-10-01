import prisma from "@nxtsft/db";

// Contact-unlock credits are a buyer feature. Free ones ("demo" login top-up,
// "welcome" signup credit, "promotion" add-your-number reward) go to buyers
// only; sellers get credits only when an admin grants them (boss 10-01).
export const COMPLIMENTARY_CREDIT_REASONS = ["demo", "welcome", "promotion"];
export const COMPLIMENTARY_CREDIT_ROLES: string[] = ["user"];

/**
 * Remove a seller's leftover complimentary credits. Credits an admin granted
 * (or anything else not complimentary) are kept: we keep up to the sum of
 * non-complimentary credit grants and remove the rest of the balance. Logged
 * as a debit ("complimentary_removed"). Returns how many were removed.
 */
export async function removeComplimentaryCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
  if (!user || user.credits <= 0) return 0;
  const granted = await prisma.creditTransaction.aggregate({
    where: { userId, type: "credit", reason: { notIn: COMPLIMENTARY_CREDIT_REASONS } },
    _sum: { amount: true },
  });
  const remove = user.credits - Math.min(user.credits, granted._sum.amount ?? 0);
  if (remove <= 0) return 0;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { credits: { decrement: remove } } }),
    prisma.creditTransaction.create({
      data: { userId, type: "debit", amount: remove, reason: "complimentary_removed" },
    }),
  ]);
  return remove;
}
