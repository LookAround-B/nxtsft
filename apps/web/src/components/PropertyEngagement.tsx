"use client";
import { useEffect, useState } from "react";
import { Eye, Heart, Phone } from "lucide-react";
import { propertyActivity, type PropertyActivity, type ActivityAction } from "@/lib/propertyActivity";
import { cn } from "@/lib/utils";

const ACTION: Record<ActivityAction, { label: string; tone: string }> = {
  interested: { label: "showed interest", tone: "text-blue-600" },
  wishlisted: { label: "shortlisted", tone: "text-rose-500" },
  contact: { label: "requested contact", tone: "text-emerald-600" },
};

// Custom line-art bust avatars (per design reference): short hair + collar for
// male, long hair + V-neck for female. Inherit colour via currentColor.
function GenderAvatar({ gender }: { gender: "m" | "f" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {gender === "m" ? (
        <>
          <path d="M14 20 C13 12 18 7 24 7 C30 7 35 12 34 20 C32 16 30 15 27 15 C25 12 23 12 21 15 C18 15 16 16 14 20 Z" />
          <path d="M16 18 C16 24 18 31 24 31 C30 31 32 24 32 18" />
          <path d="M8 43 C8 36 14 33 24 33 C34 33 40 36 40 43" />
          <path d="M20 33 L24 38 L28 33" />
        </>
      ) : (
        <>
          <path d="M12 23 C12 12 17 6 24 6 C31 6 36 12 36 23 L36 36 C36 38 33 38 32 36 L31 22 C31 22 28 25 24 25 C20 25 17 22 17 22 L16 36 C15 38 12 38 12 36 Z" />
          <path d="M18 19 C18 25 20 31 24 31 C28 31 30 25 30 19" />
          <path d="M8 43 C8 36 14 33 24 33 C34 33 40 36 40 43" />
          <path d="M20 33 L24 39 L28 33" />
        </>
      )}
    </svg>
  );
}

function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Stat({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-secondary/40 py-3">
      <span className={cn("flex items-center gap-1.5 font-display text-xl font-black text-navy", tone)}>
        {icon}
        {value.toLocaleString("en-IN")}
      </span>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * "Activity On This Property" — fabricated social-proof activity (GOL-123).
 *
 * Numbers are deterministic per property + day (see lib/propertyActivity) and
 * are computed client-side after mount to avoid SSR/CSR hydration mismatch on
 * the date-dependent values. Only rendered for Active listings — non-active /
 * dummy listings show nothing.
 */
export function PropertyEngagement({
  propertyId,
  createdAt,
  status,
  state,
  city,
  className,
}: {
  propertyId: string;
  createdAt: string;
  status: string;
  state?: string | null;
  city?: string | null;
  className?: string;
}) {
  const [data, setData] = useState<PropertyActivity | null>(null);

  useEffect(() => {
    if (status !== "Active") return;
    // Returns null for the first 48h post-listing → the card renders nothing.
    setData(propertyActivity(propertyId, new Date(createdAt), { state, city }));
  }, [propertyId, createdAt, status, state, city]);

  if (status !== "Active" || !data) return null;
  const { counts, recent } = data;

  return (
    <div className={cn("rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6", className)}>
      <h3 className="mb-1 font-display text-base font-bold text-navy">Activity On This Property</h3>
      <div className="mb-4 h-px bg-border" />

      <div className="grid grid-cols-3 gap-2.5">
        <Stat icon={<Eye size={17} />} value={counts.views} label="Unique Views" tone="text-blue-600" />
        <Stat icon={<Heart size={17} />} value={counts.shortlists} label="Shortlists" tone="text-rose-500" />
        <Stat icon={<Phone size={17} />} value={counts.contacted} label="Requested" tone="text-emerald-600" />
      </div>

      <p className="mt-3 text-right text-xs text-muted-foreground">
        Powered By : <span className="font-semibold text-navy">NxtSft Insights</span>
      </p>

      {recent.length > 0 && (
        <ul className="mt-4 space-y-2.5 border-t border-border pt-4">
          {recent.map((e, i) => {
            const a = ACTION[e.action];
            return (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    e.gender === "m" ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-500",
                  )}
                >
                  <GenderAvatar gender={e.gender} />
                </span>
                <span className="min-w-0 flex-1 text-foreground/80">
                  <span className="font-semibold text-navy">{e.name}</span> <span className={a.tone}>{a.label}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{ago(e.at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
