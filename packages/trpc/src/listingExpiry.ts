import prisma from "@nxtsft/db";
import { sendTemplateIfConfigured } from "./bhashsms";

// Paid rep-assisted listings run for a fixed validity window (Lead.expiryDate,
// stamped by the Razorpay webhook). This sweep is what makes that window mean
// something: it warns before the end and unpublishes at the end.
//
// Idempotency comes from the status transition itself — Listed → Expiring Soon
// → Expired — so a re-run (or an overlapping cron tick) can't double-notify and
// no extra column is needed.

export const EXPIRY_WARNING_DAYS = 3;

export type ValiditySweepResult = { warned: number; expired: number; plansEnded: number };

// Boss 09-28: when a seller's plan ends, their listings go BACK TO FREE — they
// stay live (not unpublished) but lose paid placement/badges (freeListing).
// Only when the owner has no other active, unexpired seller plan.
async function hasActiveOwnerPlan(userId: string, now: Date): Promise<boolean> {
  const ownerPlanIds = (
    await prisma.plan.findMany({ where: { type: { startsWith: "owner" } }, select: { id: true } })
  ).map((p) => p.id);
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "Active", endDate: { gt: now }, planId: { in: ownerPlanIds } },
    select: { id: true },
  });
  return sub !== null;
}

/** Move an owner's paid, live/pending listings to the free tier. Returns count moved. */
async function moveOwnerToFreeTier(ownerId: string): Promise<number> {
  const res = await prisma.property.updateMany({
    where: { ownerId, deletedAt: null, freeListing: false, status: { in: ["Active", "Pending"] } },
    data: { freeListing: true },
  });
  return res.count;
}

type SweepLead = {
  id: string;
  name: string;
  phone: string;
  plan: string | null;
  expiryDate: Date | null;
  assignedToId: string | null;
  supervisorId: string | null;
  propertyId: string | null;
  property: { id: string; title: string; slug: string; ownerId: string; status: string } | null;
};

const leadSelect = {
  id: true,
  name: true,
  phone: true,
  plan: true,
  expiryDate: true,
  assignedToId: true,
  supervisorId: true,
  propertyId: true,
  property: { select: { id: true, title: true, slug: true, ownerId: true, status: true } },
} as const;

/** Staff who should hear about a lead's listing lifecycle. */
function staffFor(lead: SweepLead): string[] {
  return [lead.assignedToId, lead.supervisorId].filter((id): id is string => Boolean(id));
}

function daysLeft(expiry: Date | null): number {
  if (!expiry) return 0;
  return Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 86_400_000));
}

