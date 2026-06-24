"use client";
import { useState, useMemo } from "react";
import {
  Wallet, TrendingUp, Target, CheckCircle2, Clock,
  Building2, Home, MapPin, Briefcase, Users, LayoutGrid, ChevronDown,
} from "lucide-react";
import { StatCard, Section } from "@/components/portal/PortalShell";
import { Head, Field } from "./shared";
import { trpc } from "@/lib/trpc";

/* ── Helpers ────────────────────────────────────────────────────── */
function fmt(rupees: number): string {
  if (rupees >= 10_00_000) return `₹${(rupees / 10_00_000).toFixed(2)} L`;
  if (rupees >= 1_000)     return `₹${(rupees / 1_000).toFixed(0)}K`;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

/* ── Month list (current + last 11) ─────────────────────────────── */
const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - i);
  return {
    key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    label: d.toLocaleString("en-IN", { month: "short", year: "2-digit" }),
  };
});

/* ── Property categories ─────────────────────────────────────────── */
type CategoryKey = "All" | "Apartment" | "Villa" | "Plot" | "Commercial" | "PG" | "Studio";

const CATEGORIES: { key: CategoryKey; label: string; Icon: React.ElementType }[] = [
  { key: "All",        label: "All",        Icon: LayoutGrid  },
  { key: "Apartment",  label: "Apartment",  Icon: Building2   },
  { key: "Villa",      label: "Villa",      Icon: Home        },
  { key: "Plot",       label: "Plot",       Icon: MapPin      },
  { key: "Commercial", label: "Commercial", Icon: Briefcase   },
  { key: "PG",         label: "PG / Co-living", Icon: Users   },
  { key: "Studio",     label: "Studio",     Icon: Building2   },
];

/* ── Per-category scale factors (demo multiplier) ────────────────── */
const CAT_FACTOR: Record<CategoryKey, number> = {
  All: 1, Apartment: 0.42, Villa: 0.22, Plot: 0.14,
  Commercial: 0.13, PG: 0.06, Studio: 0.03,
};

/* ── Subscription plan rows ─────────────────────────────────────── */
const BASE_PLANS = [
  { plan: "New Registrations",        type: "Leads",         target: 30, achieved: 22, rate:    200, rateLabel: "₹200 / reg"         },
  { plan: "Basic Subscription",       type: "Subscription",  target: 15, achieved: 11, rate:  2_000, rateLabel: "₹2,000 / plan"      },
  { plan: "Premium Subscription",     type: "Subscription",  target:  8, achieved:  5, rate:  5_000, rateLabel: "₹5,000 / plan"      },
  { plan: "Ultra Subscription",       type: "Subscription",  target:  4, achieved:  2, rate: 10_000, rateLabel: "₹10,000 / plan"     },
  { plan: "Site Visits Booked",       type: "Site Visits",   target: 20, achieved: 15, rate:    500, rateLabel: "₹500 / visit"       },
  { plan: "Deals Closed (Buy/Sell)",  type: "Deals",         target:  5, achieved:  3, rate: 20_000, rateLabel: "2% of deal value"   },
  { plan: "Rental Closures",          type: "Deals",         target:  8, achieved:  6, rate:  1_500, rateLabel: "₹1,500 / closure"   },
];

/* ── Month seed for demo variation ─────────────────────────────── */
function monthSeed(monthKey: string): number {
  const [, m] = monthKey.split("-").map(Number);
  return ((m ?? 1) % 5) / 5 + 0.75; // 0.75 – 1.55 variation
}

