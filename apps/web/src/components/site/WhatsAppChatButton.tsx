"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Headset, TrendingUp, X } from "lucide-react";

// Placeholder numbers until real Sales/Support WhatsApp lines are provided —
// set NEXT_PUBLIC_WHATSAPP_{SALES,SUPPORT}_NUMBER to override. 10 digits, no
// country code (prefixed with 91 below), no spaces.
const SALES_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_SALES_NUMBER || "9100000000";
const SUPPORT_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER || "9100000001";

function waLink(number: string, message: string): string {
  return `https://wa.me/91${number}?text=${encodeURIComponent(message)}`;
}

export function WhatsAppChatButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Keep off the boneyard/admin-style internal pages, same convention as ListPropertyPopup.
  if (pathname === "/boneyard") return null;

  return (
    <div ref={ref} className="fixed bottom-24 left-4 z-[60] sm:bottom-8 sm:left-6">
      {open && (
        <div className="mb-3 w-56 overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
          <div className="border-b border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Chat with us
          </div>
          <a
            href={waLink(SALES_NUMBER, "Hello! Can I get more info on Sales?")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-navy transition hover:bg-secondary"
          >
            <TrendingUp size={16} className="text-emerald-600" />
            Sales
          </a>
          <a
            href={waLink(SUPPORT_NUMBER, "Hello! Can I get more info on Support?")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 border-t border-border px-4 py-3 text-sm font-semibold text-navy transition hover:bg-secondary"
          >
            <Headset size={16} className="text-mid-blue" />
            Support
          </a>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Chat on WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl transition hover:bg-emerald-600"
      >
        {open ? <X size={22} /> : <MessageCircle size={24} fill="currentColor" className="text-white" />}
      </button>
    </div>
  );
}
