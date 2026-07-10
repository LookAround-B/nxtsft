import prisma from "@nxtsft/db";
import { notify } from "./notify";

// LA-342 commission rule — flat ₹500, paid ONLY when both hold:
//   1. New sale: this customer's phone has no previously-paid lead.
//   2. Plan value >= ₹4,999.
// Renewals, boosts, relists and smaller plans earn nothing. This replaces the
// legacy 2%-of-deal-value flow for payment-link sales; legacy Commission rows
// (rate > 0) are left as-is.
export const COMMISSION_FLAT_RUPEES = 500;
export const COMMISSION_MIN_SALE_RUPEES = 4999;

export async function recordPaymentCommission(opts: {
  leadId: string;
  salesRepId: string;
  amountRupees: number;
  paymentId: string;
}): Promise<{ qualified: boolean; reason: string }> {
  const { leadId, salesRepId, amountRupees, paymentId } = opts;

  // Idempotent under webhook retries: one commission per lead, ever.
  const existing = await prisma.commission.findFirst({ where: { leadId } });
  if (existing) return { qualified: false, reason: "commission already recorded for lead" };

  if (amountRupees < COMMISSION_MIN_SALE_RUPEES) {
    return { qualified: false, reason: `plan value ₹${amountRupees} < ₹${COMMISSION_MIN_SALE_RUPEES}` };
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { phone: true },
  });
  if (!lead) return { qualified: false, reason: "lead not found" };

  // New-sale test: any OTHER paid lead with the same customer phone means
  // this is a renewal/repeat, not a first payment.
  const priorPaid = await prisma.lead.findFirst({
    where: { phone: lead.phone, paymentStatus: "Paid", id: { not: leadId } },
    select: { id: true },
  });
  if (priorPaid) return { qualified: false, reason: "repeat customer — not a new sale" };

  const now = new Date();
  await prisma.commission.create({
    data: {
      salesRepId,
      leadId,
      dealValue: BigInt(amountRupees),
      rate: 0, // flat payout, not a percentage
      amount: BigInt(COMMISSION_FLAT_RUPEES),
      status: "pending",
      periodMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      note: `Qualified new sale ≥ ₹${COMMISSION_MIN_SALE_RUPEES} (payment ${paymentId})`,
    },
  });

  await notify({
    userId: salesRepId,
    type: "payment_success",
    title: "₹500 commission earned",
    content: `Qualified new sale of ₹${amountRupees.toLocaleString("en-IN")} — ₹500 commission added (pending payout).`,
    actionUrl: "/sales-portal",
  });

  return { qualified: true, reason: "new sale ≥ ₹4,999" };
}
