import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import prisma from "@nxtsft/db";
import { recordPaymentCommission } from "@nxtsft/trpc/salesCommission";
import { TEST_LISTING_STATUS } from "@nxtsft/shared/constants";

// Razorpay webhook (LA-342) — completion signal for sales payment links.
//
// Configure in the Razorpay dashboard: events `payment_link.paid`,
// `payment_link.cancelled`, `payment_link.expired`, `payment.failed`; secret in
// RAZORPAY_WEBHOOK_SECRET. On payment: lead → Paid → auto-Listed for 10 days
// (per the CRM V3 brief), the customer's rep-created listing is published, then
// the flat ₹500 commission rule runs (first payment from that customer AND
// amount >= ₹4,999). Failed/cancelled/expired links mark the lead Failed and
// tell the rep to follow up.
//
// Idempotent under Razorpay's webhook retries: a lead already marked Paid is
// acknowledged without re-processing, and recordPaymentCommission refuses a
// second commission for the same lead.

const LISTED_VALIDITY_DAYS = 10;

const FAILURE_EVENTS: Record<string, string> = {
  "payment_link.cancelled": "cancelled",
  "payment_link.expired": "expired",
  "payment.failed": "failed",
};

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false; // fail closed
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Notes = { lead_id?: string; salesrep_id?: string; plan?: string };

type PaymentLinkPaidPayload = {
  event?: string;
  payload?: {
    payment_link?: {
      entity?: {
        id?: string;
        amount?: number; // paise
        notes?: Notes;
      };
    };
    // payment.failed carries no payment_link block; Razorpay copies the link's
    // notes onto the payment, so read the lead id from whichever is present.
    payment?: { entity?: { id?: string; notes?: Notes; error_description?: string } };
  };
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!signature || !verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: PaymentLinkPaidPayload;
  try {
    event = JSON.parse(body) as PaymentLinkPaidPayload;
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  const entity = event.payload?.payment_link?.entity;
  const notes = entity?.notes ?? event.payload?.payment?.entity?.notes;

  // Only the paid + failure events drive the CRM pipeline; acknowledge the rest
  // so Razorpay stops retrying them.
  const failureKind = FAILURE_EVENTS[event.event ?? ""];
  if (event.event !== "payment_link.paid" && !failureKind) {
    return NextResponse.json({ ok: true, ignored: event.event ?? "unknown" });
  }

  if (failureKind) {
    return handleFailure(failureKind, notes, event.payload?.payment?.entity?.error_description);
  }

  const leadId = notes?.lead_id;
  const salesRepId = notes?.salesrep_id;
  const paymentId = event.payload?.payment?.entity?.id ?? entity?.id ?? "unknown";
  const amountRupees = Math.round((entity?.amount ?? 0) / 100);

  if (!leadId) {
    // Paid link without CRM notes (e.g. created manually in the dashboard) —
    // nothing to update here.
    return NextResponse.json({ ok: true, ignored: "no lead_id in notes" });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ ok: true, ignored: "lead not found" });
  if (lead.paymentStatus === "Paid") return NextResponse.json({ ok: true, ignored: "already paid" });

  const now = new Date();
  const expiryDate = new Date(now.getTime() + LISTED_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      paymentStatus: "Paid",
      paymentId,
      paymentDate: now,
      status: "Listed",
      expiryDate,
      ...(amountRupees > 0 ? { amount: amountRupees } : {}),
    },
  });

  // Publish the listing the rep created for this customer. It already belongs
  // to the customer's account (properties.create → onBehalfOfLeadId), so paying
  // only has to flip it live and stamp the same validity window as the lead.
  let published: { id: string; title: string; slug: string; ownerId: string } | null = null;
  if (lead.propertyId) {
    const property = await prisma.property.findFirst({
      where: { id: lead.propertyId, deletedAt: null },
      select: { id: true, title: true, slug: true, ownerId: true, status: true },
    });
    // A dummy (Test) listing must never be published by paying its test link —
    // it stays out of search for good. Everything else about the payment (lead
    // Paid, commission, alerts) still runs, which is what the rep is testing.
    if (property && property.status === TEST_LISTING_STATUS) {
      published = null;
    } else if (property && property.status !== "Active") {
      await prisma.property.update({ where: { id: property.id }, data: { status: "Active" } });
      published = property;
    } else if (property) {
      published = property;
    }
  }

  if (published) {
    await prisma.notification.create({
      data: {
        userId: published.ownerId,
        type: "listing_approved",
        title: "Your listing is live",
        content: `"${published.title}" is now live on NxtSft for ${LISTED_VALIDITY_DAYS} days.`,
        actionUrl: `/properties/${published.slug}`,
      },
    });
  }

  let commission: { qualified: boolean; reason: string } = { qualified: false, reason: "no sales rep" };
  if (salesRepId) {
    commission = await recordPaymentCommission({
      leadId,
      salesRepId,
      amountRupees: amountRupees || lead.amount || 0,
      paymentId,
    });
  }

  // Panel alerts: rep, their supervisor, and lead-routing admins hear about
  // every paid link (brief: payment_success_internal).
  const amountLabel = `₹${(amountRupees || lead.amount || 0).toLocaleString("en-IN")}`;
  const recipients = new Set<string>();
  if (salesRepId) recipients.add(salesRepId);
  if (lead.supervisorId) recipients.add(lead.supervisorId);
  const admins = await prisma.user.findMany({
    where: { role: { in: ["admin", "super-admin"] }, active: true },
    select: { id: true },
  });
  for (const a of admins) recipients.add(a.id);

  await prisma.notification.createMany({
    data: [...recipients].map((userId) => ({
      userId,
      type: "payment_success",
      title: "Lead payment received",
      content:
        `${lead.name} paid ${amountLabel}${lead.plan ? ` for ${lead.plan}` : ""}. ` +
        `Lead is now Listed for ${LISTED_VALIDITY_DAYS} days` +
        (published ? ` — "${published.title}" is live.` : ". No listing is linked to this lead yet."),
      actionUrl: "/sales-portal",
    })),
  });

  return NextResponse.json({ ok: true, commission, published: published?.id ?? null });
}

