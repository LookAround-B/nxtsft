"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Building2, Eye, Clock, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Badge, Section } from "@/components/portal/PortalShell";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Head, fmtDate, fmtPrice } from "./shared";

type ListingItem = {
  id: string;
  slug: string;
  title: string;
  status: string;
  views: number;
  price: number;
  bhk: string | null;
  images: string[];
  createdAt: string;
  location: { city: string; locality: string } | null;
  _count?: { leads: number; favoritedBy: number };
  hasPendingEdit?: boolean;
};

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
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => toast("Boost is a paid upgrade — coming soon")}
                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                      >
                        Boost
                      </button>
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
