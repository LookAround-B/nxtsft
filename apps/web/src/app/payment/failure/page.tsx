"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { XCircle } from "lucide-react";

function FailureContent() {
  const params = useSearchParams();
  const reason = params.get("reason");
  const txnid  = params.get("txnid");

  const message =
    reason === "tampered"
      ? "Payment signature mismatch. Please contact support."
      : reason === "not_found"
        ? "Transaction not found. Please contact support."
        : "Your payment was not completed.";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-10 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
          <XCircle className="h-8 w-8 text-rose-600" />
        </div>
        <h1 className="font-display text-2xl font-bold text-navy">Payment Failed</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {txnid && (
          <p className="mt-1 font-mono text-xs text-muted-foreground">Ref: {txnid}</p>
        )}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/pricing"
            className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
          >
            Try Again
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-accent underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense>
      <FailureContent />
    </Suspense>
  );
}
