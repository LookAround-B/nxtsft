import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import prisma from "@nxtsft/db";
import { recordPaymentCommission } from "@nxtsft/trpc/salesCommission";

// Razorpay webhook (LA-342) — completion signal for sales payment links.
//
// Configure in the Razorpay dashboard: event `payment_link.paid`, secret in
// RAZORPAY_WEBHOOK_SECRET. On payment: lead → Paid → auto-Listed for 10 days
// (per the CRM V3 brief), then the flat ₹500 commission rule runs
// (first payment from that customer AND amount >= ₹4,999).
//
// Idempotent under Razorpay's webhook retries: a lead already marked Paid is
// acknowledged without re-processing, and recordPaymentCommission refuses a
// second commission for the same lead.

const LISTED_VALIDITY_DAYS = 10;

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false; // fail closed
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

type PaymentLinkPaidPayload = {
  event?: string;
  payload?: {
    payment_link?: {
      entity?: {
        id?: string;
        amount?: number; // paise
        notes?: { lead_id?: string; salesrep_id?: string; plan?: string };
      };
    };
    payment?: { entity?: { id?: string } };
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

  // Only payment_link.paid drives the CRM pipeline; acknowledge the rest so
  // Razorpay stops retrying them.
  if (event.event !== "payment_link.paid") {
    return NextResponse.json({ ok: true, ignored: event.event ?? "unknown" });
  }

  const entity = event.payload?.payment_link?.entity;
  const leadId = entity?.notes?.lead_id;
  const salesRepId = entity?.notes?.salesrep_id;
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
      content: `${lead.name} paid ${amountLabel}${lead.plan ? ` for ${lead.plan}` : ""}. Lead is now Listed for ${LISTED_VALIDITY_DAYS} days.`,
      actionUrl: "/sales-portal",
    })),
  });

  return NextResponse.json({ ok: true, commission });
}
