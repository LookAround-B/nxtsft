'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Check, Zap, Shield, Home, Users, TrendingUp, UserCheck, PhoneCall,
} from 'lucide-react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ownerRentalPlans, ownerSellPlans, seekerPlans } from '@/data/static';
import { useAuth } from '@/lib/auth';

type OwnerPlan  = typeof ownerRentalPlans[0];
type SeekerPlan = typeof seekerPlans[0];

/* ── Plan card — owner ──────────────────────────────────────────── */
function OwnerPlanCard({ plan, onBuy }: { plan: OwnerPlan; onBuy: (p: OwnerPlan) => void }) {
  const isPopular = plan.badge === 'Popular';
  return (
    <div className={`relative flex h-full flex-col rounded-2xl border-2 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl
      ${isPopular ? 'border-accent shadow-accent/10' : 'border-border'}`}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className={`rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-widest shadow
            ${isPopular ? 'bg-accent text-white' : 'bg-navy text-white'}`}>
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
          ${isPopular
            ? 'bg-accent text-white shadow-lg shadow-accent/25 hover:opacity-90'
            : 'bg-navy text-white hover:opacity-90'}`}
      >
        Get {plan.name}
      </button>
    </div>
  );
}

/* ── Plan card — seeker ─────────────────────────────────────────── */
function SeekerPlanCard({ plan, onBuy }: { plan: SeekerPlan; onBuy: (p: SeekerPlan) => void }) {
  const isPopular = plan.badge === 'Popular';
  return (
    <div className={`relative flex h-full flex-col rounded-2xl border-2 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl
      ${isPopular ? 'border-accent shadow-accent/10' : 'border-border'}`}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className={`rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-widest shadow
            ${isPopular ? 'bg-accent text-white' : 'bg-navy text-white'}`}>
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
          {plan.credits} {plan.credits === 1 ? 'credit' : 'credits'}
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
          ${isPopular
            ? 'bg-accent text-white shadow-lg shadow-accent/25 hover:opacity-90'
            : 'bg-navy text-white hover:opacity-90'}`}
      >
        Get Plan — {plan.priceLabel}
      </button>
    </div>
  );
}

