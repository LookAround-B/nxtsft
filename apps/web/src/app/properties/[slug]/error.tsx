"use client";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
        <AlertTriangle size={28} className="text-red-500" />
      </div>
      <h1 className="font-display text-xl font-bold text-navy">Property not available</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {error.message || "This property listing could not be loaded."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
        >
          <RefreshCw size={14} />
          Retry
        </button>
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:-translate-y-0.5"
        >
          <ArrowLeft size={14} />
          All properties
        </Link>
      </div>
    </div>
  );
}
