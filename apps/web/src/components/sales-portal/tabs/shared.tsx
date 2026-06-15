"use client";

// ─── PageHead ─────────────────────────────────────────────────────────────────
export function Head({ t, s }: { t: string; s?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl font-bold text-navy">{t}</h2>
      {s && <p className="mt-1 text-sm text-muted-foreground">{s}</p>}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
export function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className="mt-1 font-semibold text-navy">{v}</div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type OutcomeTone = "hot" | "warm" | "cold" | "new" | "success";

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
