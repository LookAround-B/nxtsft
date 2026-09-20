"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LockKeyhole, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth";
import { ListingInsights } from "@/components/ListingInsights";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Head } from "./shared";

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
  const [upgradeProperty, setUpgradeProperty] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const share = trpc.sellerInsights.shareSellerContact.useMutation({
    onSuccess: async () => {
      toast.success("Your contact details have been shared with the buyer.");
      await utils.sellerInsights.leads.invalidate();
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
  return (
    <>
      <Head
        t="Leads"
        s={
          propertyId
            ? (data?.properties[0]?.title ?? "Buyers interested in your listing.")
            : "Buyer enquiries, contact unlocks, and site visits across your listings."
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
            <Users size={18} /> Buyer requests · {data.items.length}
          </div>
          {!data.unlocked && data.items.length > 0 && (
            <p className="mb-5 text-sm text-muted-foreground">
              Free users can preview requests. Activate a seller plan to view buyer contacts and
              share your details.
            </p>
          )}
          {!data.items.length ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No buyer requests yet. New enquiries and visits will appear here.
            </div>
          ) : (
            <div className="space-y-4">
              {data.items.map((item) => (
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
                          (data.unlocked ? (
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
                          (data.unlocked ? (
                            <a
                              className="block break-all text-accent"
                              href={`mailto:${item.email}`}
                            >
                              {item.email}
                            </a>
                          ) : (
                            <p>{item.email}</p>
                          ))}
                        {data.unlocked && !item.phone && !item.email && (
                          <p>No contact details provided.</p>
                        )}
                      </div>
                      {item.property && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          {item.property.title}
                          {item.property.location?.city ? ` · ${item.property.location.city}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 border-t border-border pt-4">
                    {!data.unlocked ? (
                      <button
                        onClick={() => setUpgradeProperty(item.property!.id)}
                        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white"
                      >
                        View Contact
                      </button>
                    ) : item.shared ? (
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
              ))}
            </div>
          )}
        </>
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
