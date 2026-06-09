"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Zap,
  Shield,
  Building2,
  Users,
  Key,
  UserCheck,
  PhoneCall,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ownerRentalPlans, ownerSellPlans, seekerPlans } from "@/data/static";
import { useAuth } from "@/lib/auth";

type OwnerPlan = (typeof ownerRentalPlans)[0];
type SeekerPlan = (typeof seekerPlans)[0];

/* ── Plan card — owner ──────────────────────────────────────────── */
function OwnerPlanCard({ plan, onBuy }: { plan: OwnerPlan; onBuy: (p: OwnerPlan) => void }) {
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

/* ── Plan card — seeker ─────────────────────────────────────────── */
function SeekerPlanCard({ plan, onBuy }: { plan: SeekerPlan; onBuy: (p: SeekerPlan) => void }) {
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

      {plan.rm && (
        <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
          <UserCheck size={11} />
          Dedicated RM Included
        </div>
      )}

      <div className="font-display text-lg font-black text-navy">{plan.name}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{plan.tagline}</div>

      <div className="mt-5 flex flex-wrap items-baseline gap-2">
        <span className="font-display text-3xl font-black text-navy">{plan.priceLabel}</span>
        <span className="rounded-full bg-navy/8 px-2.5 py-0.5 text-[11px] font-bold text-navy">
          {plan.credits} {plan.credits === 1 ? "credit" : "credits"}
        </span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">Valid for {plan.validity}</div>

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
        Get Plan — {plan.priceLabel}
      </button>
    </div>
  );
}

/* ── Reseller plans ─────────────────────────────────────────────── */
type ResellerPlan = {
  id: string;
  name: string;
  priceLabel: string;
  leads: number;
  validity: string;
  badge: string | null;
  features: string[];
};

const RESELLER_PLANS: ResellerPlan[] = [
  {
    id: "resell-standard",
    name: "Standard Pack",
    priceLabel: "₹2,999",
    leads: 10,
    validity: "30 days",
    badge: null,
    features: [
      "10 Verified Buyer Leads",
      "1 Property Listing",
      "Dedicated RM Assigned",
      "Up to 5 Physical Walkthroughs",
      "Legal / Paperwork Help",
    ],
  },
  {
    id: "resell-pro",
    name: "Pro Assisted",
    priceLabel: "₹4,999",
    leads: 30,
    validity: "45 days",
    badge: null,
    features: [
      "30 Verified Buyer Leads",
      "Dedicated RM + Premium Search",
      "Up to 5 Site Visits Managed",
      "End-to-End Lease / Sale Closing",
    ],
  },
  {
    id: "resell-executive",
    name: "Executive Premium",
    priceLabel: "₹9,999",
    leads: 50,
    validity: "60 days",
    badge: "Best Value",
    features: [
      "50 Verified Buyer Leads",
      "Dedicated RM + Premium Search",
      "Up to 15 Site Visits Managed",
      "End-to-End Lease / Sale Closing",
    ],
  },
];

