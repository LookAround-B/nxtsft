"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cookie } from "lucide-react";

const CONSENT_KEY = "nxtsft_cookie_consent";

export function CookieBanner() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      const t = setTimeout(() => {
        setShow(true);
        // Two rAF so the element first renders in the off-screen position,
        // then the transition fires on the next paint.
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  const choose = (decision: "accepted" | "rejected") => {
    setVisible(false);
    setTimeout(() => {
      localStorage.setItem(CONSENT_KEY, decision);
      setShow(false);
    }, 460);
  };

  if (pathname === "/boneyard" || !show) return null;

  return (
    <div
      style={{ transition: "transform 0.46s cubic-bezier(0.16,1,0.3,1), opacity 0.46s ease" }}
      className={`fixed inset-x-0 bottom-16 z-[9998] px-3 pb-2 md:bottom-0 md:px-0 md:pb-0 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-2xl border border-border bg-white px-5 py-4 shadow-[0_-8px_32px_-4px_rgba(0,0,0,0.10)] sm:flex-row sm:items-center sm:gap-5 md:rounded-none md:rounded-t-2xl">
        {/* Icon + mobile heading */}
        <div className="flex shrink-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-500">
            <Cookie size={20} strokeWidth={1.75} />
          </span>
          <p className="font-display text-sm font-bold text-navy sm:hidden">Cookie Preferences</p>
        </div>

        {/* Body text */}
        <p className="flex-1 text-sm leading-relaxed text-foreground/70">
          We use cookies to enhance your browsing experience, personalise content and analyse
          traffic. Please review our{" "}
          <Link
            href="/cookie-policy"
            className="font-semibold text-accent underline-offset-2 hover:underline"
          >
            Cookie Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="font-semibold text-accent underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>{" "}
          before proceeding.
        </p>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => choose("rejected")}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-navy hover:text-navy"
          >
            Reject
          </button>
          <button
            onClick={() => choose("accepted")}
            className="rounded-xl bg-accent px-5 py-2 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
