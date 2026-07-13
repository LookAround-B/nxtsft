"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { usePwaInstall } from "@/lib/usePwaInstall";
import { InstallAppButton } from "./InstallAppButton";

const DISMISS_KEY = "nxtsft_install_banner_dismissed";

/**
 * MagicBricks-style top strip prompting the user to install the PWA. Shows only
 * when the app is installable (or on iOS Safari) and hasn't been dismissed.
 * Dismissal is remembered so it doesn't nag on every visit.
 */
export function InstallBanner() {
  const { canInstall, ios, installed } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid an SSR flash

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (installed || dismissed || (!canInstall && !ios)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex items-center gap-3 border-b border-accent/20 bg-accent/5 px-4 py-2 sm:px-6">
      <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-7 w-7 object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-navy">Get the NxtSft.com app</p>
        <p className="truncate text-xs text-muted-foreground">
          Faster browsing, instant alerts &amp; one-tap access.
        </p>
      </div>
      <InstallAppButton
        compact={false}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90"
      />
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary"
      >
        <X size={16} />
      </button>
    </div>
  );
}
