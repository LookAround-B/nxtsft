import prisma from "@nxtsft/db";
import { notify } from "./notify";

// Flat commission paid to the attributed sales rep on each successful
// subscription payment (08-20 boss ask — a fixed ₹500, NOT the Commission
// model's percentage rate).
//
// This covers the SELF-SERVE channel: a customer who subscribes directly on the
// site (owner/business checkout + PayU). It is DISTINCT from LA-342's
// `recordPaymentCommission` (salesCommission.ts), which handles rep-sent Razorpay
// payment LINKS and gates on new-sale + plan ≥ ₹4,999. Per the boss decision this
// channel pays on EVERY successful payment (any amount, renewals included), so the
// two channels intentionally use different rules. There is no overlap: the LA-342
// webhook only fires on `payment_link.paid`, never on self-serve checkout.
export const SUBSCRIPTION_COMMISSION_RUPEES = 500;

// Plan types that count as a "subscription" for commission purposes — every
// paid plan EXCEPT buyer credit packs ("seeker").
const SUBSCRIPTION_PLAN_TYPES = new Set(["owner-rent", "owner-sell", "designer", "decor"]);

/**
 * Award the flat ₹500 subscription commission to the sales rep attributed to a
 * paying customer, on a SUCCESSFUL subscription payment.
 *
 * Best-effort: it never throws — a commission failure must not roll back or
 * fail the payment that triggered it. It no-ops (returns) when:
 *   - the plan is a buyer credit pack (not a subscription),
 *   - the customer has no lead assigned to a sales rep (e.g. organic signup),
 *   - the assigned user isn't an active sales rep.
 *
 * Call this once per successful payment. Every payment path already dedups
 * payments (rejects a repeated gateway id / short-circuits a non-pending
 * payment), so this fires exactly once per payment — and a renewal, being a
 * new payment, pays the rep ₹500 again.
 */
export async function awardSubscriptionCommission(
  payerUserId: string,
  plan: { id: string; type: string; price: number; name: string },
  opts: { paymentId?: string } = {},
): Promise<void> {
  try {
    if (!SUBSCRIPTION_PLAN_TYPES.has(plan.type)) return;

    // Attribution: the sales rep who owns this customer's most recently
    // touched lead. No assigned rep → no commission.
    const lead = await prisma.lead.findFirst({
      where: { userId: payerUserId, assignedToId: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, assignedToId: true },
    });
    if (!lead?.assignedToId) return;

    // Leads are assigned to sales reps, but guard against a stale/wrong id
    // crediting a non-rep or a deactivated account.
    const rep = await prisma.user.findUnique({
      where: { id: lead.assignedToId },
      select: { id: true, role: true, active: true },
    });
    if (!rep || rep.role !== "sales" || !rep.active) return;

    const now = new Date();
    const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    await prisma.commission.create({
      data: {
        salesRepId: rep.id,
        leadId: lead.id,
        dealValue: BigInt(Math.max(0, Math.round(plan.price))),
        rate: 0, // flat commission — `amount` is authoritative, not dealValue*rate
        amount: BigInt(SUBSCRIPTION_COMMISSION_RUPEES),
        status: "pending",
        periodMonth,
        note: `Flat ₹${SUBSCRIPTION_COMMISSION_RUPEES} subscription commission — ${plan.name}${
          opts.paymentId ? ` · payment ${opts.paymentId}` : ""
        }`,
      },
    });

    await notify({
      userId: rep.id,
      type: "commission_earned",
      title: `You earned ₹${SUBSCRIPTION_COMMISSION_RUPEES} commission 🎉`,
      content: `A customer purchased the ${plan.name} plan — ₹${SUBSCRIPTION_COMMISSION_RUPEES} added to your commissions (pending payout).`,
      actionUrl: "/sales-portal#commission",
    });
  } catch (err) {
    // Never let a commission failure break the payment flow.
    console.error(
      "[commission] failed to award subscription commission:",
      err instanceof Error ? err.message : err,
    );
  }
}
