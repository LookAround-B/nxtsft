"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { WatermarkOverlay } from "@/components/ui/WatermarkOverlay";
import { useRouter } from "next/navigation";
import { Building2, Eye, Clock, Pencil, Camera, Check, Coins, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Badge, Section } from "@/components/portal/PortalShell";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { boostIsActive } from "@nxtsft/shared/constants";
import { Head, fmtDate, fmtPrice } from "./shared";

type ListingItem = {
  id: string;
  slug: string;
  title: string;
  status: string;
  type: string;
  views: number;
  price: number;
  bhk: string | null;
  images: string[];
  createdAt: string;
  location: { city: string; locality: string } | null;
  _count?: { leads: number; favoritedBy: number };
  hasPendingEdit?: boolean;
  boostTier?: string | null;
  boostExpiry?: string | null;
};

const STARTER_FEATURES = [
  "Professional property photos",
  "Listing on NxtSft",
  "Complete property information",
  "Lead generation through the platform",
  "Social media promotion",
];

const PREMIUM_FEATURES = [
  ...STARTER_FEATURES,
  "360° Virtual Tour",
  "Cinematic walkthrough video",
  "Instagram Reel creation (2–3 reels)",
  "Professional thumbnail and cover images",
  "Featured placement on NxtSft",
  "Promotion on NxtSft's Instagram and other social platforms",
  "Tagged collaboration posts for increased reach",
];

type BoostPlan = {
  id: string;
  name: string;
  priceLabel: string;
  validity: number;
  tagline: string;
  features: string[];
  popular: boolean;
  boostTier: string | null;
  tag: string | null;
};

