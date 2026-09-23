"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  LockKeyhole,
  Lock,
  Users,
  CheckCircle2,
  Mail,
  Phone,
  Sparkles,
  MessageCircle,
  ArrowUp,
  ArrowDown,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth";
import { ListingInsights } from "@/components/ListingInsights";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Head } from "./shared";

// Indian numbers are stored as 10 digits; wa.me needs the country code and
// no punctuation. Prefilled with a seller-side opener since the seller is
// the one reaching out to a buyer's verified enquiry.
function realLeadWaHref(phone: string, propertyTitle?: string) {
  const digits = phone.replace(/\D/g, "");
  const withCc = digits.length === 10 ? `91${digits}` : digits;
  const text = `Hi, I saw your enquiry${propertyTitle ? ` about ${propertyTitle}` : ""} on NxtSft.`;
  return `https://wa.me/${withCc}?text=${encodeURIComponent(text)}`;
}

// Live-activity chip on a sample card. tone comes from the server preview.
function ActivityPill({
  activity,
}: {
  activity: { tone: "online" | "offline" | "requested"; headline: string; detail: string };
}) {
  const tone =
    activity.tone === "online"
      ? "bg-green-50 text-green-700"
      : activity.tone === "offline"
        ? "bg-slate-100 text-slate-600"
        : "bg-amber-50 text-amber-800";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      {activity.tone === "online" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" aria-hidden />
      )}
      {activity.headline} • {activity.detail}
    </span>
  );
}

export function SellerLeadsTab() {
  return (
    <Suspense fallback={<p>Loading leads…</p>}>
      <SellerLeadsContent />
    </Suspense>
  );
}

