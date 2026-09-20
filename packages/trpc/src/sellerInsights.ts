import prisma from "@nxtsft/db";
import { TRPCError } from "@trpc/server";

// Internal acquisition/test leads are not buyer requests.
export const buyerLeadWhere = {
  OR: [{ source: null }, { source: { notIn: ["Dummy", "Fresh Lead", "Signup", "Rep Contact"] } }],
};

export async function hasSellerContactAccess(userId: string) {
  const plans = await prisma.plan.findMany({
    where: { type: { in: ["owner-sell", "owner-rent"] } },
    select: { id: true },
  });
  const now = new Date();
  return !!(await prisma.subscription.findFirst({
    where: {
      userId,
      planId: { in: plans.map((p) => p.id) },
      status: "Active",
      startDate: { lte: now },
      endDate: { gt: now },
    },
    select: { id: true },
  }));
}

export async function ownedSellerProperties(userId: string, propertyId?: string) {
  const properties = await prisma.property.findMany({
    where: { ownerId: userId, deletedAt: null, ...(propertyId ? { id: propertyId } : {}) },
    select: { id: true, title: true, slug: true, location: { select: { city: true } } },
  });
  if (propertyId && !properties.length)
    throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found." });
  return properties;
}

export async function listingInsights(propertyIds: string[]) {
  const where = { propertyId: { in: propertyIds } };
  const [views, watching, shortlisted, enquiries, unlocks, visits] = await Promise.all([
    prisma.propertyView.count({ where }),
    prisma.propertyWatch.count({ where }),
    prisma.favorite.count({ where }),
    prisma.lead.count({ where: { ...where, ...buyerLeadWhere } }),
    prisma.creditTransaction.count({ where: { ...where, reason: "contact_unlock" } }),
    prisma.siteVisit.count({ where }),
  ]);
  return { views, watching, shortlisted, requested: enquiries + unlocks + visits };
}