/** "Pay to jump the queue" — buy a bronze/silver/gold boost for one listing. */
function BoostModal({
  propertyId,
  propertyTitle,
  onClose,
  onBoosted,
}: {
  propertyId: string;
  propertyTitle: string;
  onClose: () => void;
  onBoosted: () => void;
}) {
  const [buying, setBuying] = useState<string | null>(null);
  const plansQ = trpc.subscriptions.boostPlans.useQuery();
  const createOrder = trpc.subscriptions.createBoostOrder.useMutation();
  const verifyPayment = trpc.subscriptions.verifyBoostPayment.useMutation();

  const plans = (plansQ.data ?? []) as unknown as BoostPlan[];

  const buy = async (plan: BoostPlan) => {
    setBuying(plan.id);
    try {
      const order = await createOrder.mutateAsync({ propertyId, planId: plan.id });
      await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        prefill: order.prefill,
        onDismiss: () => setBuying(null),
        onSuccess: async (resp) => {
          try {
            // planId/propertyId are re-derived server-side from the order row,
            // so nothing sensitive travels back up from the widget.
            await verifyPayment.mutateAsync({
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            toast.success(`${plan.name} is live for ${plan.validity} days.`);
            onBoosted();
            onClose();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Payment verification failed.");
          } finally {
            setBuying(null);
          }
        },
      });
    } catch (err) {
      setBuying(null);
      toast.error(err instanceof Error ? err.message : "Could not start payment.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl border border-border bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
          <Rocket size={18} className="text-accent" /> Boost Your Listing &amp; Get More Buyers
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Move &quot;{propertyTitle}&quot; to the top of search results.
        </p>

        {plansQ.isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading plans…</p>
        ) : plans.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No boost plans are available right now.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-xl border p-4 ${
                  plan.popular ? "border-accent ring-1 ring-accent/30" : "border-border"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2 right-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                    Popular
                  </span>
                )}
                <div className="font-display text-base font-bold text-navy">{plan.name}</div>
                <div className="mt-1 font-display text-2xl font-black text-navy">{plan.priceLabel}</div>
                <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-foreground">
                      <Check size={12} className="mt-0.5 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => buy(plan)}
                  disabled={buying !== null}
                  title="Move to Page 1, 2 or 3 instantly"
                  className="mt-4 w-full rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {buying === plan.id ? "Opening payment…" : "Pay Now"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold transition hover:bg-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function MediaPackageModal({
  propertyId,
  propertyTitle,
  onClose,
}: {
  propertyId: string;
  propertyTitle: string;
  onClose: () => void;
}) {
  const [submitted, setSubmitted] = useState<"starter" | "premium" | null>(null);
  const requestPackage = trpc.properties.requestMediaPackage.useMutation({
    onError: (err) => toast.error(err.message || "Couldn't submit request."),
  });

  const request = (packageType: "starter" | "premium") => {
    requestPackage.mutate(
      { propertyId, packageType },
      { onSuccess: () => setSubmitted(packageType) },
    );
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-border bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={22} />
            </div>
            <h3 className="text-base font-bold text-navy">Request submitted</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Our team will reach out shortly about your {submitted === "starter" ? "Starter" : "Premium"} package request for &quot;{propertyTitle}&quot;.
            </p>
            <button
              onClick={onClose}
              className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                <Camera size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy">Get Professional Media</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Our team will reach out to schedule the shoot and quote final pricing.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <div className="text-sm font-bold text-navy">Starter Package</div>
                <div className="mt-1 text-xs font-semibold text-accent">₹2,000–4,500</div>
                <ul className="mt-3 space-y-1.5">
                  {STARTER_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => request("starter")}
                  disabled={requestPackage.isPending}
                  className="mt-4 w-full rounded-md border border-border px-3 py-2 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  Request This Package
                </button>
              </div>

              <div className="rounded-xl border-2 border-accent p-4">
                <div className="text-sm font-bold text-navy">Premium Package</div>
                <div className="mt-1 text-xs font-semibold text-accent">₹5,000–8,000</div>
                <ul className="mt-3 space-y-1.5">
                  {PREMIUM_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => request("premium")}
                  disabled={requestPackage.isPending}
                  className="mt-4 w-full rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-60"
                >
                  Request This Package
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full rounded-md border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Confirmation shown before a seller edits a live listing — changes go through
// admin review rather than publishing immediately.
function ModifyConfirmDialog({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-navy">Changes need admin approval</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your changes will require admin approval before they go live.
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-2 rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          <li>• Approval may take up to 24 hours (TAT).</li>
          <li>• Once approved, you will receive a notification.</li>
        </ul>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-navy transition hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Continue to edit
          </button>
        </div>
      </div>
    </div>
  );
}

const listingTone: Record<string, "success" | "warm" | "cold" | "new" | "default"> = {
  Active: "success",
  Sold: "default",
  Rented: "default",
  Inactive: "cold",
  Pending: "warm",
};

export function MyListingsTab() {
  const { session } = useAuth();
  const router = useRouter();
  const [modifyTarget, setModifyTarget] = useState<string | null>(null);
  const [mediaPackageTarget, setMediaPackageTarget] = useState<{ id: string; title: string } | null>(null);
  const [boostTarget, setBoostTarget] = useState<{ id: string; title: string } | null>(null);
  const listingsQ = trpc.users.myListings.useQuery(undefined, { enabled: session?.role === "home-seller" });

  if (session?.role !== "home-seller") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Building2 size={40} className="mb-4 text-muted-foreground/30" />
        <p className="text-sm font-semibold text-navy">This section is for Home Sellers</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Home Buyers cannot list properties. Register as a Home Seller to list your property.
        </p>
      </div>
    );
  }
  const updateStatus = trpc.properties.update.useMutation({
    onSuccess: () => listingsQ.refetch(),
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const items = (listingsQ.data ?? []) as unknown as ListingItem[];

  const setStatus = (id: string, status: "Active" | "Inactive", label: string) =>
    updateStatus.mutate({ id, status }, { onSuccess: () => toast.success(label) });

  return (
    <>
      {modifyTarget && (
        <ModifyConfirmDialog
          onClose={() => setModifyTarget(null)}
          onConfirm={() => router.push(`/list/edit/${modifyTarget}`)}
        />
      )}
      {mediaPackageTarget && (
        <MediaPackageModal
          propertyId={mediaPackageTarget.id}
          propertyTitle={mediaPackageTarget.title}
          onClose={() => setMediaPackageTarget(null)}
        />
      )}
      {boostTarget && (
        <BoostModal
          propertyId={boostTarget.id}
          propertyTitle={boostTarget.title}
          onClose={() => setBoostTarget(null)}
          onBoosted={() => void listingsQ.refetch()}
        />
      )}
      <Head t="My Listings" s="What you've put on the market." />
      <Section
        title={items.length ? `${items.length} listing${items.length > 1 ? "s" : ""}` : "Listings"}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/list/bulk"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent"
            >
              Bulk upload
            </Link>
            <Link
              href="/list"
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
            >
              + Post Another
            </Link>
          </div>
        }
      >
        {listingsQ.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-lg border border-border">
                <div className="h-40 w-full bg-secondary" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-40 rounded bg-secondary" />
                  <div className="h-3 w-24 rounded bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/20 py-14 text-center">
            <Building2 size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">You haven&apos;t listed any properties yet.</p>
            <Link
              href="/list"
              className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground"
            >
              List a property
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((p) => {
              const img = p.images?.[0] ?? "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=70";
              return (
                <div key={p.id} className="overflow-hidden rounded-lg border border-border">
                  <div className="relative h-40 w-full">
                    <Image src={img} alt={p.title} fill className="object-cover" />
                    <WatermarkOverlay />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-navy">{p.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.location?.locality ? `${p.location.locality}, ` : ""}{p.location?.city ?? ""} · Listed {fmtDate(p.createdAt)}
                        </div>
                      </div>
                      <div className="shrink-0 font-display text-sm font-bold text-accent">{fmtPrice(p.price)}</div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone={listingTone[p.status] ?? "default"}>{p.status}</Badge>
                      {p.hasPendingEdit && (
                        <Badge tone="warm">
                          <span className="flex items-center gap-1"><Clock size={11} /> Changes under review</span>
                        </Badge>
                      )}
                      <Badge tone="new">
                        <span className="flex items-center gap-1"><Eye size={11} /> {p.views} views</span>
                      </Badge>
                      {p._count && (
                        <>
                          <Badge tone="hot">{p._count.leads} interested</Badge>
                          <Badge tone="warm">{p._count.favoritedBy} wishlisted</Badge>
                        </>
                      )}
                      {p.bhk && <Badge tone="default">{p.bhk}</Badge>}
                      {boostIsActive(p.boostTier ?? null, p.boostExpiry ?? null) && (
                        <Badge tone="hot">
                          <span className="flex items-center gap-1">
                            <Rocket size={11} /> Boosted till {fmtDate(p.boostExpiry!)}
                          </span>
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => setBoostTarget({ id: p.id, title: p.title })}
                        disabled={p.status !== "Active"}
                        title={
                          p.status === "Active"
                            ? "Move to Page 1, 2 or 3 instantly"
                            : "Only an active listing can be boosted"
                        }
                        className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
                      >
                        <Rocket size={11} />
                        {boostIsActive(p.boostTier ?? null, p.boostExpiry ?? null) ? "Extend Boost" : "Boost"}
                      </button>
                      {p.type === "PG" && (
                        <button
                          onClick={() => setMediaPackageTarget({ id: p.id, title: p.title })}
                          className="inline-flex items-center gap-1 rounded-md border border-accent px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/5"
                        >
                          <Camera size={11} /> Get Professional Media
                        </button>
                      )}
                      {p.status === "Pending" && (
                        <Link
                          href="/pricing"
                          className="rounded-md bg-mid-blue px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                        >
                          Upgrade to Activate
                        </Link>
                      )}
                      <Link
                        href={`/properties/${p.slug}`}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => setModifyTarget(p.id)}
                        disabled={p.hasPendingEdit}
                        title={p.hasPendingEdit ? "Changes are already awaiting review" : undefined}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent disabled:opacity-50"
                      >
                        <Pencil size={11} /> Modify
                      </button>
                      {p.status === "Active" ? (
                        <button
                          onClick={() => setStatus(p.id, "Inactive", "Listing deactivated")}
                          disabled={updateStatus.isPending}
                          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-accent hover:text-accent disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => setStatus(p.id, "Active", "Listing reactivated")}
                          disabled={updateStatus.isPending}
                          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:border-emerald-500 disabled:opacity-50"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                    {/* A listing credit from the seller's plan is consumed only
                        once a listing is approved & live (Active) — LA-321. */}
                    {p.status === "Active" && (
                      <div
                        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent"
                        title="One listing credit from your plan was used to publish this listing."
                      >
                        <Coins size={12} /> 1 credit consumed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
