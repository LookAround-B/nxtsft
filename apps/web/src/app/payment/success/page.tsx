"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle, Mail, ArrowRight } from "lucide-react";

function SuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const credits = params.get("credits");
  const plan    = params.get("plan");
  const txnid   = params.get("txnid");
  const type    = params.get("type"); // "subscription" | "credits"

  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      router.replace("/user-portal");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, router]);

  const isSubscription = type === "subscription";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[oklch(0.97_0.01_260)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-10 text-center shadow-lg">

        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="h-10 w-10 text-emerald-600" strokeWidth={1.5} />
        </div>

        {/* Heading */}
        <h1 className="font-display text-2xl font-bold text-navy">
          Payment Successful!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Thank you for your purchase.
        </p>

        {/* What they got */}
        <div className="mt-5 rounded-xl bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          {isSubscription && plan ? (
            <span>
              <span className="font-bold">{plan}</span> is now active on your account.
              Your listings will go live within 24 hours of verification.
            </span>
          ) : credits ? (
            <span>
              <span className="font-bold">{credits} credit{Number(credits) !== 1 ? "s" : ""}</span> have been added to your wallet and are ready to use.
            </span>
          ) : plan ? (
            <span><span className="font-bold">{plan}</span> is now active.</span>
          ) : (
            <span>Your purchase is confirmed and active on your account.</span>
          )}
        </div>

        {/* Email notice */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-left text-xs text-muted-foreground">
          <Mail size={14} className="mt-0.5 shrink-0 text-accent" />
          <span>
            A confirmation email with all payment details will be sent to your registered email address shortly.
          </span>
        </div>

        {/* Txn ref */}
        {txnid && (
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            Transaction Ref: {txnid}
          </p>
        )}

        {/* Auto-redirect */}
        <p className="mt-6 text-xs text-muted-foreground">
          Redirecting to your dashboard in{" "}
          <span className="font-bold text-accent">{countdown}s</span>…
        </p>

        {/* Button */}
        <button
          onClick={() => router.replace("/user-portal")}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground transition hover:opacity-90"
        >
          Go to Dashboard <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
