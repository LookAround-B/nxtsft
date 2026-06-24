"use client";

import { useState } from "react";
import { Building2, Users, Key, Shield } from "lucide-react";
import { toast } from "sonner";
import { ownerRentalPlans, ownerSellPlans } from "@/data/static";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerPlanCard } from "@/components/pricing/OwnerPlanCard";
import { SeekerPlanCard, type SeekerPlan } from "@/components/pricing/SeekerPlanCard";
import { ResellerPlanCard } from "@/components/pricing/ResellerPlanCard";
import { WalletTrustRow } from "@/components/pricing/WalletTrustRow";
import { ResellerTrustRow } from "@/components/pricing/ResellerTrustRow";
import { HowItWorks } from "@/components/pricing/HowItWorks";
import { FAQ } from "@/components/pricing/FAQ";
import { PlanChooser } from "@/components/pricing/PlanChooser";
import { CTABanner } from "@/components/pricing/CTABanner";
import {
  RESELLER_PLANS,
  PRICING_TABS,
  seekerFaqs,
  ownerFaqs,
  ownerSellFaqs,
  resellerFaqs,
  type ResellerPlan,
} from "@/components/pricing/pricingData";
import type { ownerRentalPlans as OwnerRentalPlansType } from "@/data/static";

type OwnerPlan = (typeof ownerRentalPlans)[0];

const TAB_ICONS = [
  <Building2 size={15} key="b" />,
  <Users size={15} key="u" />,
  <Key size={15} key="k" />,
];

export default function PricingPage() {
  const { session, refreshCredits } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [ownerMode, setOwnerMode] = useState<"renting" | "selling">("renting");
  const [buyingPlanId, setBuyingPlanId] = useState<string | null>(null);

  const plansQuery = trpc.subscriptions.plans.useQuery({ type: "seeker" });
  const createOrder = trpc.subscriptions.createOrder.useMutation();
  const verifyPayment = trpc.subscriptions.verifyPayment.useMutation();

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

  const handleBuySeeker = async (plan: SeekerPlan) => {
    if (!session) {
      toast.error("Please sign in to purchase a plan.");
      return;
    }
    setBuyingPlanId(plan.id);
    try {
      const order = await createOrder.mutateAsync({ planId: plan.id });
      await verifyPayment.mutateAsync({
        razorpayOrderId: order.orderId,
        razorpayPaymentId: `demo_pay_${Date.now()}`,
        razorpaySignature: `demo_sig_${Date.now()}`,
        planId: plan.id,
      });
      await refreshCredits();
      toast.success(`${plan.name} plan activated!`, {
        description: `${plan.credits} credit${plan.credits > 1 ? "s" : ""} added to your wallet.`,
        duration: 5000,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed. Please try again.");
    } finally {
      setBuyingPlanId(null);
    }
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
  const dbSeekerPlans = (plansQuery.data ?? []) as SeekerPlan[];

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

      {/* Hero */}
      <section className="bg-linear-to-br from-navy-deep via-navy to-mid-blue py-20 text-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80">
            <Shield size={12} /> Transparent, no-commission pricing
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
          {PRICING_TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-5 py-4 font-display text-sm font-semibold transition
                ${activeTab === i ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {TAB_ICONS[i]}
              {tab}
            </button>
          ))}
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
              {plansQuery.isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="space-y-4 rounded-2xl border border-border bg-white p-6"
                    >
                      <Skeleton className="h-5 w-24 rounded" />
                      <Skeleton className="h-9 w-32 rounded" />
                      <Skeleton className="h-3 w-40 rounded" />
                      <div className="space-y-2 pt-2">
                        <Skeleton className="h-3 w-full rounded" />
                        <Skeleton className="h-3 w-5/6 rounded" />
                        <Skeleton className="h-3 w-4/6 rounded" />
                      </div>
                      <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                  ))
                : dbSeekerPlans.map((plan) => (
                    <div
                      id={`plan-${plan.id}`}
                      key={plan.id}
                      className={`h-full transition-opacity ${buyingPlanId && buyingPlanId !== plan.id ? "opacity-50" : ""}`}
                    >
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
          <PlanChooser variant="reseller" onScrollToPlans={scrollToPlan} />
          <HowItWorks forSeeker={false} forReseller={true} />
          <FAQ faqs={resellerFaqs} title="Reseller & owner plan FAQs" />
          <CTABanner session={session} />
        </>
      )}

    </div>
  );
}
