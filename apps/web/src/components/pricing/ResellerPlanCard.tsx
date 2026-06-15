"use client";

import { Check } from "lucide-react";
import { BadgeCheck } from "lucide-react";
import type { ResellerPlan } from "@/components/pricing/pricingData";

export function ResellerPlanCard({
  plan,
  onBuy,
}: {
  plan: ResellerPlan;
  onBuy: (p: ResellerPlan) => void;
}) {
  const isBest = plan.badge === "Best Value";
  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border-2 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl
      ${isBest ? "border-accent shadow-accent/10" : "border-border"}`}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="rounded-full bg-accent px-4 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow">
            {plan.badge}
          </span>
        </div>
      )}

      {/* Lead count */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl font-display font-black leading-none
          ${isBest ? "bg-accent text-white" : "bg-navy/8 text-navy"}`}
        >
          <span className="text-2xl">{plan.leads}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Leads</span>
        </div>
        <div>
          <div className="font-display text-lg font-black text-navy">{plan.name}</div>
          <div className="flex items-center gap-1 text-xs text-emerald-600">
            <BadgeCheck size={12} />
            Verified Buyer Leads
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-1.5">
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
            isBest
              ? "bg-accent text-white shadow-lg shadow-accent/25 hover:opacity-90"
              : "bg-navy text-white hover:opacity-90"
          }`}
      >
        Get Plan — {plan.priceLabel}
      </button>
    </div>
  );
}
