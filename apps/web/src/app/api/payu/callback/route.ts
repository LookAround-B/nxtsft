import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import prisma from "@nxtsft/db";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nxtsft.com";

function verifyHash(
  fields: { txnid: string; amount: string; productinfo: string; firstname: string; email: string; udf1: string; udf2: string },
  status: string,
  receivedHash: string,
): boolean {
  const salt = process.env.PAYU_MERCHANT_SALT!;
  const key  = process.env.PAYU_MERCHANT_KEY!;
  const { txnid, amount, productinfo, firstname, email, udf1, udf2 } = fields;
  // PayU reverse hash: salt|status|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const str = `${salt}|${status}||||||${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  return createHash("sha512").update(str).digest("hex") === receivedHash;
}

// Guard against direct browser GET hits (PayU always POSTs, but a browser
// navigating to this URL directly would otherwise get a Next.js 405).
export async function GET() {
  return NextResponse.redirect(`${BASE_URL}/payment/failure?reason=invalid`);
}

// PayU POSTs here after every payment (success and failure both arrive here).
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const get  = (k: string) => (form.get(k) as string | null) ?? "";

  const txnid       = get("txnid");
  const status      = get("status");   // "success" | "failure" | "pending"
  const hash        = get("hash");
  const mihpayid    = get("mihpayid");
  const amount      = get("amount");
  const productinfo = get("productinfo");
  const firstname   = get("firstname");
  const email       = get("email");
  const udf1        = get("udf1"); // userId
  const udf2        = get("udf2"); // planId

  if (!txnid || !hash) {
    return NextResponse.redirect(`${BASE_URL}/payment/failure?reason=invalid`);
  }

  if (!verifyHash({ txnid, amount, productinfo, firstname, email, udf1, udf2 }, status, hash)) {
    return NextResponse.redirect(`${BASE_URL}/payment/failure?reason=tampered`);
  }

  const payment = await prisma.payment.findFirst({ where: { payuTxnId: txnid } });
  if (!payment) {
    return NextResponse.redirect(`${BASE_URL}/payment/failure?reason=not_found`);
  }

  // Idempotency — PayU may POST multiple times
  if (payment.status !== "Pending") {
    return NextResponse.redirect(
      payment.status === "Success"
        ? `${BASE_URL}/payment/success?txnid=${txnid}`
        : `${BASE_URL}/payment/failure?txnid=${txnid}`,
    );
  }

  const userId = udf1 || payment.userId;
  const meta   = payment.metadata as { credits?: number; type?: string; validityDays?: number; planName?: string; planId?: string; cycle?: string } | null;

  if (status === "success") {
    if (meta?.type === "owner_subscription") {
      // Owner subscription — create Subscription record
      const validityDays = meta.validityDays ?? 30;
      const now     = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + validityDays);

      await Promise.all([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "Success", payuMihpayId: mihpayid || null },
        }),
        prisma.subscription.create({
          data: {
            userId,
            planId:   meta.planId ?? udf2,
            planName: meta.planName ?? productinfo,
            amount:   payment.amount,
            status:   "Active",
            cycle:    meta.cycle ?? "monthly",
            startDate: now,
            endDate,
          },
        }),
      ]);

      return NextResponse.redirect(
        `${BASE_URL}/payment/success?txnid=${txnid}&plan=${encodeURIComponent(meta.planName ?? productinfo)}&type=subscription`,
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
    );
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "Failed" },
  });

  return NextResponse.redirect(
    `${BASE_URL}/payment/failure?txnid=${txnid}&reason=${encodeURIComponent(status)}`,
  );
}
