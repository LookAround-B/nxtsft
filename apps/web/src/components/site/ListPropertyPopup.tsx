"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

const STORAGE_KEY = "nxtsft_list_popup_dismissed";
const DISMISS_MS = 24 * 60 * 60 * 1000;

export function ListPropertyPopup() {
  const pathname = usePathname();
  const { session } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const ts = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
      if (ts && Date.now() - ts < DISMISS_MS) return;
    } catch {
      /* localStorage unavailable */
    }
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // Only show to unauthenticated visitors or home-sellers
  if (session && session.role !== "home-seller") return null;
  if (pathname === "/boneyard" || !show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="animate-fade-up fixed bottom-24 right-4 z-[60] max-w-[300px] sm:bottom-8 sm:right-6">
      <div
        className="relative overflow-hidden rounded-[24px] shadow-2xl"
        style={{ background: "linear-gradient(145deg, #0f172a 0%, #1e3a8a 60%, #2563EB 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />

        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3.5 top-3.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/35"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="relative z-10 px-6 pb-6 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h3 className="mb-2 font-display text-2xl font-black leading-tight text-white">
            Ready to List?
          </h3>
          <p className="mb-6 text-sm leading-relaxed text-white/70">
            List your property for free and reach verified buyers on NxtSft.com.
          </p>
          <Link
            href="/list"
            onClick={dismiss}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-white py-3.5 text-sm font-semibold text-navy transition hover:shadow-lg"
          >
            <Building2 className="h-4 w-4 text-accent" />
            List Property for Free
          </Link>
          <p className="mt-3 text-[10px] text-white/35">
            Zero commission until your first verified lead.
          </p>
        </div>
      </div>
    </div>
  );
}
