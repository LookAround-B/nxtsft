"use client";

import { Check } from "lucide-react";
import type { ownerRentalPlans } from "@/data/static";

type OwnerPlan = (typeof ownerRentalPlans)[0];

export function OwnerPlanCard({ plan, onBuy }: { plan: OwnerPlan; onBuy: (p: OwnerPlan) => void }) {
  const isPopular = plan.badge === "Popular";
  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border-2 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl
      ${isPopular ? "border-accent shadow-accent/10" : "border-border"}`}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span
            className={`rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-widest shadow
            ${isPopular ? "bg-accent text-white" : "bg-navy text-white"}`}
          >
            {plan.badge}
          </span>
        </div>
      )}

      <div className="font-display text-lg font-black text-navy">{plan.name}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{plan.tagline}</div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-black text-navy">{plan.priceLabel}</span>
        <span className="text-xs text-muted-foreground">/ {plan.validity}</span>
      </div>

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
        Get {plan.name}
      </button>
    </div>
  );
}
