"use client";
import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

// Chrome/Android fires `beforeinstallprompt` before showing its own install UI.
// We capture it and drive the native install dialog from our own button. iOS
// Safari doesn't support it, so we show Add-to-Home-Screen instructions instead.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" &&
      (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints !== undefined &&
      (navigator as unknown as { maxTouchPoints: number }).maxTouchPoints > 1);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua); // Chrome/FF/Edge/Opera on iOS can't A2HS
  return iOS && !otherBrowser;
}

/**
 * "Get App" — installs the PWA. Renders nothing when the app is already
 * installed or when the browser can't install it, so it never shows a dead CTA.
 */
export function InstallAppButton({
  className,
  compact = true,
}: {
  className?: string;
  /** Header: hide the "Get App" label on small screens. Menu: always show it. */
  compact?: boolean;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setIos(isIosSafari());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Nothing to install (already a standalone app, or a browser that can't).
  if (installed || (!deferred && !ios)) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") setInstalled(true);
      setDeferred(null);
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