export async function sweepListingValidity(): Promise<ValiditySweepResult> {
  const now = new Date();
  const warnBefore = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 86_400_000);

  // ── 1. Expiring soon ────────────────────────────────────────────────────────
  const expiringSoon = (await prisma.lead.findMany({
    where: {
      // A free listing has no validity window — it stays up until an admin
      // takes it down. If a payment link is ever raised on its lead (an
      // upgrade, say), the webhook stamps expiryDate and this sweep would
      // otherwise unpublish the free listing when that window lapses.
      // `NOT` rather than `property: { freeListing: false }` so leads with no
      // property at all are still swept.
      NOT: { property: { is: { freeListing: true } } },
      paymentStatus: "Paid",
      status: "Listed",
      expiryDate: { gt: now, lte: warnBefore },
    },
    select: leadSelect,
    take: 500,
  })) as SweepLead[];

  for (const lead of expiringSoon) {
    const left = daysLeft(lead.expiryDate);
    const title = lead.property?.title ?? "Your listing";

    await prisma.lead.update({ where: { id: lead.id }, data: { status: "Expiring Soon" } });

    const notifications = staffFor(lead).map((userId) => ({
      userId,
      type: "listing_expiring",
      title: "Listing expiring soon",
      content: `${lead.name}'s listing ("${title}") expires in ${left} day${left === 1 ? "" : "s"}. Call them about a renewal.`,
      actionUrl: "/sales-portal",
    }));
    if (lead.property) {
      notifications.push({
        userId: lead.property.ownerId,
        type: "listing_expiring",
        title: "Your listing expires soon",
        content: `"${title}" comes off NxtSft in ${left} day${left === 1 ? "" : "s"}. Renew to keep receiving enquiries.`,
        actionUrl: `/properties/${lead.property.slug}`,
      });
    }
    if (notifications.length > 0) await prisma.notification.createMany({ data: notifications });

    void sendTemplateIfConfigured("BHASHSMS_TEMPLATE_LISTING_EXPIRING", lead.phone, [
      lead.name,
      title,
      String(left),
    ]);
  }

  // ── 2. Expired ──────────────────────────────────────────────────────────────
  const lapsed = (await prisma.lead.findMany({
    where: {
      // A free listing has no validity window — it stays up until an admin
      // takes it down. If a payment link is ever raised on its lead (an
      // upgrade, say), the webhook stamps expiryDate and this sweep would
      // otherwise unpublish the free listing when that window lapses.
      // `NOT` rather than `property: { freeListing: false }` so leads with no
      // property at all are still swept.
      NOT: { property: { is: { freeListing: true } } },
      paymentStatus: "Paid",
      status: { in: ["Listed", "Expiring Soon"] },
      expiryDate: { lte: now },
    },
    select: leadSelect,
    take: 500,
  })) as SweepLead[];

  for (const lead of lapsed) {
    const title = lead.property?.title ?? "Your listing";

    await prisma.lead.update({ where: { id: lead.id }, data: { status: "Expired" } });

    // Back to free (boss 09-28): the listing stays live on the free tier
    // instead of being unpublished — unless the owner still holds another
    // active seller plan. Sold / Rented / Inactive listings are left alone.
    if (lead.property && ["Active", "Pending"].includes(lead.property.status)) {
      if (!(await hasActiveOwnerPlan(lead.property.ownerId, now))) {
        await prisma.property.update({ where: { id: lead.property.id }, data: { freeListing: true } });
      }
    }

    const notifications = staffFor(lead).map((userId) => ({
      userId,
      type: "listing_expired",
      title: "Listing plan expired",
      content: `${lead.name}'s plan for "${title}" has ended; the listing moved to the free tier. Call them about a renewal.`,
      actionUrl: "/sales-portal",
    }));
    if (lead.property) {
      notifications.push({
        userId: lead.property.ownerId,
        type: "listing_expired",
        title: "Your plan has ended",
        content: `"${title}" is still live, now as a free listing. Renew your plan to get paid placement and badges back.`,
        actionUrl: "/pricing",
      });
    }
    if (notifications.length > 0) await prisma.notification.createMany({ data: notifications });

    void sendTemplateIfConfigured("BHASHSMS_TEMPLATE_LISTING_EXPIRED", lead.phone, [lead.name, title]);
  }

  // ── 3. Seller plans that ended (self-serve, PayU, payment links, grants) ────
  // Mark the subscription Expired (still counted as revenue) and, if the owner
  // has no other active seller plan, move their paid listings back to free.
  const ownerPlanIds = (
    await prisma.plan.findMany({ where: { type: { startsWith: "owner" } }, select: { id: true } })
  ).map((p) => p.id);
  const ended = await prisma.subscription.findMany({
    where: { status: "Active", endDate: { lte: now }, planId: { in: ownerPlanIds } },
    select: { id: true, userId: true, planName: true },
    take: 500,
  });
  for (const sub of ended) {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "Expired" } });
    if (await hasActiveOwnerPlan(sub.userId, now)) continue;
    const moved = await moveOwnerToFreeTier(sub.userId);
    await prisma.notification.create({
      data: {
        userId: sub.userId,
        type: "listing_expired",
        title: `Your ${sub.planName} has ended`,
        content:
          moved > 0
            ? `Your listing${moved > 1 ? "s are" : " is"} still live, now as a free listing. Renew to get paid placement and badges back.`
            : "Renew to get paid placement and badges on your listings.",
        actionUrl: "/pricing",
      },
    });
  }

  return { warned: expiringSoon.length, expired: lapsed.length, plansEnded: ended.length };
}
