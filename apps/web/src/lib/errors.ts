import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@nxtsft/trpc";

/**
 * Normalize any thrown value into a single user-safe message string.
 *
 * Never surfaces raw internals (stack traces, prisma/DB errors). tRPC errors
 * carry server-authored messages which are safe to show; Zod validation errors
 * are flattened to the first field message. Everything else falls back to a
 * generic line so we never leak implementation detail into the UI.
 */
export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof TRPCClientError) {
    const trpcError = error as TRPCClientError<AppRouter>;

    // Zod / input validation: show the first field-level message.
    const zod = trpcError.data?.zodError;
    if (zod) {
      const fieldError = Object.values(zod.fieldErrors ?? {}).flat()[0];
      const formError = zod.formErrors?.[0];
      const first = fieldError ?? formError;
      if (first) return first;
    }

    if (trpcError.message) return mapByCode(trpcError.data?.code, trpcError.message);
    return fallback;
  }

  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

/** Friendlier copy for common transport/auth codes; otherwise pass through. */
function mapByCode(code: string | undefined, message: string): string {
  switch (code) {
    case "UNAUTHORIZED":
      return "Your session expired. Please sign in again.";
    case "FORBIDDEN":
      return "You don't have access to that.";
    case "TOO_MANY_REQUESTS":
      return message || "Too many requests. Please slow down.";
    case "INTERNAL_SERVER_ERROR":
      return "Server error. Please try again shortly.";
    default:
      return message;
  }
}
