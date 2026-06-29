"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

function SuccessContent() {
  const params = useSearchParams();
  const credits = params.get("credits");
  const txnid   = params.get("txnid");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-10 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="font-display text-2xl font-bold text-navy">Payment Successful!</h1>
        {credits && (
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-semibold text-emerald-600">{credits} credit{Number(credits) !== 1 ? "s" : ""}</span> have been added to your wallet.
          </p>
        )}
        {txnid && (
          <p className="mt-1 font-mono text-xs text-muted-foreground">Ref: {txnid}</p>
        )}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/user-portal?tab=credits"
            className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
          >
            View My Credits
          </Link>
          <Link href="/properties" className="text-sm text-muted-foreground hover:text-accent underline">
            Browse Properties
          </Link>
        </div>
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
