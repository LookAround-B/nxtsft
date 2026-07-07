"use client";
import { useState } from "react";
import Link from "next/link";
import { Briefcase, Eye, Phone, Mail, MapPin, Sofa, ShieldCheck, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { Badge, Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { Head, fmtDate } from "./shared";

type PlanListing = { id: string; name: string; price: number; priceLabel: string; tagline: string; features: string[] };
type CurrentBusinessSub = { id: string; planName: string; amount: number; endDate: string };

type Profile = {
  id: string;
  slug: string;
  companyName: string;
  city: string;
  verified: boolean;
  views: number;
  contacts: number;
  status: string;
};

type Lead = {
  buyer: { id: string; name: string; phone?: string; email?: string | null; city?: string | null } | null;
  listingName: string;
  listingHref: string;
  createdAt: string;
};

const statusTone: Record<string, "success" | "warm" | "cold" | "default"> = {
  active: "success",
  pending: "warm",
  inactive: "cold",
};

function ProfileCard({ profile, href }: { profile: Profile; href: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-navy">{profile.companyName}</span>
            {profile.verified && <ShieldCheck size={13} className="shrink-0 text-emerald-600" />}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={10} /> {profile.city}
          </div>
        </div>
        <Badge tone={statusTone[profile.status] ?? "default"}>{profile.status}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="new">
          <span className="flex items-center gap-1"><Eye size={11} /> {profile.views} views</span>
        </Badge>
        <Badge tone="hot">{profile.contacts} contact{profile.contacts === 1 ? "" : "s"} unlocked</Badge>
      </div>
      <Link
        href={href}
        className="mt-3 inline-block rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent"
      >
        View public listing
      </Link>
    </div>
  );
}

function ListingPlanSection({ planType }: { planType: "designer" | "decor" }) {
  const [buying, setBuying] = useState(false);
  const subQ = trpc.subscriptions.myBusinessSubscription.useQuery();
  const businessPlanQ = trpc.subscriptions.plans.useQuery({ type: planType });
  const gatewayQ = trpc.subscriptions.activeGateway.useQuery();
  const createOrder = trpc.subscriptions.createBusinessOrder.useMutation();
  const createPayUOrder = trpc.subscriptions.createBusinessPayUOrder.useMutation();
  const verifyPayment = trpc.subscriptions.verifyBusinessPayment.useMutation();

  const sub = subQ.data as CurrentBusinessSub | null | undefined;
  const plan = (businessPlanQ.data as unknown as PlanListing[] | undefined)?.[0];

  const handleSubscribe = async () => {
    if (!plan) return;
    const gateway = gatewayQ.data?.gateway ?? "razorpay";
    setBuying(true);
    try {
      if (gateway === "razorpay") {
        const order = await createOrder.mutateAsync({ planId: plan.id });
        await openRazorpayCheckout({
          keyId: order.keyId,
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          prefill: order.prefill,
          onDismiss: () => setBuying(false),
          onSuccess: async (resp) => {
            try {
              await verifyPayment.mutateAsync({
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
                planId: plan.id,
              });
              toast.success("Listing plan activated!");
              subQ.refetch();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Payment verification failed.");
            } finally {
              setBuying(false);
            }
          },
        });
      } else {
        const fields = await createPayUOrder.mutateAsync({ planId: plan.id });
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
      }
    } catch (err) {
      setBuying(false);
      toast.error(err instanceof Error ? err.message : "Purchase failed.");
    }
  };

  return (
    <Section title="Listing Plan">
      {subQ.isLoading ? (
        <div className="h-24 animate-pulse rounded-lg border border-border bg-secondary/40" />
      ) : sub ? (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-navy">{sub.planName}</span>
            <Badge tone="success">Active</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            ₹{(sub.amount / 100).toLocaleString("en-IN")} · expires {fmtDate(sub.endDate)}
          </p>
        </div>
      ) : plan ? (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-navy">{plan.name}</span>
            <span className="flex items-center gap-0.5 text-sm font-bold text-accent">
              <IndianRupee size={13} />{plan.price}/mo
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
          <button
            onClick={handleSubscribe}
            disabled={buying}
            className="mt-3 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-60"
          >
            {buying ? "Processing…" : "Subscribe"}
          </button>
        </div>
      ) : null}
    </Section>
  );
}

export function MyBusinessTab() {
  const designersQ = trpc.interiorDesigners.myProfiles.useQuery();
  const storesQ = trpc.decorStores.myProfiles.useQuery();
  const designerLeadsQ = trpc.interiorDesigners.myLeads.useQuery();
  const storeLeadsQ = trpc.decorStores.myLeads.useQuery();

  const designers = (designersQ.data ?? []) as unknown as Profile[];
  const stores = (storesQ.data ?? []) as unknown as Profile[];
  const loading = designersQ.isLoading || storesQ.isLoading;

  if (!loading && designers.length === 0 && stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Briefcase size={40} className="mb-4 text-muted-foreground/30" />
        <p className="text-sm font-semibold text-navy">No business listings yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Submit a Home Interiors or Decor Store listing to see it and its leads here.
        </p>
      </div>
    );
  }

  const designerLeads = (designerLeadsQ.data ?? []) as unknown as {
    buyer: Lead["buyer"];
    designer: { slug: string; companyName: string } | null;
    createdAt: string;
  }[];
  const storeLeads = (storeLeadsQ.data ?? []) as unknown as {
    buyer: Lead["buyer"];
    store: { slug: string; companyName: string } | null;
    createdAt: string;
  }[];

  const leads: Lead[] = [
    ...designerLeads.map((l) => ({
      buyer: l.buyer,
      listingName: l.designer?.companyName ?? "—",
      listingHref: l.designer ? `/interiors/${l.designer.slug}` : "#",
      createdAt: l.createdAt,
    })),
    ...storeLeads.map((l) => ({
      buyer: l.buyer,
      listingName: l.store?.companyName ?? "—",
      listingHref: l.store ? `/decor/${l.store.slug}` : "#",
      createdAt: l.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      <Head t="My Business" s="Your Home Interiors / Decor listings and the leads they've generated." />

      <ListingPlanSection planType={designers.length === 0 && stores.length > 0 ? "decor" : "designer"} />

      <Section title="Your listings">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg border border-border bg-secondary/40" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {designers.map((d) => (
              <ProfileCard key={d.id} profile={d} href={`/interiors/${d.slug}`} />
            ))}
            {stores.map((s) => (
              <ProfileCard key={s.id} profile={s} href={`/decor/${s.slug}`} />
            ))}
          </div>
        )}
      </Section>

      <Section title={leads.length ? `${leads.length} lead${leads.length > 1 ? "s" : ""}` : "Leads"}>
        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/20 py-14 text-center">
            <Sofa size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No leads yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              When a buyer unlocks your contact details, they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((l, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-navy">{l.buyer?.name ?? "Unknown buyer"}</span>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {l.buyer?.phone && (
                        <span className="inline-flex items-center gap-1"><Phone size={11} /> {l.buyer.phone}</span>
                      )}
                      {l.buyer?.email && (
                        <span className="inline-flex items-center gap-1 truncate"><Mail size={11} /> {l.buyer.email}</span>
                      )}
                      {l.buyer?.city && (
                        <span className="inline-flex items-center gap-1"><MapPin size={11} /> {l.buyer.city}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">{fmtDate(l.createdAt)}</div>
                </div>
                <div className="mt-3 flex items-center border-t border-border pt-3 text-xs">
                  <span className="text-muted-foreground">
                    Unlocked <Link href={l.listingHref} className="font-medium text-navy hover:text-accent">{l.listingName}</Link>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
