"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LockKeyhole, Users, CheckCircle2, Mail, Phone, Sparkles, MessageCircle } from "lucide-react";
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
      toast.success("Request sent — NxtSft will reach out if a verified buyer matches.");
      await utils.sellerInsights.dummyLeads.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const shareSampleContact = trpc.sellerInsights.shareSampleSellerContact.useMutation({
    onSuccess: async () => {
      toast.success("Thanks — NxtSft will contact you if a verified buyer matches.");
      setPhoneFormFor(null);
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
  const sampleItems = dummyQuery.data?.items ?? [];
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
      {propertyId && (
        <Link href="/user-portal#leads" className="text-sm text-accent underline">
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
            <Sparkles size={18} /> Sample interest previews
          </div>
          <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
            These are illustrative previews of the interest data a seller plan helps you manage.
            They are not verified buyer requests — no one here has accepted, received, or
            withdrawn anything. Use Share Intent or Share My Number below and NxtSft will contact
            you if a genuine, verified buyer matches. Verified enquiries appear above and can be
            contacted directly, free of charge.
          </p>
          <div className="space-y-8">
            {sampleGroups.map(([propertyId, group]) => (
              <section key={propertyId} aria-label={`Sample interest for ${group.property.title}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-navy">{group.property.title}</h2>
                    {group.property.location?.city && <p className="text-xs text-muted-foreground">{group.property.location.city}</p>}
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    {group.items.length} sample previews
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
                            <span className="rounded-full bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-800">
                              SAMPLE · {item.relativeTime}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-muted-foreground">
                            {item.requestType}
                          </p>
                          <div className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                            {item.phone && (
                              <p className="flex items-center gap-2">
                                <Phone size={14} /> {item.phone}
                              </p>
                            )}
                            {item.email && (
                              <p className="flex min-w-0 items-center gap-2 truncate">
                                <Mail size={14} /> {item.email}
                              </p>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-medium text-navy">Sample budget: {item.budget}</p>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-amber-200 pt-3">
                        {item.matchRequested || item.sellerContactShared ? (
                          <p className="flex items-center gap-2 text-sm text-teal-700">
                            <CheckCircle2 size={17} /> NxtSft has received your request and will
                            contact you if a verified buyer matches.
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
                              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => requestMatch.mutate({ id: item.id })}
                              disabled={requestMatch.isPending}
                              className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              {requestMatch.isPending && requestMatch.variables?.id === item.id
                                ? "Sending…"
                                : "Share Intent"}
                            </button>
                            <button
                              onClick={() => {
                                setPhoneInput(session?.phone?.replace(/\D/g, "").slice(-10) ?? "");
                                setPhoneFormFor(item.id);
                              }}
                              className="rounded-lg border border-amber-600 px-4 py-2.5 text-sm font-semibold text-amber-700"
                            >
                              Share My Number
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
        </div>
      )}
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