/* ── Wallet trust row ───────────────────────────────────────────── */
function WalletTrustRow() {
  const items = [
    { icon: <Zap size={20} className="text-gold" />, title: 'Token Wallet System', desc: 'Credits are stored in your wallet. Use them any time within validity — no lock-in per property.' },
    { icon: <Shield size={20} className="text-accent" />, title: 'One-click Dispute Refund', desc: 'If a contact is unreachable or incorrect, raise a dispute in one tap and get your credit back within 24 hrs.' },
    { icon: <PhoneCall size={20} className="text-emerald-500" />, title: 'WhatsApp Alerts', desc: 'Get instant WhatsApp notifications when owners respond or new matching listings go live.' },
  ];
  return (
    <div className="mx-auto mt-8 max-w-6xl px-5 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map(({ icon, title, desc }) => (
          <div key={title} className="flex gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
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
function HowItWorks({ forSeeker }: { forSeeker: boolean }) {
  const steps = forSeeker ? [
    { step: '01', title: 'Choose a plan', body: 'Pick a plan based on how many properties you want to enquire about. Credits are stored in your wallet.' },
    { step: '02', title: 'Unlock a contact', body: "On any property page, tap \"Unlock Contact\". One credit is deducted and the owner's phone and address are revealed instantly." },
    { step: '03', title: 'Call directly', body: 'Call or WhatsApp the owner directly — zero brokerage, no middlemen. Mark the deal as closed in your dashboard when done.' },
  ] : [
    { step: '01', title: 'List your property', body: 'Create a detailed listing with photos, amenities and pricing. Our team verifies and publishes within 24 hours.' },
    { step: '02', title: 'Receive verified leads', body: 'Tenants or buyers unlock your contact using their credits. You receive their verified details instantly via WhatsApp.' },
    { step: '03', title: 'Close the deal', body: 'Talk directly to qualified, verified parties. No brokerage, no commissions — just a one-time listing fee.' },
  ];

  return (
    <section className="bg-secondary/50 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center font-display text-2xl font-black text-navy sm:text-3xl">How it works</h2>
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
function FAQ({ faqs }: { faqs: string[][] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h2 className="text-center font-display text-2xl font-black text-navy">Frequently asked questions</h2>
      <div className="mt-8 space-y-3">
        {faqs.map(([q, a], i) => (
          <div key={q} className="rounded-xl border border-border bg-white overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="font-display text-sm font-bold text-navy pr-4">{q}</span>
              <span className={`shrink-0 text-accent transition-transform duration-200 ${open === i ? 'rotate-45' : ''}`}>+</span>
            </button>
            {open === i && (
              <div className="border-t border-border px-5 pb-4 pt-3">
                <p className="text-sm leading-relaxed text-muted-foreground">{a}</p>
              </div>
            )}
          </div>
        ))}
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
        <p className="mt-3 text-white/70">Browse verified properties first, then unlock contacts when you are ready.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link href="/properties" className="rounded-xl bg-gold px-7 py-3 font-display text-sm font-bold text-navy-deep shadow-lg transition hover:opacity-90">
            Browse Properties
          </Link>
          {!session && (
            <Link href="/register" className="rounded-xl border border-white/25 bg-white/10 px-7 py-3 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">
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
  ['What is a Dedicated RM?', 'A Relationship Manager (RM) is a NxtSft.com property advisor assigned exclusively to you. They help you shortlist properties, coordinate site visits, and assist during negotiations.'],
  ['How does the dispute refund work?', "If an owner's contact turns out to be wrong or unreachable, open your Unlocks dashboard and tap \"Raise Dispute\" within 24 hours. Credits are restored or amount refunded usually the same day."],
  ['Do unused credits expire?', 'Yes — credits are valid for the period shown on each plan (7 to 60 days). Unused credits are not refunded after expiry, so pick a plan that matches your search timeline.'],
  ['Can I unlock the same property twice?', 'No — once you unlock a property contact it stays visible in your account forever. Only one credit is ever deducted per property.'],
  ['Is there a monthly subscription?', 'No — all plans are one-time payments. Buy credits only when you need to search, no auto-renewals or recurring charges.'],
];

const ownerFaqs: string[][] = [
  ['How is my listing verified?', 'After you submit a listing our team reviews property documents and calls you to confirm details within 24 hours. A "Verified" badge is then added to your listing.'],
  ['Do I pay per lead or a flat fee?', 'You pay a flat one-time listing fee per plan. Seekers pay to unlock your contact — you receive their enquiries completely free of charge once listed.'],
  ['Can I upgrade my plan mid-listing?', 'Yes — you can upgrade at any time. The remaining validity of your current plan is credited towards the new plan pro-rata.'],
  ['What if a tenant I found causes problems?', 'We provide basic tenant background information with verified plans. For higher plans, our RM also assists with lease agreement review.'],
];

/* ── Main page ──────────────────────────────────────────────────── */
const TABS = ['Owners & Agents', 'Tenants', 'Buyers'];

export default function PricingPage() {
  const { session, addCredits } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [ownerMode, setOwnerMode] = useState<'renting' | 'selling'>('renting');

  const handleBuyOwner = (plan: OwnerPlan) => {
    if (!session) { toast.error('Please sign in first'); return; }
    toast.success(`${plan.name} plan activated!`, { description: `Valid for ${plan.validity}.`, duration: 5000 });
  };

  const handleBuySeeker = (plan: SeekerPlan) => {
    if (!session) { toast.error('Please sign in first'); return; }
    addCredits(plan.credits);
    toast.success(`${plan.name} plan activated!`, { description: `${plan.credits} credit${plan.credits > 1 ? 's' : ''} added to your wallet.`, duration: 5000 });
  };

  const ownerPlans = ownerMode === 'renting' ? ownerRentalPlans : ownerSellPlans;

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
            Pay once. Talk directly.{' '}
            <span className="text-gold">No commissions.</span>
          </h1>
          <p className="mt-5 text-base text-white/70 sm:text-lg">
            Whether you own, rent or are searching for your dream home — NxtSft.com has a plan sized exactly for you.
          </p>
        </div>
      </section>

      {/* Sticky tab bar — top-16 mobile (h-16 nav), top-20 sm+ (h-20 nav) */}
      <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur sm:top-20">
        <div className="mx-auto flex max-w-6xl items-center gap-0 overflow-x-auto px-5 sm:px-6">
          {TABS.map((tab, i) => {
            const icons = [<Home size={15} key="h" />, <Users size={15} key="u" />, <TrendingUp size={15} key="t" />];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-5 py-4 font-display text-sm font-semibold transition
                  ${activeTab === i ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {icons[i]}{tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── OWNERS & AGENTS ── */}
      {activeTab === 0 && (
        <>
          {/* Sub-toggle */}
          <div className="mx-auto mt-10 flex max-w-xs justify-center">
            <div className="flex rounded-xl border border-border bg-secondary p-1">
              {(['renting', 'selling'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setOwnerMode(mode)}
                  className={`rounded-lg px-5 py-2 font-display text-sm font-semibold transition
                    ${ownerMode === mode ? 'bg-white text-navy shadow' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {mode === 'renting' ? 'For Renting' : 'For Selling'}
                </button>
              ))}
            </div>
          </div>

          {/* Cards — pt-7 so badge doesn't clip */}
          <section className="mx-auto max-w-6xl px-5 pt-10 pb-6 sm:px-6">
            <div className="grid grid-cols-1 items-stretch gap-6 pt-5 sm:grid-cols-2 lg:grid-cols-4">
              {ownerPlans.map((plan) => (
                <OwnerPlanCard key={plan.id} plan={plan} onBuy={handleBuyOwner} />
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Secure payment via Razorpay · No subscription, no hidden charges · Listings go live within 24 hrs of verification
            </p>
          </section>

          <HowItWorks forSeeker={false} />
          <FAQ faqs={ownerFaqs} />
          <CTABanner session={session} />
        </>
      )}

      {/* ── TENANTS ── */}
      {activeTab === 1 && (
        <>
          <section className="mx-auto max-w-6xl px-5 pb-6 pt-10 sm:px-6">
            <div className="grid grid-cols-1 items-stretch gap-6 pt-5 sm:grid-cols-2 lg:grid-cols-3">
              {seekerPlans.map((plan) => (
                <SeekerPlanCard key={plan.id} plan={plan} onBuy={handleBuySeeker} />
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Secure payment via Razorpay · One-time only, no recurring charges · Dispute refund within 24 hrs
            </p>
          </section>

          <WalletTrustRow />
          <div className="pb-8" />
          <HowItWorks forSeeker={true} />
          <FAQ faqs={seekerFaqs} />
          <CTABanner session={session} />
        </>
      )}

      {/* ── BUYERS ── */}
      {activeTab === 2 && (
        <>
          <section className="mx-auto max-w-6xl px-5 pb-6 pt-10 sm:px-6">
            <div className="grid grid-cols-1 items-stretch gap-6 pt-5 sm:grid-cols-2 lg:grid-cols-3">
              {seekerPlans.map((plan) => (
                <SeekerPlanCard key={plan.id} plan={plan} onBuy={handleBuySeeker} />
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Secure payment via Razorpay · One-time only, no recurring charges · Dispute refund within 24 hrs
            </p>
          </section>

          <WalletTrustRow />
          <div className="pb-8" />
          <HowItWorks forSeeker={true} />
          <FAQ faqs={seekerFaqs} />
          <CTABanner session={session} />
        </>
      )}

      <SiteFooter />
    </div>
  );
}