function ResellerPlanCard({
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

/* ── Wallet trust row ───────────────────────────────────────────── */
function WalletTrustRow() {
  const items = [
    {
      icon: <Zap size={20} className="text-gold" />,
      title: "Token Wallet System",
      desc: "Credits are stored in your wallet. Use them any time within validity — no lock-in per property.",
    },
    {
      icon: <Shield size={20} className="text-accent" />,
      title: "One-click Dispute Refund",
      desc: "If a contact is unreachable or incorrect, raise a dispute in one tap and get your credit back within 24 hrs.",
    },
    {
      icon: <PhoneCall size={20} className="text-emerald-500" />,
      title: "WhatsApp Alerts",
      desc: "Get instant WhatsApp notifications when owners respond or new matching listings go live.",
    },
  ];
  return (
    <div className="mx-auto mt-8 max-w-6xl px-5 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map(({ icon, title, desc }) => (
          <div
            key={title}
            className="flex gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div>
              <div className="font-display text-sm font-bold text-navy">{title}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Reseller trust row ─────────────────────────────────────────── */
function ResellerTrustRow() {
  const items = [
    {
      icon: <BadgeCheck size={20} className="text-emerald-500" />,
      title: "Intent-Verified Leads",
      desc: "Every buyer lead has a verified identity and active property search — no cold contacts, no time wasters.",
    },
    {
      icon: <UserCheck size={20} className="text-accent" />,
      title: "Dedicated RM from Day 1",
      desc: "Your Relationship Manager is assigned within 2 hours of purchase and stays with you until closing.",
    },
    {
      icon: <Shield size={20} className="text-gold" />,
      title: "Zero Commission",
      desc: "Flat-fee plans only. We charge nothing on your sale proceeds — every rupee from the deal is yours.",
    },
  ];
  return (
    <div className="mx-auto mt-8 max-w-6xl px-5 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map(({ icon, title, desc }) => (
          <div
            key={title}
            className="flex gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div>
              <div className="font-display text-sm font-bold text-navy">{title}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── How it works ───────────────────────────────────────────────── */
function HowItWorks({ forSeeker, forReseller }: { forSeeker: boolean; forReseller?: boolean }) {
  const steps = forReseller
    ? [
        {
          step: "01",
          title: "Choose your lead pack",
          body: "Pick a plan based on how many verified buyer leads you need. Your dedicated Relationship Manager is assigned within 2 hours of purchase.",
        },
        {
          step: "02",
          title: "Receive curated leads",
          body: "Your RM matches your property to intent-verified buyers on NxtSft.com and delivers their details — name, number, budget, requirements — directly to your WhatsApp.",
        },
        {
          step: "03",
          title: "Close with full support",
          body: "Your RM coordinates site visits, handles price negotiations, and assists with documentation so you close every deal stress-free.",
        },
      ]
    : forSeeker
      ? [
          {
            step: "01",
            title: "Choose a plan",
            body: "Pick a plan based on how many properties you want to enquire about. Credits are stored in your wallet.",
          },
          {
            step: "02",
            title: "Unlock a contact",
            body: 'On any property page, tap "Unlock Contact". One credit is deducted and the owner\'s phone and address are revealed instantly.',
          },
          {
            step: "03",
            title: "Call directly",
            body: "Call or WhatsApp the owner directly — zero brokerage, no middlemen. Mark the deal as closed in your dashboard when done.",
          },
        ]
      : [
          {
            step: "01",
            title: "List your property",
            body: "Create a detailed listing with photos, amenities and pricing. Our team verifies and publishes within 24 hours.",
          },
          {
            step: "02",
            title: "Receive verified leads",
            body: "Tenants or buyers unlock your contact using their credits. You receive their verified details instantly via WhatsApp.",
          },
          {
            step: "03",
            title: "Close the deal",
            body: "Talk directly to qualified, verified parties. No brokerage, no commissions — just a one-time listing fee.",
          },
        ];

  return (
    <section className="bg-secondary/50 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center font-display text-2xl font-black text-navy sm:text-3xl">
          How it works
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map(({ step, title, body }) => (
            <div key={step} className="rounded-2xl border border-border bg-white p-6">
              <div className="font-mono text-xs font-bold text-accent">{step}</div>
              <h3 className="mt-2 font-display text-base font-bold text-navy">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────────────────── */
function FAQ({ faqs, title }: { faqs: string[][]; title?: string }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-4xl px-6 py-14">
      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent text-center">
        Common questions
      </div>
      <h2 className="text-center font-display text-2xl font-black text-navy sm:text-3xl">
        {title ?? "Frequently asked questions"}
      </h2>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Everything you need to know before you buy.
      </p>
      <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
        {faqs.map(([q, a], i) => (
          <div key={q}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left transition hover:bg-secondary/30"
            >
              <span className="font-display text-sm font-bold text-navy pr-2 leading-snug">
                {q}
              </span>
              <span className="mt-0.5 shrink-0 text-accent">
                {open === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>
            {open === i && (
              <div className="border-t border-border bg-secondary/20 px-6 pb-5 pt-4">
                <p className="text-sm leading-relaxed text-foreground/70">{a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Plan Chooser ────────────────────────────────────────────────── */
type ChooserVariant = "owner-rent" | "owner-sell" | "seeker" | "reseller";

const CHOOSER_FLOWS: Record<
  ChooserVariant,
  {
    steps: { q: string; options: { label: string; sub?: string; value: string }[] }[];
    recommend: (answers: string[]) => { planId: string; name: string; why: string };
  }
> = {
  "owner-rent": {
    steps: [
      {
        q: "How many rental properties do you want to list?",
        options: [
          { label: "Just 1", sub: "Single landlord", value: "1" },
          { label: "2 – 3", sub: "Small portfolio", value: "2-3" },
          { label: "4 or more", sub: "Agent / large owner", value: "4+" },
        ],
      },
      {
        q: "How quickly do you need a tenant?",
        options: [
          { label: "Within a week", sub: "Urgent", value: "urgent" },
          { label: "Within a month", sub: "Normal pace", value: "normal" },
          { label: "No rush", sub: "Flexible", value: "flexible" },
        ],
      },
      {
        q: "How much help do you want from NxtSft.com?",
        options: [
          { label: "Just give me leads", sub: "I'll handle everything", value: "self" },
          { label: "Help with lead routing", sub: "Auto-alerts and filtering", value: "assisted" },
          { label: "Fully managed", sub: "Social ads + support + routing", value: "full" },
        ],
      },
    ],
    recommend: ([props, speed, help]) => {
      if (props === "4+" || help === "full")
        return {
          planId: "rent-platinum",
          name: "Rent Monthly Platinum",
          why: "Covers 15 listings with social ad engine and automated lead routing — ideal for agents managing multiple properties.",
        };
      if (props === "2-3")
        return {
          planId: "rent-gold",
          name: "Rent Monthly Gold",
          why: "Lists up to 3 properties with homepage rotation and 75 verified leads — perfect for small portfolios.",
        };
      if (speed === "urgent")
        return {
          planId: "rent-weekly",
          name: "Rent Weekly Booster",
          why: "Get maximum visibility for 7 days with top placement — best when you need a tenant fast.",
        };
      return {
        planId: "rent-silver",
        name: "Rent Monthly Silver",
        why: "Single listing, 30 days, 30 verified leads with WhatsApp alerts — the right fit for most individual landlords.",
      };
    },
  },
  "owner-sell": {
    steps: [
      {
        q: "How many properties are you listing for sale?",
        options: [
          { label: "1 property", sub: "Homeowner", value: "1" },
          { label: "2 – 3", sub: "Small broker / agent", value: "2-3" },
          { label: "7 or more", sub: "Builder / developer", value: "7+" },
        ],
      },
      {
        q: "What kind of marketing support do you need?",
        options: [
          { label: "Basic listing", sub: "Just be listed", value: "basic" },
          { label: "Facebook Ads + Top Placement", sub: "More visibility", value: "boosted" },
          { label: "Google + Meta campaigns", sub: "Full digital marketing", value: "full" },
        ],
      },
      {
        q: "Do you need a CRM or lead routing system?",
        options: [
          { label: "No, I manage manually", value: "no" },
          { label: "Yes, integrated CRM", value: "yes" },
        ],
      },
    ],
    recommend: ([props, mkt, crm]) => {
      if (crm === "yes" || props === "7+")
        return {
          planId: "sell-builder",
          name: "Sell Monthly Builder Pro",
          why: "CRM integration, Google + Meta campaigns, 15 listings and 400 leads — built for serious developers.",
        };
      if (mkt === "full")
        return {
          planId: "sell-platinum",
          name: "Sell Monthly Platinum",
          why: "Homepage rotation, 7 listings, 200 leads, and dedicated lead filters — for premium agencies.",
        };
      if (props === "2-3" || mkt === "boosted")
        return {
          planId: "sell-gold",
          name: "Sell Monthly Gold",
          why: "3 listings, Facebook Ad Boost, top placement and 120 verified buyer leads — the sweet spot for brokers.",
        };
      return {
        planId: "sell-silver",
        name: "Sell Monthly Silver",
        why: "Single property, 50 verified buyer leads and featured tag — the right start for a direct homeowner.",
      };
    },
  },
  seeker: {
    steps: [
      {
        q: "How many properties do you want to enquire about?",
        options: [
          { label: "1 – 2", sub: "Very targeted", value: "1-2" },
          { label: "3 – 6", sub: "Short search", value: "3-6" },
          { label: "7 – 12", sub: "Active search", value: "7-12" },
          { label: "12+", sub: "Extensive search", value: "12+" },
        ],
      },
      {
        q: "Would you like a Relationship Manager to assist you?",
        options: [
          { label: "Yes please", sub: "Handle visits, paperwork, negotiation", value: "yes" },
          { label: "No, I'll self-serve", sub: "I just need contacts", value: "no" },
        ],
      },
      {
        q: "When do you need to move in?",
        options: [
          { label: "ASAP", sub: "Within 2 weeks", value: "asap" },
          { label: "Within a month", sub: "Normal timeline", value: "month" },
          { label: "Just exploring", sub: "No rush", value: "explore" },
        ],
      },
    ],
    recommend: ([count, rm, when]) => {
      if (rm === "yes" && count === "12+")
        return {
          planId: "executive",
          name: "Executive Premium",
          why: "50 unlocks, a dedicated RM, 10 managed site visits, and end-to-end closing support — best for buyers seeking a complete service.",
        };
      if (rm === "yes")
        return {
          planId: "pro",
          name: "Pro Assisted",
          why: "24 unlocks with a dedicated Relationship Manager and up to 5 walkthroughs — great if you want guided support during your search.",
        };
      if (count === "12+")
        return {
          planId: "hunter",
          name: "Active Hunter",
          why: "12 contact unlocks for 30 days — ideal for an aggressive multi-property search without needing a RM.",
        };
      if (count === "7-12")
        return {
          planId: "standard",
          name: "Standard Pack",
          why: "6 unlocks over 30 days — the best value option for a focused search across a few neighbourhoods.",
        };
      if (count === "1-2" && when === "explore")
        return {
          planId: "micro",
          name: "Micro Match",
          why: "1 unlock at ₹99 — perfect for testing one lead with zero commitment.",
        };
      return {
        planId: "trial",
        name: "Trial Pack",
        why: "3 unlocks over 15 days — enough to test a couple of options before committing to a bigger plan.",
      };
    },
  },
  reseller: {
    steps: [
      {
        q: "How many properties do you want to sell or lease?",
        options: [
          { label: "1 property", sub: "Single owner", value: "1" },
          { label: "2 – 3", sub: "Small portfolio", value: "2-3" },
          { label: "4 or more", sub: "Active reseller", value: "4+" },
        ],
      },
      {
        q: "How much closing support do you need?",
        options: [
          { label: "Full end-to-end", sub: "RM + site visits + closing", value: "full" },
          { label: "Partial support", sub: "RM + walkthrough help", value: "partial" },
          { label: "Just the leads", sub: "I'll handle closings myself", value: "self" },
        ],
      },
      {
        q: "What is your target timeline to close?",
        options: [
          { label: "Within 30 days", sub: "Urgent", value: "30" },
          { label: "30 – 45 days", sub: "Normal pace", value: "45" },
          { label: "45 – 60 days", sub: "Relaxed", value: "60" },
        ],
      },
    ],
    recommend: ([props, support]) => {
      if (props === "4+" || support === "full")
        return {
          planId: "resell-executive",
          name: "Executive Premium",
          why: "50 verified buyer leads, dedicated RM + premium search, and up to 15 managed site visits with end-to-end closing — the complete package for serious resellers.",
        };
      if (props === "2-3" || support === "partial")
        return {
          planId: "resell-pro",
          name: "Pro Assisted",
          why: "30 verified buyer leads with a dedicated RM, premium buyer search, and up to 5 managed site visits — the sweet spot for active resellers.",
        };
      return {
        planId: "resell-standard",
        name: "Standard Pack",
        why: "10 verified buyer leads, 1 property listing, a dedicated RM and legal/paperwork support — the ideal start for a single property sale or lease.",
      };
    },
  },
};

function PlanChooser({
  variant,
  onScrollToPlans,
}: {
  variant: ChooserVariant;
  onScrollToPlans: (id: string) => void;
}) {
  const flow = CHOOSER_FLOWS[variant];
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<{ planId: string; name: string; why: string } | null>(null);

  const pick = (val: string) => {
    const next = [...answers, val];
    if (step < flow.steps.length - 1) {
      setAnswers(next);
      setStep(step + 1);
    } else {
      setResult(flow.recommend(next));
    }
  };

  const reset = () => {
    setStep(0);
    setAnswers([]);
    setResult(null);
  };

  return (
    <section className="mx-auto max-w-6xl px-5 pb-6 sm:px-6">
      <div className="rounded-3xl border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent p-8">
        <div className="flex items-center gap-2.5 mb-1">
          <Sparkles size={18} className="text-accent" />
          <div className="text-xs font-bold uppercase tracking-widest text-accent">
            Plan Customisation
          </div>
        </div>
        <h3 className="font-display text-xl font-black text-navy">Not sure which plan to pick?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Answer 3 quick questions and we'll recommend the best plan for your situation.
        </p>

        {!result ? (
          <div className="mt-7">
            {/* Progress bar */}
            <div className="mb-5 flex items-center gap-2">
              {flow.steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-accent" : "bg-border"}`}
                />
              ))}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Step {step + 1} of {flow.steps.length}
            </div>
            <div className="font-display text-base font-bold text-navy mb-5">
              {flow.steps[step].q}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
              {flow.steps[step].options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => pick(opt.value)}
                  className="group flex flex-col items-start rounded-2xl border-2 border-border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md lg:min-w-[150px]"
                >
                  <span className="font-semibold text-sm text-navy group-hover:text-accent">
                    {opt.label}
                  </span>
                  {opt.sub && (
                    <span className="mt-0.5 text-xs text-muted-foreground">{opt.sub}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
                <Check size={22} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-bold uppercase tracking-widest text-accent mb-1">
                  We recommend
                </div>
                <div className="font-display text-2xl font-black text-navy">{result.name}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.why}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => onScrollToPlans(result.planId)}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                  >
                    View plan <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground/70 transition hover:bg-secondary"
                  >
                    Start over
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── CTA Banner ─────────────────────────────────────────────────── */
function CTABanner({ session }: { session: unknown }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="rounded-3xl bg-gradient-to-r from-navy-deep to-navy p-10 text-center text-white">
        <h2 className="font-display text-2xl font-black sm:text-3xl">
          Ready to find your next home — or your next tenant?
        </h2>
        <p className="mt-3 text-white/70">
          Browse verified properties first, then unlock contacts when you are ready.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link
            href="/properties"
            className="rounded-xl bg-gold px-7 py-3 font-display text-sm font-bold text-navy-deep shadow-lg transition hover:opacity-90"
          >
            Browse Properties
          </Link>
          {!session && (
            <Link
              href="/register"
              className="rounded-xl border border-white/25 bg-white/10 px-7 py-3 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              Create Free Account
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ data ───────────────────────────────────────────────────── */
const seekerFaqs: string[][] = [
  [
    "What is the difference between all the seeker plans?",
    "Micro Match (₹99) gives you 1 contact for a quick test. Trial Pack (₹199) gives 3 contacts over 15 days — perfect for casual exploration. Standard Pack (₹499) gives 6 contacts over 30 days, the best value for a short but focused search. Active Hunter (₹999) gives 12 contacts over 30 days for a serious multi-option search. Pro Assisted (₹1,999) and Executive Premium (₹2,999) include a dedicated Relationship Manager who handles site visits, negotiation, and paperwork on your behalf.",
  ],
  [
    "Which plan should I choose?",
    'Use the "Help me choose" tool above — answer 3 questions and we\'ll match you to the right plan. As a rule of thumb: if you have 1–2 specific properties in mind, go Micro or Trial. For an active search across a neighbourhood, Standard or Active Hunter. If you want someone to do the legwork, Pro Assisted or Executive Premium.',
  ],
  [
    "What is a Dedicated Relationship Manager (RM) and how does it work?",
    "A Relationship Manager is a NxtSft.com property advisor assigned exclusively to you when you buy Pro Assisted or Executive Premium. They proactively shortlist matching properties, arrange and accompany you on site visits, negotiate rent or price with the owner on your behalf, and help complete the rental/sale agreement. You communicate directly with your RM over phone and WhatsApp.",
  ],
  [
    "How quickly can I access contacts after purchasing a plan?",
    "Immediately. Credits are added to your wallet the moment your payment clears (usually within seconds). You can then unlock any property contact in one tap from the listing page.",
  ],
  [
    "What if a contact is unreachable or the property is already taken?",
    'Open your Unlocks tab in the User Portal and tap "Raise Dispute" on that unlock within 24 hours of the issue. Our team verifies the claim — if valid, the credit is restored to your wallet the same day. If you paid via a plan rather than wallet, a credit is returned rather than a cash refund.',
  ],
  [
    "Why was my unlock rejected or showing an error?",
    "This can happen if: (1) the listing was unpublished by the owner between your payment and the unlock attempt, (2) your session expired — try refreshing and unlocking again, or (3) there was a payment gateway error. In all cases, contact care@nxtsft.com and we will resolve it within 4 hours.",
  ],
  [
    "Do unused credits expire?",
    "Yes — credits are valid only within the plan's validity window (7 to 60 days depending on the plan). Unused credits are not carried forward or refunded after expiry. Plan accordingly: if you're exploring casually, buy a small plan. If you're actively searching for the next 45–60 days, go with Pro or Executive.",
  ],
  [
    "Can I unlock the same property twice?",
    "No. Once a contact is unlocked it stays visible in your Unlocks tab permanently — you will never be charged again for the same property. Only one credit is deducted per property, ever.",
  ],
  [
    "Is there a plan that guarantees I'll find a home?",
    "The Executive Premium plan includes end-to-end closing support — your RM works with you until a rental/sale agreement is signed. While we cannot guarantee every search succeeds (property availability depends on the market), our RM-backed plans have a 91% satisfaction rate with closures typically within the plan validity window.",
  ],
  [
    "Can I top-up or upgrade mid-search?",
    "Yes. You can purchase another plan at any time. New credits are added to your existing wallet balance. You can also upgrade to a Pro or Executive plan and a RM will be assigned within 2 hours of purchase, regardless of any plan you previously held.",
  ],
  [
    "Is there a monthly subscription?",
    "No. All plans are one-time payments. There are no auto-renewals, no hidden recurring charges. Buy credits only when you need to search.",
  ],
  [
    "Is my payment secure?",
    "Yes. All transactions are processed by Razorpay, a PCI-DSS compliant payment gateway. NxtSft.com never stores your card, UPI, or banking credentials. Payments are encrypted end-to-end.",
  ],
];

const ownerFaqs: string[][] = [
  [
    "What is the difference between the rental and selling plans?",
    "Rental plans (Weekly Booster, Monthly Silver, Gold, Platinum) are designed for landlords seeking tenants — they come with shorter validity and are priced for faster turnover. Selling plans (Silver, Gold, Platinum, Builder Pro, Enterprise) are for homeowners, agents, and developers selling properties — they carry higher lead quotas, longer validity, and optional CRM integration because the sales cycle is longer.",
  ],
  [
    "When will my listing go live after I purchase a plan?",
    "Our team verifies and publishes listings within 24 hours of submission. For higher-tier plans (Gold and above), we prioritise within 8 hours. You will receive a WhatsApp confirmation with your listing URL once it's live. If your listing is not published within 24 hours, contact care@nxtsft.com immediately.",
  ],
  [
    "Why was my listing rejected?",
    "Common rejection reasons: (1) the property is already listed on NxtSft.com under another account; (2) the property has already been rented or sold; (3) the submitted documents do not match the address; (4) the listing violates our content policy (misleading photos, incorrect category). You will receive a rejection reason via WhatsApp/email and can resubmit after addressing the issue.",
  ],
  [
    "Can I list multiple properties on a single plan?",
    "Yes, if your plan allows it. Rent Monthly Gold allows 3 listings, Rent Monthly Platinum allows 15, Sell Builder Pro allows 15, and Sell Enterprise allows 40. Each plan clearly states the number of active listings permitted. The Weekly Booster and Rent Monthly Silver are single-property plans.",
  ],
  [
    'What counts as a "verified lead"?',
    "A verified lead is a buyer or tenant who has used a paid credit to unlock your contact on NxtSft.com. This means they have a registered, verified account, have paid for access, and are genuinely interested — not a casual browser. You receive their name, phone number, and property interest via WhatsApp instantly when they unlock your contact.",
  ],
  [
    "Do I pay per lead, or is it a flat fee?",
    "Flat fee. You pay once for the plan. Tenants and buyers pay NxtSft.com separately to unlock your contact. There are no commission or per-lead charges — you keep every rupee from your transaction. Our revenue model does not depend on your deal closing.",
  ],
  [
    "My plan expired before I found a tenant — what now?",
    "You can renew or upgrade at any time. There is no penalty, and your original listing content is preserved — just reactivate it when you renew. We recommend opting for a 30-day plan if you are not finding tenants quickly, as it gives more time for lead flow.",
  ],
  [
    "Can I get a refund if my property gets rented through another channel?",
    "Plans are non-refundable once activated and a listing goes live — similar to how classified ads work. If your property is rented before the plan expires, you can redirect the remaining lead quota to another property you own (Gold/Platinum plans). Contact care@nxtsft.com to reassign.",
  ],
  [
    "Can I upgrade my plan mid-listing?",
    "Yes. Upgrade at any time through your account or by contacting support. The remaining days of your current plan are credited proportionally towards the upgrade cost. You will not lose any existing leads or listing visibility during the upgrade.",
  ],
  [
    "Do I need to share property documents to list?",
    'To get the "Verified" badge, yes — you will need to share a utility bill or ownership document. Unverified listings are published but shown without the badge. We strongly recommend getting verified: verified listings receive 3× more unlocks on average than unverified ones.',
  ],
  [
    "Will NxtSft.com agents help me find tenants?",
    "On Gold and Platinum plans, our team actively matches your listing to tenant searches and WhatsApp-alerts you on all new enquiries. On Platinum, our Social Ad Engine runs targeted campaigns on Instagram and Facebook. If you want a fully hands-off experience, contact our team about managed letting services.",
  ],
  [
    "What if a tenant I found causes problems later?",
    "NxtSft.com facilitates the connection but is not party to the tenancy agreement. Gold and above plans include basic tenant background screening (name, ID verification) through our portal. For higher-value properties, we recommend engaging a local lawyer for a formal rental agreement. Our RM (available on request) can assist with lease paperwork review.",
  ],
];

const ownerSellFaqs: string[][] = [
  [
    "What is the difference between all the selling plans?",
    "Sell Silver (₹4,999) is for individual homeowners with 1 property and basic lead access. Sell Gold (₹9,999) adds Facebook Ads and top search placement — ideal for active brokers with 2–3 listings. Sell Platinum (₹14,999) adds homepage rotation and dedicated lead filters for independent agencies. Builder Pro (₹24,999) includes CRM integration, Google + Meta campaigns, and is built for developers. Enterprise (₹49,999) is for large-scale developers needing a dedicated project landing page, 40 listings, and a personal account manager.",
  ],
  [
    "When will my listing go live after I purchase?",
    "Within 24 hours of document submission on standard plans. Builder Pro and Enterprise listings are prioritised and typically go live within 8 hours. You receive a WhatsApp confirmation with your listing URL once published.",
  ],
  [
    "Why was my sale listing rejected?",
    "Common reasons include: property already listed under another account; missing or mismatched ownership documents; property already sold; photos that do not match the described property; or a property category mismatch. You will receive a reason via WhatsApp/email and can resubmit after correction.",
  ],
  [
    "Do I pay a commission when my property sells?",
    "No. NxtSft.com charges a flat listing fee only. There are zero commissions or success fees. Every rupee from your sale goes entirely to you.",
  ],
  [
    "What is the Builder Pro plan designed for?",
    "Builder Pro (₹24,999/month) is built for mid-tier developers with 15 active listings across one or more projects. It includes 400 verified buyer leads, CRM + lead routing, and Google + Meta ad campaigns managed by our team. For projects with 20+ units or multiple towers, consider the Enterprise plan or a custom quote.",
  ],
  [
    "Can I get a custom plan for my project?",
    "Yes. Developers needing more than 40 listings, a dedicated project microsite, virtual tour integration, or custom RERA-page embedding can email partners@nxtsft.com for a tailored quote and dedicated onboarding.",
  ],
  [
    "How do the Facebook and Google ad campaigns work?",
    "On Gold and above, our marketing team builds targeted campaigns reaching buyers by city, budget range, and property type. For Builder Pro and Enterprise, we run full Google Search + Meta (Instagram/Facebook) funnels. Campaigns go live within 48 hours of plan activation and include weekly performance reports.",
  ],
  [
    "Can I upgrade my plan or add more listings mid-month?",
    "Yes. Upgrade at any time — unused days from your current plan are credited pro-rata. You can also top up listing slots by purchasing an add-on without changing your base plan. Contact care@nxtsft.com for add-on pricing.",
  ],
  [
    "What happens if I don't sell within the plan validity?",
    "You can renew at the same plan tier (at the current price) and your listing content is preserved — no need to resubmit documents. If a buyer made enquiries during your plan but hasn't closed, their contact details remain in your dashboard even after plan expiry.",
  ],
  [
    "Is payment secure and what are the accepted methods?",
    "All payments are processed by Razorpay (PCI-DSS Level 1 compliant). We accept UPI, net banking, debit/credit cards, and EMI on select plans. NxtSft.com does not store any card or banking credentials.",
  ],
];

const resellerFaqs: string[][] = [
  [
    "What exactly is a Verified Buyer Lead?",
    "A Verified Buyer Lead is a pre-qualified buyer who has registered on NxtSft.com with a verified identity and an active property search that matches your listing. Unlike cold leads, they have expressed genuine purchase or lease intent — meaning higher conversion rates and far less time wasted on unqualified enquiries.",
  ],
  [
    "How are leads delivered to me?",
    "Within 24 hours of plan activation, your dedicated Relationship Manager reaches out to understand your property requirements. Leads are then delivered to your WhatsApp — including the buyer's name, phone number, budget range, and property requirements — so you always have context before the first call.",
  ],
  [
    "What is the difference between the 3 plans?",
    "Standard Pack (₹2,999) gives you 10 leads for a single listing with RM support and walkthrough assistance over 30 days. Pro Assisted (₹4,999) gives 30 leads with RM-managed site visits and end-to-end closing over 45 days. Executive Premium (₹9,999) gives 50 leads, premium buyer search access, up to 15 managed site visits, and full closing support over 60 days — best value if you want maximum reach with zero effort.",
  ],
  [
    "Is there a commission when my property sells?",
    "No. These are flat-fee plans — NxtSft.com charges zero commission on your transaction. Every rupee from your sale or lease goes entirely to you.",
  ],
  [
    'What does "End-to-End Lease/Sale Closing" mean?',
    "Your dedicated RM handles everything after lead matching — scheduling and accompanying site visits, negotiating price on your behalf, coordinating with lawyers for documentation, and assisting with the sale or lease agreement. You only need to approve the final deal.",
  ],
  [
    "What if leads don't convert?",
    "We focus on quality over quantity — all leads are intent-verified and matched to your property type, location, and budget. If leads delivered are unresponsive or clearly irrelevant, contact care@nxtsft.com within 48 hours and our team will review and replace them at no extra cost.",
  ],
  [
    "Can I get more leads if I exhaust my pack before validity ends?",
    "Yes. You can top up by purchasing an additional plan or upgrading mid-validity. Contact care@nxtsft.com for a seamless upgrade with pro-rated pricing.",
  ],
  [
    "How quickly is my RM assigned after purchase?",
    "Your Relationship Manager is assigned within 2 hours of payment confirmation. They will reach out via WhatsApp to introduce themselves and schedule an onboarding call to understand your property and expectations.",
  ],
  [
    "Is my payment secure?",
    "All payments are processed by Razorpay (PCI-DSS Level 1 compliant). We accept UPI, net banking, debit/credit cards. NxtSft.com does not store card or banking credentials.",
  ],
];

/* ── Main page ──────────────────────────────────────────────────── */
const TABS = ["Builders & Consultants", "Tenants", "Resellers & Owners"];

export default function PricingPage() {
  const { session, addCredits } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [ownerMode, setOwnerMode] = useState<"renting" | "selling">("renting");

  const handleBuyOwner = (plan: OwnerPlan) => {
    if (!session) {
      toast.error("Please sign in first");
      return;
    }
    toast.success(`${plan.name} plan activated!`, {
      description: `Valid for ${plan.validity}.`,
      duration: 5000,
    });
  };

  const handleBuySeeker = (plan: SeekerPlan) => {
    if (!session) {
      toast.error("Please sign in first");
      return;
    }
    addCredits(plan.credits);
    toast.success(`${plan.name} plan activated!`, {
      description: `${plan.credits} credit${plan.credits > 1 ? "s" : ""} added to your wallet.`,
      duration: 5000,
    });
  };

  const handleBuyReseller = (plan: ResellerPlan) => {
    if (!session) {
      toast.error("Please sign in first");
      return;
    }
    toast.success(`${plan.name} activated!`, {
      description: `Your RM will contact you within 2 hours. Valid for ${plan.validity}.`,
      duration: 5000,
    });
  };

  const ownerPlans = ownerMode === "renting" ? ownerRentalPlans : ownerSellPlans;

  const scrollToPlan = (planId: string) => {
    const el = document.getElementById(`plan-${planId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.animate(
      [
        { boxShadow: "0 0 0 4px oklch(0.65 0.22 27 / 0.4)" },
        { boxShadow: "0 0 0 0px oklch(0.65 0.22 27 / 0)" },
      ],
      { duration: 1200, easing: "ease-out" },
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-navy-deep via-navy to-mid-blue py-20 text-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80">
            <Shield size={12} /> Transparent, no-brokerage pricing
          </div>
          <h1 className="mt-6 font-display text-4xl font-black leading-tight sm:text-5xl">
            Pay once. Talk directly. <span className="text-gold">No commissions.</span>
          </h1>
          <p className="mt-5 text-base text-white/70 sm:text-lg">
            Whether you build, consult, rent or are reselling a property — NxtSft.com has a plan
            sized exactly for you.
          </p>
        </div>
      </section>

      {/* Sticky tab bar */}
      <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur sm:top-20">
        <div className="mx-auto flex max-w-6xl items-center gap-0 overflow-x-auto px-5 sm:px-6">
          {TABS.map((tab, i) => {
            const icons = [
              <Building2 size={15} key="b" />,
              <Users size={15} key="u" />,
              <Key size={15} key="k" />,
            ];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-5 py-4 font-display text-sm font-semibold transition
                  ${activeTab === i ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {icons[i]}
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── BUILDERS & CONSULTANTS ── */}
      {activeTab === 0 && (
        <>
          {/* Sub-toggle */}
          <div className="mx-auto mt-10 flex max-w-xs justify-center">
            <div className="flex rounded-xl border border-border bg-secondary p-1">
              {(["renting", "selling"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setOwnerMode(mode)}
                  className={`rounded-lg px-5 py-2 font-display text-sm font-semibold transition
                    ${ownerMode === mode ? "bg-white text-navy shadow" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {mode === "renting" ? "For Renting" : "For Selling"}
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <section className="mx-auto max-w-6xl px-5 pt-10 pb-6 sm:px-6">
            <div
              className={`grid grid-cols-1 items-stretch gap-6 pt-5 sm:grid-cols-2 ${ownerMode === "renting" ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
            >
              {ownerPlans.map((plan) => (
                <div id={`plan-${plan.id}`} key={plan.id} className="h-full">
                  <OwnerPlanCard plan={plan} onBuy={handleBuyOwner} />
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Secure payment via Razorpay · No subscription, no hidden charges · Listings go live
              within 24 hrs of verification
            </p>
          </section>

          {/* Plan Chooser */}
          <PlanChooser
            variant={ownerMode === "renting" ? "owner-rent" : "owner-sell"}
            onScrollToPlans={scrollToPlan}
          />

          <HowItWorks forSeeker={false} />
          <FAQ
            faqs={ownerMode === "renting" ? ownerFaqs : ownerSellFaqs}
            title={
              ownerMode === "renting"
                ? "Builder & consultant rental plan FAQs"
                : "Builder & consultant selling plan FAQs"
            }
          />
          <CTABanner session={session} />
        </>
      )}

      {/* ── TENANTS ── */}
      {activeTab === 1 && (
        <>
          <section className="mx-auto max-w-6xl px-5 pb-6 pt-10 sm:px-6">
            <div className="grid grid-cols-1 items-stretch gap-6 pt-5 sm:grid-cols-2 lg:grid-cols-3">
              {seekerPlans.map((plan) => (
                <div id={`plan-${plan.id}`} key={plan.id} className="h-full">
                  <SeekerPlanCard plan={plan} onBuy={handleBuySeeker} />
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Secure payment via Razorpay · One-time only, no recurring charges · Dispute refund
              within 24 hrs
            </p>
          </section>

          <WalletTrustRow />
          <div className="pb-4" />

          {/* Plan Chooser */}
          <PlanChooser variant="seeker" onScrollToPlans={scrollToPlan} />

          <HowItWorks forSeeker={true} />
          <FAQ faqs={seekerFaqs} title="Tenant plan FAQs" />
          <CTABanner session={session} />
        </>
      )}

      {/* ── RESELLERS & OWNERS ── */}
      {activeTab === 2 && (
        <>
          {/* Intro blurb */}
          <div className="mx-auto max-w-2xl px-5 pt-10 text-center sm:px-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">
              Verified Lead Packs
            </div>
            <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">
              Sell or lease your property faster with intent-verified buyer leads.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Choose a pack based on how many qualified leads you need. Your dedicated Relationship
              Manager handles the rest — from site visits to closing.
            </p>
          </div>

          {/* Cards */}
          <section className="mx-auto max-w-5xl px-5 pb-6 pt-8 sm:px-6">
            <div className="grid grid-cols-1 items-stretch gap-6 pt-5 sm:grid-cols-3">
              {RESELLER_PLANS.map((plan) => (
                <div id={`plan-${plan.id}`} key={plan.id} className="h-full">
                  <ResellerPlanCard plan={plan} onBuy={handleBuyReseller} />
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Secure payment via Razorpay · Flat fee, zero commission · Dedicated RM assigned within
              2 hrs of purchase
            </p>
          </section>

          <ResellerTrustRow />
          <div className="pb-4" />

          {/* Plan Chooser */}
          <PlanChooser variant="reseller" onScrollToPlans={scrollToPlan} />

          <HowItWorks forSeeker={false} forReseller={true} />
          <FAQ faqs={resellerFaqs} title="Reseller & owner plan FAQs" />
          <CTABanner session={session} />
        </>
      )}

      <SiteFooter />
    </div>
  );
}
