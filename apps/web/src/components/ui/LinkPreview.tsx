"use client";
import { useState } from "react";

/**
 * Link that pops a small preview card on hover (Aceternity LinkPreview-style)
 * and opens the URL in a new tab on click. `preview` is any node — a map
 * thumbnail, a branded social card, etc. Desktop-only (hover has no meaning
 * on touch); renders as a plain link when no preview is given.
 */
export function LinkPreview({
  href,
  className = "",
  ariaLabel,
  preview,
  align = "center",
  children,
}: {
  href: string;
  className?: string;
  ariaLabel?: string;
  preview?: React.ReactNode;
  /** "start" anchors the card to the link's left edge — use near the viewport edge where a centred card would clip. */
  align?: "center" | "start";
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className={className}
      >
        {children}
      </a>
      {preview && (
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-full z-50 mb-2 hidden overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-xl transition-all duration-200 ease-out md:block ${
            align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
          } ${show ? "translate-y-0 scale-100 opacity-100" : "translate-y-1.5 scale-95 opacity-0"}`}
        >
          {preview}
        </span>
      )}
    </span>
  );
}
