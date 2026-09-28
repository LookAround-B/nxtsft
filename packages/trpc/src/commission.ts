import prisma from "@nxtsft/db";
import { notify } from "./notify";

// Sales commission rule (boss decision 09-28, replaces the flat ₹500 rules):
//   - Staff only: Sales Rep 10%, Virtual Rep 30% of the plan sold. Agents
//     (role "agent", individual partners) never earn commission.
//   - Credited to the rep the customer's lead is on — the rep who created it
//     or the one it was allotted to (Lead.assignedToId).
//   - FRESH sales only: the customer's first paid purchase. Renewals,
//     extensions and repeat purchases earn nothing.
//   - Any plan: seller plans, business (interiors) plans and buyer credit packs.
// Covers every sale path: online checkout, PayU, rep payment links (webhook)
// and admin grants for customers who paid out-of-band.
export const COMMISSION_RATES: Readonly<Record<string, number>> = {
  sales: 0.1,
  "virtual-rep": 0.3,
};

type Result = { qualified: boolean; reason: string };

/**
 * Record the commission for one completed sale, if it qualifies. Call it
 * AFTER the sale's Subscription / Payment row is written. Best-effort: never
 * throws, so a commission problem can't fail the payment that triggered it.
 */
export async function awardSaleCommission(opts: {
  customerId: string | null;
  /** The lead this sale came from, when known (rep payment links). */
  leadId?: string | null;
  /** Rep to credit when the lead has no assignee (e.g. the link's sender). */
  fallbackRepId?: string | null;
  amountRupees: number;
  planName: string;
  /** Payment / order reference, for the commission note. */
  saleRef?: string;
  /** False when this sale wrote no Subscription/Payment row of its own. */
  saleRecorded?: boolean;
}): Promise<Result> {
  try {
    const { customerId, amountRupees, planName } = opts;
    if (!(amountRupees > 0)) return { qualified: false, reason: "free plan" };

    // Attribution: the given lead, else the customer's most recent lead that
    // is on a rep's name.
    const lead = opts.leadId
      ? await prisma.lead.findUnique({
          where: { id: opts.leadId },
          select: { id: true, assignedToId: true, phone: true },
        })
      : customerId
        ? await prisma.lead.findFirst({
            where: {
              OR: [{ userId: customerId }, { buyerUserId: customerId }],
              assignedToId: { not: null },
            },
            orderBy: { updatedAt: "desc" },
            select: { id: true, assignedToId: true, phone: true },
          })
        : null;
    if (!lead) return { qualified: false, reason: "no lead on a rep's name" };
    const repId = lead.assignedToId ?? opts.fallbackRepId ?? null;
    if (!repId) return { qualified: false, reason: "lead not on a rep's name" };

    const rep = await prisma.user.findUnique({
      where: { id: repId },
      select: { id: true, role: true, active: true },
    });
    const rate = rep ? COMMISSION_RATES[rep.role] : undefined;
    if (!rep || !rep.active || rate === undefined) {
      return { qualified: false, reason: "not an active sales / virtual rep" };
    }

    // One commission per lead, ever — also makes webhook retries idempotent.
    const existing = await prisma.commission.findFirst({ where: { leadId: lead.id }, select: { id: true } });
    if (existing) return { qualified: false, reason: "commission already recorded for this lead" };

    // Fresh-sale test. The sale being rewarded is normally already written, so
    // a fresh customer has exactly one paid purchase on record (zero when this
    // sale wrote none): paid subscriptions plus successful non-subscription
    // payments (credit packs, boosts).
    const ownRecords = opts.saleRecorded === false ? 0 : 1;
    if (customerId) {
      const [paidSubs, otherPayments] = await Promise.all([
        prisma.subscription.count({ where: { userId: customerId, amount: { gt: 0 } } }),
        prisma.payment.count({
          where: {
            userId: customerId,
            status: "Success",
            OR: [{ description: null }, { NOT: { description: { endsWith: " subscription" } } }],
          },
        }),
      ]);
      if (paidSubs + otherPayments > ownRecords) return { qualified: false, reason: "repeat customer — renewal / extension" };
    }
    // Same person on another account: an earlier paid lead with this phone.
    const priorPaidLead = await prisma.lead.findFirst({
      where: { phone: lead.phone, paymentStatus: "Paid", id: { not: lead.id } },
      select: { id: true },
    });
    if (priorPaidLead) return { qualified: false, reason: "repeat customer (same phone)" };

    const amount = Math.round(amountRupees * rate);
    const pct = Math.round(rate * 100);
    const now = new Date();
    await prisma.commission.create({
      data: {
        salesRepId: rep.id,
        leadId: lead.id,
        dealValue: BigInt(Math.round(amountRupees)), // rupees
        rate,
        amount: BigInt(amount), // rupees
        status: "pending",
        periodMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        note: `${pct}% of ${planName} (₹${Math.round(amountRupees).toLocaleString("en-IN")}) — fresh sale${
          opts.saleRef ? ` · ${opts.saleRef}` : ""
        }`,
      },
    });

    await notify({
      userId: rep.id,
      type: "commission_earned",
      title: `You earned ₹${amount.toLocaleString("en-IN")} commission 🎉`,
      content: `Fresh sale of ${planName} (₹${Math.round(amountRupees).toLocaleString("en-IN")}) — ${pct}% commission added (pending payout).`,
      actionUrl: "/sales-portal#commission",
    });
    return { qualified: true, reason: `${pct}% of ₹${Math.round(amountRupees)}` };
  } catch (err) {
    console.error("[commission] failed to award:", err instanceof Error ? err.message : err);
    return { qualified: false, reason: "error" };
  }
}

/** Existing checkout call sites: commission for a customer buying `plan`. */
export async function awardSubscriptionCommission(
  payerUserId: string,
  plan: { id: string; type: string; price: number; name: string },
  opts: { paymentId?: string } = {},
): Promise<void> {
  await awardSaleCommission({
    customerId: payerUserId,
    amountRupees: plan.price,
    planName: plan.name,
    saleRef: opts.paymentId ? `payment ${opts.paymentId}` : undefined,
  });
}
