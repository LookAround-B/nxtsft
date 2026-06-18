"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

/**
 * Route-level error boundary. Catches render/runtime errors anywhere in the
 * page tree, toasts a user-safe message, and offers a retry.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    toast.error(getErrorMessage(error));
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-xl font-semibold text-neutral-900">Something went wrong</h2>
      <p className="max-w-md text-sm text-neutral-500">{getErrorMessage(error)}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}