/**
 * Cancelled / expired links and failed payments: mark the lead Failed and alert
 * the rep + supervisor so they can call the customer back. The listing stays
 * Pending (unpublished) on the customer's account — re-sending a link and
 * paying publishes it.
 */
async function handleFailure(
  kind: string,
  notes: Notes | undefined,
  errorDescription: string | undefined,
): Promise<NextResponse> {
  const leadId = notes?.lead_id;
  if (!leadId) return NextResponse.json({ ok: true, ignored: "no lead_id in notes" });

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ ok: true, ignored: "lead not found" });
  // A later failure event on an already-paid lead (e.g. a retried card that
  // failed before the successful one) must never undo the sale.
  if (lead.paymentStatus === "Paid") return NextResponse.json({ ok: true, ignored: "already paid" });
  if (lead.paymentStatus === "Failed") return NextResponse.json({ ok: true, ignored: "already failed" });

  await prisma.lead.update({
    where: { id: leadId },
    data: { paymentStatus: "Failed", status: "Payment Pending" },
  });

  const recipients = new Set<string>();
  if (lead.assignedToId) recipients.add(lead.assignedToId);
  if (lead.supervisorId) recipients.add(lead.supervisorId);
  if (recipients.size === 0) return NextResponse.json({ ok: true, kind, notified: 0 });

  const reason = errorDescription ? ` (${errorDescription})` : "";
  await prisma.notification.createMany({
    data: [...recipients].map((userId) => ({
      userId,
      type: "payment_failed",
      title: `Payment ${kind}`,
      content: `${lead.name}'s payment ${kind}${reason}. Send a fresh link or call them back.`,
      actionUrl: "/sales-portal",
    })),
  });

  return NextResponse.json({ ok: true, kind, notified: recipients.size });
}
