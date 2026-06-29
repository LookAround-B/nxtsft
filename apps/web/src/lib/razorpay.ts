export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") { reject(new Error("SSR")); return; }
    if ((window as unknown as Record<string, unknown>).Razorpay) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.head.appendChild(script);
  });
}

interface OpenOptions {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  prefill: { name: string; email: string; contact: string };
  onSuccess: (resp: RazorpaySuccessResponse) => void;
  onDismiss: () => void;
}

export async function openRazorpayCheckout(opts: OpenOptions): Promise<void> {
  await loadScript();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rzp = new (window as any).Razorpay({
    key: opts.keyId,
    amount: opts.amount,
    currency: opts.currency,
    name: "NxtSft.com",
    description: "Credits Purchase",
    order_id: opts.orderId,
    prefill: opts.prefill,
    theme: { color: "#0052CC" },
    modal: { ondismiss: opts.onDismiss },
    handler: opts.onSuccess,
  });
  rzp.open();
}
