"use client";

import { getErrorMessage } from "@/lib/errors";

/**
 * Last-resort boundary for errors in the root layout itself. The Toaster lives
 * inside that layout, so it isn't available here — we render a standalone page
 * with its own <html>/<body> and an inline message.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h2>
        <p style={{ color: "#737373", fontSize: "0.875rem", maxWidth: "28rem" }}>{getErrorMessage(error)}</p>
        <button
          onClick={reset}
          style={{
            background: "#dc2626",
            color: "#fff",
            border: 0,
            borderRadius: "0.5rem",
            padding: "0.625rem 1.25rem",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
