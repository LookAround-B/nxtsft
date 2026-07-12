"use client";
import { Users, Heart, Phone } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const ACTION = {
  interested: { label: "showed interest", tone: "text-blue-600", bg: "bg-blue-50 text-blue-600" },
  wishlisted: { label: "shortlisted", tone: "text-rose-500", bg: "bg-rose-50 text-rose-500" },
  contact: { label: "requested contact", tone: "text-emerald-600", bg: "bg-emerald-50 text-emerald-600" },
} as const;

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
      <span className="mt-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * "Activity On This Property" — real engagement, sourced from
 * properties.engagement (leads = interested, favorites = shortlisted,
 * contact-unlock credit debits = contact requests). The recent feed uses
 * anonymized names ("Rohan M."). Rendered only for Active listings.
 */
export function PropertyEngagement({
  propertyId,
  status,
  className,
}: {
  propertyId: string;
  status: string;
  className?: string;
}) {
  const { data } = trpc.properties.engagement.useQuery(
    { id: propertyId },
    { enabled: status === "Active" },
  );

  if (status !== "Active" || !data) return null;
  const { counts, recent } = data;

  return (
    <div className={cn("rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6", className)}>
      <h3 className="mb-1 font-display text-base font-bold text-navy">Activity On This Property</h3>
      <div className="mb-4 h-px bg-border" />

      <div className="grid grid-cols-3 gap-2.5">
        <Stat icon={<Users size={17} />} value={counts.interested} label="Interested" tone="text-blue-600" />
        <Stat icon={<Heart size={17} />} value={counts.wishlisted} label="Shortlists" tone="text-rose-500" />
        <Stat icon={<Phone size={17} />} value={counts.contactRequested} label="Contact Requests" tone="text-emerald-600" />
      </div>

      {recent.length > 0 && (
        <ul className="mt-4 space-y-2.5 border-t border-border pt-4">
          {recent.map((e, i) => {
            const a = ACTION[e.action];
            return (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", a.bg)}>
                  {(e.name.trim()[0] ?? "?").toUpperCase()}
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
