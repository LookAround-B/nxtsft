"use client";
import { Eye, Heart, Phone, Flame } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const ACTION = {
  interested: { label: "showed interest", Icon: Eye, tone: "text-blue-600" },
  wishlisted: { label: "wishlisted", Icon: Heart, tone: "text-rose-500" },
  contact: { label: "requested contact", Icon: Phone, tone: "text-emerald-600" },
} as const;

function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function Stat({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-secondary/40 py-3">
      <span className={cn("flex items-center gap-1 font-display text-lg font-black text-navy", tone)}>
        {icon}
        {value}
      </span>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * Per-property engagement: interest, wishlists, contact requests.
 * `full` → counts + trending + recent activity feed (public/detail).
 * `compact` → just the counts row (owner/CRM summaries).
 * Names are anonymized server-side ("Rohan M.").
 */
export function PropertyEngagement({
  propertyId,
  variant = "full",
  className,
}: {
  propertyId: string;
  variant?: "full" | "compact";
  className?: string;
}) {
  const { data, isLoading } = trpc.properties.engagement.useQuery({ id: propertyId });

  if (isLoading || !data) return null;
  const { counts, recent, trending } = data;
  if (counts.total === 0) return null;

  return (
    <div className={cn("rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-navy">Buyer activity</h3>
        {trending && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
            <Flame size={11} /> Trending
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat icon={<Eye size={15} />} value={counts.interested} label="Interested" tone="text-blue-600" />
        <Stat icon={<Heart size={15} />} value={counts.wishlisted} label="Wishlisted" tone="text-rose-500" />
        <Stat icon={<Phone size={15} />} value={counts.contactRequested} label="Contacted" tone="text-emerald-600" />
      </div>

      {variant === "full" && recent.length > 0 && (
        <ul className="mt-4 space-y-2.5 border-t border-border pt-4">
          {recent.map((e, i) => {
            const a = ACTION[e.action];
            return (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary", a.tone)}>
                  <a.Icon size={13} />
                </span>
                <span className="min-w-0 flex-1 text-foreground/80">
                  <span className="font-semibold text-navy">{e.name}</span> {a.label}
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
