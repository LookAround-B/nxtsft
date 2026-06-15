"use client";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[oklch(0.97_0.01_260)] px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
        <AlertTriangle size={28} className="text-red-500" />
      </div>
      <h1 className="font-display text-xl font-bold text-navy">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred in your portal."}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
      >
        <RefreshCw size={14} />
        Try again
      </button>
    </div>
  );
}
