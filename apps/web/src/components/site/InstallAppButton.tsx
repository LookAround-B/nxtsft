"use client";
import { useState } from "react";
import { Download, X, Share } from "lucide-react";
import { usePwaInstall } from "@/lib/usePwaInstall";

/**
 * "Get App" — installs the PWA. Renders nothing when the app is already
 * installed or the browser can't install it, so it's never a dead CTA. On iOS
 * Safari (no install prompt) it shows Add-to-Home-Screen instructions.
 */
export function InstallAppButton({
  className,
  compact = true,
}: {
  className?: string;
  /** Header: hide the "Get App" label on small screens. Menu: always show it. */
  compact?: boolean;
}) {
  const { canInstall, ios, promptInstall } = usePwaInstall();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (!canInstall && !ios) return null;

  const handleClick = async () => {
    if (canInstall) {
      await promptInstall();
    } else if (ios) {
      setShowIosHelp((v) => !v);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        aria-label="Install the NxtSft app"
        className={
          className ??
          "inline-flex items-center gap-1.5 rounded-lg border border-navy/20 bg-navy/5 px-2.5 py-2 text-sm font-semibold text-navy transition hover:bg-navy/10 sm:px-3"
        }
      >
        <Download size={15} className="shrink-0" />
        <span className={compact ? "hidden sm:inline" : ""}>Get App</span>
      </button>

      {ios && showIosHelp && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-border bg-white p-4 text-left shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-navy">Install NxtSft</span>
            <button
              onClick={() => setShowIosHelp(false)}
              aria-label="Close"
              className="rounded p-0.5 text-muted-foreground hover:bg-secondary"
            >
              <X size={14} />
            </button>
          </div>
          <ol className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            <li>
              1. Tap the{" "}
              <span className="inline-flex items-center gap-0.5 font-semibold text-navy">
                <Share size={11} /> Share
              </span>{" "}
              icon in Safari.
            </li>
            <li>
              2. Choose <span className="font-semibold text-navy">Add to Home Screen</span>.
            </li>
            <li>
              3. Tap <span className="font-semibold text-navy">Add</span> — done!
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
