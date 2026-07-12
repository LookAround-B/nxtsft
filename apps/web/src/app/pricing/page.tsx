"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerPlanCard, type OwnerPlan } from "@/components/pricing/OwnerPlanCard";
import { SeekerPlanCard, type SeekerPlan } from "@/components/pricing/SeekerPlanCard";
import { WalletTrustRow } from "@/components/pricing/WalletTrustRow";
import { HowItWorks } from "@/components/pricing/HowItWorks";
import { FAQ } from "@/components/pricing/FAQ";
import { PlanChooser } from "@/components/pricing/PlanChooser";
import { CTABanner } from "@/components/pricing/CTABanner";
import {
  PRICING_TABS,
  seekerFaqs,
  ownerFaqs,
  ownerSellFaqs,
} from "@/components/pricing/pricingData";

const TAB_ICONS = [
  <Building2 size={15} key="b" />,
  <Users size={15} key="u" />,
];

function PlanSkeletons({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-4 rounded-2xl border border-border bg-white p-6">
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
      ))}
    </>
  );
}

export default function PricingPage() {
  const { session, refreshCredits } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [ownerMode, setOwnerMode] = useState<"renting" | "selling">("renting");
  const [buyingPlanId, setBuyingPlanId] = useState<string | null>(null);

  // Deep-link the tab: /pricing#buyer opens Property Buyer, #seller opens Seller.
  useEffect(() => {
    const h = window.location.hash;
    if (h === "#buyer") setActiveTab(1);
    else if (h === "#seller") setActiveTab(0);
  }, []);

  const seekerPlansQuery = trpc.subscriptions.plans.useQuery({ type: "seeker" });
  const ownerPlansQuery = trpc.subscriptions.plans.useQuery({
    type: ownerMode === "renting" ? "owner-rent" : "owner-sell",
  });
  const gatewayQ = trpc.subscriptions.activeGateway.useQuery();
  const createOrder = trpc.subscriptions.createOrder.useMutation();
  const createOwnerOrder = trpc.subscriptions.createOwnerOrder.useMutation();
  const createOwnerPayUOrder = trpc.subscriptions.createOwnerPayUOrder.useMutation();
  const createPayUOrder = trpc.subscriptions.createPayUOrder.useMutation();
  const verifyPayment = trpc.subscriptions.verifyPayment.useMutation();
  const verifyOwnerPayment = trpc.subscriptions.verifyOwnerPayment.useMutation();

  const submitPayUForm = (fields: Record<string, string> & { action: string }) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = fields.action;
    (Object.entries(fields) as [string, string][]).forEach(([k, v]) => {
      if (k === "action") return;
      const inp = document.createElement("input");
      inp.type = "hidden";
      inp.name = k;
      inp.value = v;
      form.appendChild(inp);
    });
    document.body.appendChild(form);
    form.submit();
  };

  const handleBuyOwner = async (plan: OwnerPlan) => {
    if (!session) {
      toast.error("Please sign in to purchase a plan.");
      return;
    }
    const gateway = gatewayQ.data?.gateway ?? "razorpay";
    setBuyingPlanId(plan.id);
    try {
      if (gateway === "razorpay") {
        const order = await createOwnerOrder.mutateAsync({ planId: plan.id });
        await openRazorpayCheckout({
          keyId: order.keyId,
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          prefill: order.prefill,
          onDismiss: () => setBuyingPlanId(null),
          onSuccess: async (resp) => {
            try {
              await verifyOwnerPayment.mutateAsync({
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
                planId: plan.id,
              });
              router.push(
                `/payment/success?plan=${encodeURIComponent(plan.name)}&type=subscription`,
              );
            } catch (verifyErr) {
              toast.error(verifyErr instanceof Error ? verifyErr.message : "Payment verification failed.");
            } finally {
              setBuyingPlanId(null);
            }
          },
        });
      } else {
        // PayU — redirect flow
        const fields = await createOwnerPayUOrder.mutateAsync({ planId: plan.id });
        submitPayUForm(fields);
      }
    } catch (err) {
      setBuyingPlanId(null);
      toast.error(err instanceof Error ? err.message : "Purchase failed. Please try again.");
    }
  };

  const handleBuySeeker = async (plan: SeekerPlan) => {
    if (!session) {
      toast.error("Please sign in to purchase a plan.");
      return;
    }
    const gateway = gatewayQ.data?.gateway ?? "razorpay";
    setBuyingPlanId(plan.id);
    try {
      if (gateway === "razorpay") {
        const order = await createOrder.mutateAsync({ planId: plan.id });
        await openRazorpayCheckout({
          keyId: order.keyId,
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          prefill: order.prefill,
          onDismiss: () => setBuyingPlanId(null),
          onSuccess: async (resp) => {
            try {
              await verifyPayment.mutateAsync({
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
                planId: plan.id,
              });
              refreshCredits();
              router.push(
                `/payment/success?credits=${plan.credits}&plan=${encodeURIComponent(plan.name)}`,
              );
            } catch (verifyErr) {
              toast.error(verifyErr instanceof Error ? verifyErr.message : "Payment verification failed.");
            } finally {
              setBuyingPlanId(null);
            }
          },
        });
      } else {
        // PayU — redirect flow
        const fields = await createPayUOrder.mutateAsync({ planId: plan.id });
        submitPayUForm(fields);
      }
    } catch (err) {
      setBuyingPlanId(null);
      toast.error(err instanceof Error ? err.message : "Purchase failed. Please try again.");
    }
  };

  const ownerPlans = (ownerPlansQuery.data ?? []) as OwnerPlan[];
  const dbSeekerPlans = (seekerPlansQuery.data ?? []) as SeekerPlan[];

  const scrollToPlan = (planId: string) => {
    // Exact match first; fall back to a suffix match since DB-seeded seeker
    // plans use ids like "seeker-basic" while some recommend() flows only
    // know the bare tier name ("basic").
    const el =
      document.getElementById(`plan-${planId}`) ??
      document.querySelector<HTMLElement>(`[id^="plan-"][id$="-${planId}"]`);
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
            Whether you are selling, renting out, or searching for your next property — NxtSft.com has
            a plan sized exactly for you.
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

      {/* ── PROPERTY SELLER ── */}
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
            <div className="grid grid-cols-1 items-stretch gap-6 pt-5 sm:grid-cols-2 lg:grid-cols-4">
              {ownerPlansQuery.isLoading ? (
                <PlanSkeletons count={4} />
              ) : (
                ownerPlans.map((plan) => (
                  <div
                    id={`plan-${plan.id}`}
                    key={plan.id}
                    className={`h-full transition-opacity ${buyingPlanId && buyingPlanId !== plan.id ? "opacity-50" : ""}`}
                  >
                    <OwnerPlanCard plan={plan} onBuy={handleBuyOwner} />
                  </div>
                ))
              )}
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Secure payment via Razorpay · No subscription, no hidden charges · Listings go live
              within 24 hrs of verification
            </p>
          </section>

          <PlanChooser
            variant={ownerMode === "renting" ? "owner-rent" : "owner-sell"}
            plans={ownerPlans}
            onScrollToPlans={scrollToPlan}
          />
          <HowItWorks forSeeker={false} />
          <FAQ
            faqs={ownerMode === "renting" ? ownerFaqs : ownerSellFaqs}
            title={
              ownerMode === "renting"
                ? "Property seller rental plan FAQs"
                : "Property seller selling plan FAQs"
            }
          />
          <CTABanner session={session} />
        </>
      )}

      {/* ── PROPERTY BUYER ── */}
      {activeTab === 1 && (
        <>
          <section className="mx-auto max-w-6xl px-5 pb-6 pt-10 sm:px-6">
            <div className="grid grid-cols-1 items-stretch gap-6 pt-5 sm:grid-cols-2 lg:grid-cols-3">
              {seekerPlansQuery.isLoading ? (
                <PlanSkeletons count={3} />
              ) : (
                dbSeekerPlans.map((plan) => (
                  <div
                    id={`plan-${plan.id}`}
                    key={plan.id}
                    className={`h-full transition-opacity ${buyingPlanId && buyingPlanId !== plan.id ? "opacity-50" : ""}`}
                  >
                    <SeekerPlanCard plan={plan} onBuy={handleBuySeeker} />
                  </div>
                ))
              )}
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Secure payment via Razorpay · One-time only, no recurring charges · Dispute refund
              within 24 hrs
            </p>
          </section>

          <WalletTrustRow />
          <div className="pb-4" />
          <PlanChooser variant="seeker" plans={dbSeekerPlans} onScrollToPlans={scrollToPlan} />
          <HowItWorks forSeeker={true} />
          <FAQ faqs={seekerFaqs} title="Property buyer plan FAQs" />
          <CTABanner session={session} />
        </>
      )}

    </div>
  );
}
