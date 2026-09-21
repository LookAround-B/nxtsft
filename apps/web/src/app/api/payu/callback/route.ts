import { NextRequest, NextResponse } from "next/server";
import { verifyPayUHash } from "@nxtsft/trpc/payu";
import prisma from "@nxtsft/db";
import { awardSubscriptionCommission } from "@nxtsft/trpc/commission";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nxtsft.com";

// Guard against direct browser GET hits (PayU always POSTs, but a browser
// navigating to this URL directly would otherwise get a Next.js 405).
export async function GET() {
  return NextResponse.redirect(`${BASE_URL}/payment/failure?reason=invalid`, 303);
}

// PayU POSTs here after every payment (success and failure both arrive here).
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const get = (k: string) => (form.get(k) as string | null) ?? "";

  const txnid = get("txnid");
  const status = get("status"); // "success" | "failure" | "pending"
  const hash = get("hash");
  const mihpayid = get("mihpayid");
  const amount = get("amount");
  const productinfo = get("productinfo");
  const firstname = get("firstname");
  const email = get("email");
  const udf1 = get("udf1"); // userId
  const udf2 = get("udf2"); // planId

  if (!txnid || !hash) {
    return NextResponse.redirect(`${BASE_URL}/payment/failure?reason=invalid`, 303);
  }

  let verified = false;
  try {
    verified = verifyPayUHash(
      {
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        udf1,
        udf2,
        udf3: get("udf3"),
        udf4: get("udf4"),
        udf5: get("udf5"),
      },
      status,
      hash,
      get("additionalCharges") || get("additional_charges"),
    );
  } catch {
    /* Unconfigured gateway must fail closed. */
  }
  if (!verified) {
    return NextResponse.redirect(`${BASE_URL}/payment/failure?reason=tampered`, 303);
  }

  const payment = await prisma.payment.findFirst({ where: { payuTxnId: txnid } });
  if (!payment) {
    return NextResponse.redirect(`${BASE_URL}/payment/failure?reason=not_found`, 303);
  }

  const returnPath = (payment.metadata as { returnPath?: string } | null)?.returnPath;
  // Only server-created internal lead routes are accepted.
  const leadsReturn =
    returnPath && /^\/user-portal(?:\?propertyId=[a-z0-9]+)?#leads$/.test(returnPath)
      ? `${BASE_URL}${returnPath}`
      : null;

  // Idempotency — PayU may POST multiple times
  if (payment.status !== "Pending") {
    return NextResponse.redirect(
      payment.status === "Success"
        ? (leadsReturn ?? `${BASE_URL}/payment/success?txnid=${txnid}`)
        : `${BASE_URL}/payment/failure?txnid=${txnid}`,
      303,
    );
  }

  const userId = payment.userId;
  const meta = payment.metadata as {
    credits?: number;
    type?: string;
    validityDays?: number;
    planName?: string;
    planId?: string;
    cycle?: string;
  } | null;

  if (status === "success") {
    // Defense in depth: the hash makes `amount` authentic to PayU, but also
    // confirm it matches what we recorded for this txn before granting value.
    // Stored amount is paise (BigInt); PayU sends rupees as a decimal string.
    const paidPaise = Math.round(Number(amount) * 100);
    if (!Number.isFinite(paidPaise) || paidPaise !== Number(payment.amount)) {
      return NextResponse.redirect(
        `${BASE_URL}/payment/failure?txnid=${txnid}&reason=amount_mismatch`,
        303,
      );
    }

    if (meta?.type === "owner_subscription") {
      // Owner subscription — create Subscription record
      const validityDays = meta.validityDays ?? 30;
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + validityDays);

      await prisma.$transaction(async (tx) => {
        const claimed = await tx.payment.updateMany({
          where: { id: payment.id, status: "Pending" },
          data: { status: "Success", payuMihpayId: mihpayid || null },
        });
        if (!claimed.count) return;
        await tx.subscription.create({
          data: {
            userId,
            planId: meta.planId ?? udf2,
            planName: meta.planName ?? productinfo,
            amount: payment.amount,
            status: "Active",
            cycle: meta.cycle ?? "monthly",
            startDate: now,
            endDate,
          },
        });
        // Stop surfacing the free-plan dummy-lead teaser now that this seller
        // has real contact access — permanent, not cleared on lapse (showing
        // fabricated leads again to someone who has already paid is worse
        // than showing none). Account-scoped: a subscription covers every
        // free listing this seller owns, not just the one being paid for.
        await tx.dummyLeadAssignment.updateMany({
          where: { sellerId: userId, suppressedAt: null },
          data: { suppressedAt: now },
        });
      });

      // Auto ₹500 commission to the attributed sales rep (self-serve channel).
      // Best-effort — never blocks the payment. Load the plan for its type/price;
      // the helper self-skips non-subscription plan types.
      const planId = meta.planId ?? udf2;
      const plan = planId
        ? await prisma.plan.findUnique({
            where: { id: planId },
            select: { id: true, type: true, price: true, name: true },
          })
        : null;
      if (plan) {
        await awardSubscriptionCommission(
          userId,
          { id: plan.id, type: plan.type, price: plan.price, name: plan.name },
          { paymentId: mihpayid || txnid },
        );
      }

      return NextResponse.redirect(
        leadsReturn ??
          `${BASE_URL}/payment/success?txnid=${txnid}&plan=${encodeURIComponent(meta.planName ?? productinfo)}&type=subscription`,
        303,
      );
    }

    // Seeker credit plan — grant credits
    const credits = meta?.credits ?? 0;
    await Promise.all([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "Success", payuMihpayId: mihpayid || null },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: credits } },
      }),
      prisma.creditTransaction.create({
        data: { userId, type: "credit", amount: credits, reason: "purchase" },
      }),
    ]);

    return NextResponse.redirect(
      `${BASE_URL}/payment/success?txnid=${txnid}&credits=${credits}`,
      303,
    );
  }

  if (status === "pending") {
    return NextResponse.redirect(`${BASE_URL}/payment/success?txnid=${txnid}&pending=1`, 303);
  }
  await prisma.payment.updateMany({
    where: { id: payment.id, status: "Pending" },
    data: { status: "Failed" },
  });

  return NextResponse.redirect(
    `${BASE_URL}/payment/failure?txnid=${txnid}&reason=${encodeURIComponent(status)}`,
    303,
  );
}