export function CommissionTab() {
  const [category, setCategory] = useState<CategoryKey>("All");
  const [month, setMonth]       = useState<string>(MONTHS[0]!.key);
  const [showMonthDrop, setShowMonthDrop] = useState(false);

  const { data, isLoading } = trpc.leads.myCommissions.useQuery();

  const ytdTarget = 20_00_000;
  const ytdEarned = data?.ytd ?? 0;
  const progressPct = Math.min(100, Math.round((ytdEarned / ytdTarget) * 100));

  /* Scale plan rows by selected category + month */
  const plans = useMemo(() => {
    const cf = CAT_FACTOR[category];
    const mf = monthSeed(month);
    return BASE_PLANS.map((p) => {
      const scaledTarget   = Math.round(p.target   * cf * mf);
      const scaledAchieved = Math.min(scaledTarget, Math.round(p.achieved * cf * mf));
      const earned         = scaledAchieved * p.rate;
      const pct            = scaledTarget === 0 ? 0 : Math.round((scaledAchieved / scaledTarget) * 100);
      return { ...p, target: scaledTarget, achieved: scaledAchieved, earned, pct };
    });
  }, [category, month]);

  const totalTarget   = plans.reduce((s, p) => s + p.target * p.rate, 0);
  const totalAchieved = plans.reduce((s, p) => s + p.earned, 0);
  const totalPct      = totalTarget === 0 ? 0 : Math.round((totalAchieved / totalTarget) * 100);

  const selectedMonthLabel = MONTHS.find((m) => m.key === month)?.label ?? month;

  return (
    <>
      <Head t="My Earnings" s="Payouts & history." />

      {/* ── Category filter ───────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
              category === cat.key
                ? "bg-accent text-white border-accent shadow-sm"
                : "border-border text-foreground/70 bg-white hover:bg-secondary"
            }`}
          >
            <cat.Icon size={12} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Month selector ────────────────────────────────────── */}
      <div className="relative mb-5 inline-block">
        <button
          onClick={() => setShowMonthDrop((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm transition hover:bg-secondary"
        >
          <Clock size={14} className="text-accent" />
          {selectedMonthLabel}
          <ChevronDown size={13} className={`text-muted-foreground transition-transform ${showMonthDrop ? "rotate-180" : ""}`} />
        </button>
        {showMonthDrop && (
          <div className="absolute left-0 top-full z-20 mt-1 w-36 rounded-xl border border-border bg-white shadow-lg">
            {MONTHS.map((m) => (
              <button
                key={m.key}
                onClick={() => { setMonth(m.key); setShowMonthDrop(false); }}
                className={`block w-full px-4 py-2.5 text-left text-xs font-semibold transition hover:bg-secondary ${
                  month === m.key ? "bg-accent/8 text-accent" : "text-navy"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── KYC warning ───────────────────────────────────────── */}
      {data?.kycPending && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <span>⚠️</span>
          <span>Pending KYC — complete your KYC to receive payouts without delay.</span>
        </div>
      )}

      {/* ── KPI cards ─────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Pending Payout"
          value={isLoading ? "…" : fmt(data?.pending ?? 0)}
          sub="awaiting clearance"
          accent="text-accent"
        />
        <StatCard
          label="Earned MTD"
          value={isLoading ? "…" : fmt(data?.mtd ?? 0)}
          sub="this month"
        />
        <StatCard
          label="YTD Total"
          value={isLoading ? "…" : fmt(data?.ytd ?? 0)}
          sub="year to date"
        />
      </div>

      {/* ── Target vs Achievement vs Earned Payouts ─────────────── */}
      <Section title={`Target vs Achievement — ${selectedMonthLabel} · ${category}`}>
        {/* Summary row */}
        <div className="mb-4 flex flex-wrap gap-4 rounded-xl border border-border bg-secondary/30 p-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Target Value</div>
            <div className="mt-0.5 font-display text-xl font-black text-navy">{fmt(totalTarget)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Earned Payout</div>
            <div className="mt-0.5 font-display text-xl font-black text-emerald-600">{fmt(totalAchieved)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Achievement</div>
            <div className="mt-0.5 font-display text-xl font-black text-accent">{totalPct}%</div>
          </div>
        </div>

        {/* Plan breakdown table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-3 text-left">Plan / Activity</th>
                <th className="px-3 py-3 text-left">Type</th>
                <th className="px-3 py-3 text-center">Target</th>
                <th className="px-3 py-3 text-center">Achieved</th>
                <th className="px-3 py-3 text-right">Earned</th>
                <th className="px-3 py-3 text-right">Achievement</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.plan} className="border-b border-border transition hover:bg-secondary/15">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-navy">{p.plan}</div>
                    <div className="text-[10px] text-muted-foreground">{p.rateLabel}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      p.type === "Deals"        ? "bg-accent/10 text-accent" :
                      p.type === "Subscription" ? "bg-blue-100 text-blue-700" :
                      p.type === "Site Visits"  ? "bg-emerald-100 text-emerald-700" :
                      "bg-secondary text-foreground/60"
                    }`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-navy">{p.target}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-bold ${p.achieved >= p.target ? "text-emerald-600" : "text-amber-600"}`}>
                      {p.achieved}
                    </span>
                    {p.achieved < p.target && (
                      <span className="ml-1 text-[10px] text-muted-foreground">/ {p.target}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-display font-bold text-emerald-600">
                    {fmt(p.earned)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 overflow-hidden rounded-full bg-secondary h-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            p.pct >= 100 ? "bg-emerald-500" :
                            p.pct >= 70  ? "bg-amber-400" : "bg-accent"
                          }`}
                          style={{ width: `${p.pct}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-8 text-right ${
                        p.pct >= 100 ? "text-emerald-600" :
                        p.pct >= 70  ? "text-amber-600" : "text-accent"
                      }`}>
                        {p.pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── YTD progress ──────────────────────────────────────── */}
      <Section title="Annual Target Achievement">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{fmt(ytdEarned)} earned</span>
            <span>{progressPct}% of {fmt(ytdTarget)} annual target</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                progressPct >= 80 ? "bg-emerald-500" :
                progressPct >= 50 ? "bg-amber-400" : "bg-accent"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{fmt(ytdTarget - ytdEarned)} remaining to hit annual target</span>
            <span className="flex items-center gap-1">
              <TrendingUp size={11} />
              {progressPct >= 80 ? "On track 🎯" : progressPct >= 50 ? "Needs push" : "Behind target"}
            </span>
          </div>
        </div>
      </Section>

      {/* ── Recent payouts ────────────────────────────────────── */}
      <Section title="Recent Payouts">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : !data?.items.length ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center">
            <Wallet size={28} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-navy">No payouts yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Close a lead or convert a subscription to earn your first payout.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.items.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-semibold text-navy">
                    {c.leadId ? `Lead …${c.leadId.slice(-6).toUpperCase()} Closed` : "Manual Entry"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmt(c.dealValue)} deal · {c.periodMonth ?? "—"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-sm font-bold text-accent">{fmt(c.amount)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    c.status === "paid"    ? "bg-emerald-100 text-emerald-700" :
                    c.status === "pending" ? "bg-amber-100 text-amber-700" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Payment details ───────────────────────────────────── */}
      <Section title="Payment Details">
        <div className="grid gap-4 md:grid-cols-2">
          <Field k="Commission Rate"   v="2% of closed deal value"                                              />
          <Field k="Payout Schedule"   v="5th of following month"                                               />
          <Field k="KYC Status"        v={data?.kycPending ? "Pending — complete to receive payouts" : "Verified"} />
          <Field k="Payment Method"    v="UPI / Bank Transfer (NEFT)"                                           />
        </div>
      </Section>
    </>
  );
}
