"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Link2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* Brand marks — lucide dropped brand icons, so these are inline paths. */
const BRAND_ICON: Record<string, React.ReactNode> = {
  whatsapp: (
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.16c-.25.69-1.45 1.32-2 1.36-.51.04-1.16.06-1.87-.12-.43-.11-.98-.29-1.69-.6-2.98-1.29-4.92-4.29-5.07-4.49-.15-.2-1.21-1.61-1.21-3.07 0-1.46.76-2.18 1.03-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .57.01.18.01.42-.07.66.5.25.6.84 2.06.91 2.21.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.36 1.45.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.39-.25.66-.15.27.1 1.71.81 2.01.96.3.15.5.22.57.35.07.12.07.72-.18 1.41Z" />
  ),
  facebook: (
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.19 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.75 8.44-4.92 8.44-9.94Z" />
  ),
  x: (
    <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.22-6.82-5.96 6.82H1.68l7.73-8.84L1.25 2.25h6.82l4.71 6.23 5.46-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.11l11.97 15.64Z" />
  ),
  linkedin: (
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
  ),
  telegram: (
    <path d="M11.94 2C6.46 2 2 6.46 2 11.94s4.46 9.94 9.94 9.94 9.94-4.46 9.94-9.94S17.42 2 11.94 2Zm4.61 6.79-1.54 7.27c-.12.52-.42.65-.85.4l-2.35-1.73-1.13 1.09c-.13.13-.24.24-.48.24l.17-2.42 4.4-3.98c.19-.17-.04-.26-.3-.09l-5.44 3.42-2.34-.73c-.51-.16-.52-.51.11-.75l9.14-3.53c.42-.16.79.1.65.75Z" />
  ),
};

type Target = { key: string; label: string; href: (url: string, text: string) => string; tone: string };

const TARGETS: Target[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    href: (u, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}`,
    tone: "text-[#25D366]",
  },
  {
    key: "facebook",
    label: "Facebook",
    href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
    tone: "text-[#1877F2]",
  },
  {
    key: "x",
    label: "X",
    href: (u, t) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
    tone: "text-navy",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`,
    tone: "text-[#0A66C2]",
  },
  {
    key: "telegram",
    label: "Telegram",
    href: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
    tone: "text-[#229ED9]",
  },
];

/**
 * Share control. On devices that support the Web Share API (mobile) the button
 * opens the OS share sheet so the user gets their real installed apps. Elsewhere
 * (desktop browsers, where the API is absent) it opens a menu of the usual share
 * targets plus copy-link.
 */
export function ShareMenu({ title, className }: { title: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const url = typeof window !== "undefined" ? window.location.href : "";

  const onClick = () => {
    // navigator.share must be called synchronously from the click to keep the
    // user-gesture; it is only present on mobile/secure contexts.
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title, url }).catch(() => {});
      return;
    }
    setOpen((o) => !o);
  };

  const copy = () => {
    void navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 1800);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={onClick}
        aria-label="Share this property"
        aria-expanded={open}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white/80 text-foreground backdrop-blur-sm transition hover:bg-secondary",
          className,
        )}
      >
        <Share2 size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-xl border border-border bg-white py-1.5 shadow-lg">
          <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Share property
          </p>
          {TARGETS.map((t) => (
            <a
              key={t.key}
              href={t.href(url, title)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" className={t.tone} aria-hidden>
                {BRAND_ICON[t.key]}
              </svg>
              {t.label}
            </a>
          ))}
          <button
            onClick={copy}
            className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Link2 size={16} className="text-muted-foreground" />}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