function SellerLeadsContent() {
  const params = useSearchParams();
  const propertyId = params.get("propertyId") || undefined;
  const { session } = useAuth();
  const eligible = session?.role === "home-seller" || session?.role === "agent";
  const query = trpc.sellerInsights.leads.useQuery(
    { propertyId },
    { enabled: eligible, refetchOnMount: "always" },
  );
  const dummyQuery = trpc.sellerInsights.dummyLeads.useQuery(
    { propertyId },
    { enabled: eligible, refetchOnMount: "always" },
  );
  const [upgradeProperty, setUpgradeProperty] = useState<string | null>(null);
  // Free-user "Upgrade to Premium to send your Number" popup (Popup 1).
  const [showSampleUpgrade, setShowSampleUpgrade] = useState(false);
  // Paid-user confirmation popups after an engagement action (Popup 2A / 2B).
  const [sampleConfirm, setSampleConfirm] = useState<"intent" | "number" | null>(null);
  const [phoneFormFor, setPhoneFormFor] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const utils = trpc.useUtils();
  const share = trpc.sellerInsights.shareSellerContact.useMutation({
    onSuccess: async () => {
      toast.success("Your contact details have been shared with the buyer.");
      await utils.sellerInsights.leads.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const requestMatch = trpc.sellerInsights.requestSampleMatch.useMutation({
    onSuccess: async () => {
      setSampleConfirm("intent");
      await utils.sellerInsights.dummyLeads.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const shareSampleContact = trpc.sellerInsights.shareSampleSellerContact.useMutation({
    onSuccess: async () => {
      setPhoneFormFor(null);
      setSampleConfirm("number");
      await utils.sellerInsights.dummyLeads.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  if (!eligible) return <p>This section is for Home Sellers and Agents.</p>;
  if (query.isError)
    return (
      <p role="alert">
        Unable to load leads: {query.error.message}{" "}
        <button className="underline" onClick={() => query.refetch()}>
          Retry
        </button>
      </p>
    );
  const data = query.data;
  const selected = data?.properties.find((p) => p.id === upgradeProperty);
  const selectedCount =
    data?.items.filter((item) => item.property?.id === upgradeProperty).length ?? 0;
  const pricing = `/pricing?source=masked-leads${upgradeProperty ? `&propertyId=${encodeURIComponent(upgradeProperty)}` : ""}#seller`;
  const samplePricing = `/pricing?source=sample-leads${propertyId ? `&propertyId=${encodeURIComponent(propertyId)}` : ""}#seller`;
  const sampleItems = dummyQuery.data?.items ?? [];
  const paid = dummyQuery.data?.paid ?? false;
  const knowsPlan = dummyQuery.data !== undefined;
  type SampleItem = (typeof sampleItems)[number];
  const sampleGroups = Array.from(
    sampleItems.reduce((groups, item) => {
      const key = item.property.id;
      const group = groups.get(key) ?? { property: item.property, items: [] as SampleItem[] };
      group.items.push(item);
      groups.set(key, group);
      return groups;
    }, new Map<string, { property: SampleItem["property"]; items: SampleItem[] }>()),
  );
  // "<name> and N others" banner copy, derived from the sample set.
  const bannerName = sampleItems[0]?.firstName ?? "A buyer";
  const bannerOthers = Math.max(sampleItems.length - 1, 0);
  const showFreeSticky = knowsPlan && !paid && sampleItems.length > 0;
  return (
    <>
      <Head
        t="Leads"
        s={
          propertyId
            ? (data?.properties[0]?.title ?? "Buyers interested in your listing.")
            : "Online buyer enquiries, contact unlocks, and site visits across your listings."
        }
      />
      {knowsPlan &&
        (paid ? (
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            <Crown size={14} /> Paid User • Premium
          </span>
        ) : (
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
            Free User
          </span>
        ))}
      {propertyId && (
        <Link href="/user-portal#leads" className="ml-2 text-sm text-accent underline">
          All listing leads
        </Link>
      )}
      <ListingInsights propertyId={propertyId} />
      {!data ? (
        <div className="h-48 animate-pulse rounded-xl bg-secondary" />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Users size={18} /> Online buyer request · {data.items.length}
          </div>
          {!data.unlocked && data.items.some((item) => item.leadType !== "real") && (
            <p className="mb-5 text-sm text-muted-foreground">
              Verified buyer enquiries are free to contact directly. Activate a seller plan to
              unlock older or unlinked requests and to share your own contact with buyers.
            </p>
          )}
          {!data.items.length ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              <p>No verified buyer requests yet.</p>
              {data.unlocked && (
                <Link
                  href="/pricing#boost"
                  className="mt-4 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Improve My Listing
                </Link>
              )}
              {!data.unlocked && (
                <p className="mt-2 text-sm">Only actual enquiries and visits appear here.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {data.items.map((item) => {
                const isReal = item.leadType === "real";
                const showContact = isReal || data.unlocked;
                return (
                  <article
                    key={`${item.kind}-${item.id}`}
                    className="rounded-xl border border-border bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        aria-hidden
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-semibold text-white"
                      >
                        {item.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-display text-lg font-bold text-navy">{item.name}</h3>
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${item.status === "Visit cancelled" ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-800"}`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.kind === "enquiry"
                            ? "Enquiry"
                            : item.kind === "visit"
                              ? "Site visit"
                              : "Contact unlock"}{" "}
                          · {new Date(item.createdAt).toLocaleString("en-IN")}
                        </p>
                        <div className="mt-3 space-y-1 text-sm">
                          {item.phone &&
                            (showContact ? (
                              <a
                                className="block font-semibold text-accent"
                                href={`tel:${item.phone}`}
                              >
                                {item.phone}
                              </a>
                            ) : (
                              <p>{item.phone}</p>
                            ))}
                          {item.email &&
                            (showContact ? (
                              <a
                                className="block break-all text-accent"
                                href={`mailto:${item.email}`}
                              >
                                {item.email}
                              </a>
                            ) : (
                              <p>{item.email}</p>
                            ))}
                          {showContact && !item.phone && !item.email && (
                            <p>No contact details provided.</p>
                          )}
                        </div>
                        {isReal && item.phone && (
                          <a
                            href={realLeadWaHref(item.phone, item.property?.title)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
                          >
                            <MessageCircle size={16} /> WhatsApp
                          </a>
                        )}
                        {item.property && (
                          <p className="mt-3 text-xs text-muted-foreground">
                            {item.property.title}
                            {item.property.location?.city ? ` · ${item.property.location.city}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 border-t border-border pt-4">
                      {!showContact ? (
                        <button
                          onClick={() => setUpgradeProperty(item.property!.id)}
                          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white"
                        >
                          View Contact
                        </button>
                      ) : !data.unlocked ? null : item.shared ? (
                        <p className="flex items-center gap-2 text-sm text-teal-700">
                          <CheckCircle2 size={17} /> Your contact details have been shared with the
                          buyer.
                        </p>
                      ) : (
                        <>
                          <button
                            disabled={!!item.shareUnavailable || share.isPending}
                            onClick={() => share.mutate({ kind: item.kind, id: item.id })}
                            className="w-full rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {share.isPending && share.variables?.id === item.id
                              ? "Sharing…"
                              : "Share My Contact With Buyer"}
                          </button>
                          {item.shareUnavailable && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {item.shareUnavailable}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
      {!!sampleGroups.length && (
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-700">
            <Sparkles size={18} /> Recent buyer requests
          </div>
          {/* Engagement banner. Copy is intentionally punchy per product spec. */}
          {paid ? (
            <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
              <span className="font-semibold">You are Premium!</span> {bannerName}
              {bannerOthers > 0 ? ` and ${bannerOthers} others` : ""} are active now. Engage with
              buyers now.
            </div>
          ) : (
            <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <span className="font-semibold">{bannerName}</span>
              {bannerOthers > 0 ? ` and ${bannerOthers} others` : ""} requested to connect. They are
              active now. Free users can&apos;t share contact directly.
            </div>
          )}
          <div className="space-y-8">
            {sampleGroups.map(([groupPropertyId, group]) => (
              <section
                key={groupPropertyId}
                aria-label={`Recent buyer requests for ${group.property.title}`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-navy">
                      {group.property.title}
                    </h2>
                    {group.property.location?.city && (
                      <p className="text-xs text-muted-foreground">{group.property.location.city}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    {group.items.length} buyer requests
                  </span>
                </div>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          aria-hidden
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500 text-lg font-semibold text-white"
                        >
                          {item.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-display text-base font-bold text-navy">
                              {item.name}
                            </h3>
                            <ActivityPill activity={item.activity} />
                          </div>
                          <p className="mt-1 text-sm font-medium text-muted-foreground">
                            {item.requestType}
                          </p>
                          <div className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                            {item.phone && (
                              <p className="flex items-center gap-2">
                                <Phone size={14} />
                                <span className={paid ? "" : "select-none blur-[3px]"}>
                                  {item.phone}
                                </span>
                                <Lock size={12} className="text-amber-600" />
                              </p>
                            )}
                            {item.email && (
                              <p className="flex min-w-0 items-center gap-2 truncate">
                                <Mail size={14} /> {item.email}
                              </p>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-medium text-navy">
                            Buyer Budget range: {item.budget}
                          </p>
                          <p className="mt-1 text-[11px] font-medium text-amber-700">
                            Recent Requests • Valid for 24 Hours
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-amber-200 pt-3">
                        {!paid ? (
                          // FREE: locked card → Popup 1
                          <button
                            onClick={() => setShowSampleUpgrade(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-amber-600/90 px-4 py-2.5 text-sm font-semibold text-white"
                          >
                            <Lock size={15} /> Upgrade to View
                          </button>
                        ) : item.sellerContactShared ? (
                          <p className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                            <CheckCircle2 size={17} /> Number Shared • Waiting for Buyer Call
                          </p>
                        ) : item.matchRequested ? (
                          <p className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                            <CheckCircle2 size={17} /> Intent Shared • Pending • Waiting for Buyer
                            Acceptance
                          </p>
                        ) : phoneFormFor === item.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              shareSampleContact.mutate({ id: item.id, phone: phoneInput });
                            }}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <input
                              type="tel"
                              required
                              value={phoneInput}
                              onChange={(e) => setPhoneInput(e.target.value)}
                              placeholder="10-digit mobile number"
                              className="rounded-lg border border-border px-3 py-2 text-sm"
                            />
                            <button
                              type="submit"
                              disabled={shareSampleContact.isPending}
                              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              {shareSampleContact.isPending ? "Sending…" : "Submit"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhoneFormFor(null)}
                              className="text-sm text-muted-foreground underline"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          // PAID: UP = Share Intent (outline), DOWN = Share Your Number (solid teal)
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => requestMatch.mutate({ id: item.id })}
                              disabled={requestMatch.isPending}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-600 px-4 py-2.5 text-sm font-semibold text-teal-700 disabled:opacity-50"
                            >
                              <ArrowUp size={15} />
                              {requestMatch.isPending && requestMatch.variables?.id === item.id
                                ? "Sending…"
                                : "Share Intent"}
                            </button>
                            <button
                              onClick={() => {
                                const acct = session?.phone?.replace(/\D/g, "").slice(-10) ?? "";
                                if (acct.length === 10) {
                                  shareSampleContact.mutate({ id: item.id, phone: acct });
                                } else {
                                  setPhoneInput(acct);
                                  setPhoneFormFor(item.id);
                                }
                              }}
                              disabled={shareSampleContact.isPending}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              <ArrowDown size={15} /> Share Your Number
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
          {/* Bottom legend (paid only), aligned two-up per product spec. */}
          {paid && (
            <div className="mt-6 grid gap-4 rounded-xl border border-border bg-secondary/40 p-4 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-teal-600 text-teal-700">
                  <ArrowUp size={15} />
                </span>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-navy">Share Intent</span> — ask the buyer to
                  reveal their full number. It appears here if the buyer accepts.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
                  <ArrowDown size={15} />
                </span>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-navy">Share Your Number</span> — send your
                  number to the buyer so they can contact you on WhatsApp &amp; SMS instantly.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Sticky footer upsell (free users only). */}
      {showFreeSticky && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-amber-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-navy">
              Upgrade to Premium to share your contact instantly
            </p>
            <Link
              href={samplePricing}
              className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              View Seller Plans →
            </Link>
          </div>
        </div>
      )}
      {/* Popup 1: free-user upgrade prompt for sample cards. */}
      <Dialog open={showSampleUpgrade} onOpenChange={setShowSampleUpgrade}>
        <DialogContent className="sm:max-w-md">
          <LockKeyhole className="text-amber-600" size={28} />
          <DialogTitle>Upgrade to Premium to send your Number</DialogTitle>
          <DialogDescription>
            You have {sampleItems.length} Recent Buyer Request
            {sampleItems.length === 1 ? "" : "s"} valid for 24 Hours only. Free plan can&apos;t share
            contact. Upgrade now before requests expire.
          </DialogDescription>
          <Link
            href={samplePricing}
            className="rounded-lg bg-amber-600 px-5 py-3 text-center font-semibold text-white"
          >
            View Seller Plans →
          </Link>
          <button
            onClick={() => setShowSampleUpgrade(false)}
            className="rounded-lg border border-border px-5 py-3 text-sm"
          >
            Maybe Later
          </button>
        </DialogContent>
      </Dialog>
      {/* Popup 2A / 2B: paid-user engagement confirmations. */}
      <Dialog open={sampleConfirm !== null} onOpenChange={(open) => !open && setSampleConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <CheckCircle2 className="text-teal-600" size={28} />
          {sampleConfirm === "intent" ? (
            <>
              <DialogTitle>Intent Shared!</DialogTitle>
              <DialogDescription>
                Buyer requested privacy on number masking. Share your intent to show full number. If
                buyer accepts your request, number will be shown here.
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle>Your Numbers Shared With Buyer!</DialogTitle>
              <DialogDescription>
                Your numbers shared with buyer. Wait for his call, buyer will contact you on WhatsApp
                &amp; SMS instantly.
              </DialogDescription>
            </>
          )}
          <button
            onClick={() => setSampleConfirm(null)}
            className="rounded-lg bg-teal-600 px-5 py-3 text-center text-sm font-semibold text-white"
          >
            Got it
          </button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={upgradeProperty !== null}
        onOpenChange={(open) => {
          if (!open) setUpgradeProperty(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <LockKeyhole className="text-accent" size={28} />
          <DialogTitle>Unlock Buyer Contacts</DialogTitle>
          <DialogDescription>
            {selectedCount} buyer request{selectedCount === 1 ? "" : "s"} for your property
            {selected?.location?.city ? ` in ${selected.location.city}` : ""}. Free users can&apos;t
            see contact details. Activate a seller plan to connect.
          </DialogDescription>
          <Link
            href={pricing}
            className="rounded-lg bg-accent px-5 py-3 text-center font-semibold text-white"
          >
            View Seller Plans →
          </Link>
          <button
            onClick={() => setUpgradeProperty(null)}
            className="rounded-lg border border-border px-5 py-3 text-sm"
          >
            Maybe Later
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
