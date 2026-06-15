"use client";

// ─── PageHead ─────────────────────────────────────────────────────────────────
export function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl font-bold text-navy">{title}</h2>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function fmtRelative(iso: string) {
  const d = daysSince(iso);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

export function parseDuration(s: string): number {
  // e.g. "2h ago" -> 2*60, "30m ago" -> 30, "1d ago" -> 1440, "5h ago" -> 300
  if (s.includes("d")) return parseInt(s) * 1440;
  if (s.includes("h")) return parseInt(s) * 60;
  if (s.includes("m")) return parseInt(s);
  return 0;
}

export function daysSinceLabel(lastActivity: string): string {
  const mins = parseDuration(lastActivity);
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type DbLead = {
  id: string;
  name: string;
  phone: string;
  city: string | null;
  interest: string | null;
  status: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  property: { id: string; title: string; slug: string } | null;
};
