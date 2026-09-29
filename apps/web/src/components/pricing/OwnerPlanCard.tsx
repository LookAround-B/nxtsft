"use client";
import { PlanPrice } from "./PlanPrice";

import { Check, Globe, ShieldCheck } from "lucide-react";

// Owner plans come from the DB (prisma.plan, type "owner-rent" | "owner-sell")
// and share the seeker plan row shape.
export type OwnerPlan = {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  /** Admin-set MRP (display-only strike-through); null = no discount shown. */
  mrp?: number | null;
  credits: number;
  validity: number; // days
  tagline: string;
  features: string[];
  popular: boolean;
};

export function OwnerPlanCard({ plan, onBuy }: { plan: OwnerPlan; onBuy: (p: OwnerPlan) => void }) {
  const isPopular = plan.popular;
  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border-2 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl
      ${isPopular ? "border-accent shadow-accent/10" : "border-border"}`}
    >
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="rounded-full bg-accent px-4 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow">
            Popular
          </span>
        </div>
      )}

      <div className="font-display text-lg font-black text-navy">{plan.name}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{plan.tagline}</div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <PlanPrice price={plan.price} priceLabel={plan.priceLabel} mrp={plan.mrp} />
        <span className="text-xs text-muted-foreground">/ {plan.validity} days</span>
      </div>
      <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">(inclusive GST*)</div>

      {/* Verified badge set — included on every paid plan of ₹999 or more (LA-343; boss 09-28) */}
      {plan.price >= 999 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
            <ShieldCheck size={12} strokeWidth={2.5} /> Verified Owner
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-1 text-[11px] font-bold text-white">
            <Globe size={12} strokeWidth={2.5} /> NRI Trusted
          </span>
          <span className="w-full text-[11px] text-muted-foreground">badges included on profile + listings</span>
        </div>
      )}

      <ul className="mt-5 flex-1 space-y-2.5">
        {plan.features.map((f: string) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/80">
            <Check size={14} className="mt-0.5 shrink-0 text-emerald-500" strokeWidth={2.5} />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onBuy(plan)}
        className={`mt-7 w-full rounded-xl py-2.5 font-display text-sm font-bold transition
          ${
            isPopular
              ? "bg-accent text-white shadow-lg shadow-accent/25 hover:opacity-90"
              : "bg-navy text-white hover:opacity-90"
          }`}
      >
        Get Activated Now
      </button>
    </div>
  );
}
