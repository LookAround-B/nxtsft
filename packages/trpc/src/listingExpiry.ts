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

export type ValiditySweepResult = { warned: number; expired: number };

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

    // Unpublish, don't delete: the owner keeps the listing and can renew it.
    // Anything an admin already moved off Active (Sold, Rented) is left alone.
    if (lead.property?.status === "Active") {
      await prisma.property.update({ where: { id: lead.property.id }, data: { status: "Inactive" } });
    }

    const notifications = staffFor(lead).map((userId) => ({
      userId,
      type: "listing_expired",
      title: "Listing expired",
      content: `${lead.name}'s listing ("${title}") has expired and is no longer visible to buyers.`,
      actionUrl: "/sales-portal",
    }));
    if (lead.property) {
      notifications.push({
        userId: lead.property.ownerId,
        type: "listing_expired",
        title: "Your listing has expired",
        content: `"${title}" is no longer visible to buyers. Renew it to go live again.`,
        actionUrl: "/pricing",
      });
    }
    if (notifications.length > 0) await prisma.notification.createMany({ data: notifications });

    void sendTemplateIfConfigured("BHASHSMS_TEMPLATE_LISTING_EXPIRED", lead.phone, [lead.name, title]);
  }

  return { warned: expiringSoon.length, expired: lapsed.length };
}
