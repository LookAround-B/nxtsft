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
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  propertyId: string | null;
  property: {
    id: string;
    title: string;
    slug: string;
    status: string;
    freeListing: boolean;
    boostExpiry: string | null;
    tags: string[];
  } | null;
  // LA-342 payment-link pipeline fields
  plan?: string | null;
  amount?: number | null;
  paymentStatus?: string;
  paymentLink?: string | null;
  lastCallAt?: string | null;
  lastCallRemark?: string | null;
  /** Listing validity end, stamped when the payment webhook lands. */
  expiryDate?: string | null;
};

/** Extract the most recent note line from the appended notes string. */
export function latestNote(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  const lines = notes.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.at(-1) ?? null;
}

// ─── Contact helpers ──────────────────────────────────────────────────────────
// Indian numbers are stored as 10 digits; wa.me needs the country code and no
// punctuation. tel: is happy with the raw value.
export function waHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const withCc = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCc}`;
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** Telecalling contact statuses, in pipeline order. NI = not interested. */
export const CONTACT_STATUSES = ["New", "Hot", "Warm", "Cold", "NI", "Converted"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CONTACT_STATUS_STYLE: Record<string, string> = {
  New: "bg-slate-100 text-slate-700 border-slate-200",
  Hot: "bg-rose-50 text-rose-700 border-rose-200",
  Warm: "bg-amber-50 text-amber-700 border-amber-200",
  Cold: "bg-blue-50 text-blue-700 border-blue-200",
  NI: "bg-zinc-100 text-zinc-500 border-zinc-200",
  Converted: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export const CALL_OUTCOMES = [
  { value: "connected", label: "Connected" },
  { value: "no_answer", label: "No answer" },
  { value: "busy", label: "Busy" },
  { value: "wrong_number", label: "Wrong number" },
  { value: "callback", label: "Callback" },
] as const;

export type CallOutcome = (typeof CALL_OUTCOMES)[number]["value"];

export const OUTCOME_LABEL: Record<string, string> =
  Object.fromEntries(CALL_OUTCOMES.map((o) => [o.value, o.label]));

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
