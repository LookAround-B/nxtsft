// Razorpay Payment Links (LA-342) — sales reps send these to lead customers.
// Distinct from the checkout-order flow in the subscriptions router: links are
// created server-side and paid on Razorpay's hosted page, so the webhook
// (apps/web/src/app/api/razorpay/webhook) is the single completion signal.

export type PaymentLinkResult = {
  id: string;
  shortUrl: string;
};

export async function createRazorpayPaymentLink(opts: {
  amountRupees: number;
  description: string;
  customer: { name: string; contact: string; email?: string };
  notes: Record<string, string>;
}): Promise<PaymentLinkResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay not configured.");

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: opts.amountRupees * 100, // paise
      currency: "INR",
      description: opts.description,
      customer: {
        name: opts.customer.name,
        contact: opts.customer.contact,
        ...(opts.customer.email ? { email: opts.customer.email } : {}),
      },
      notify: { sms: true, email: Boolean(opts.customer.email) },
      notes: opts.notes,
      reminder_enable: true,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { description?: string } };
    throw new Error(err?.error?.description ?? `Razorpay payment link failed (${res.status}).`);
  }

  const link = (await res.json()) as { id: string; short_url: string };
  return { id: link.id, shortUrl: link.short_url };
}
