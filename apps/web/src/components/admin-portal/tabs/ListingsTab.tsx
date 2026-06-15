"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Mail, Phone } from "lucide-react";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { getPendingListings, updateListingStatus as persistListingStatus } from "@/lib/listings";
import { PageHead } from "./PageHead";

type ListingItem = {
  id: string;
  title: string;
  image: string;
  builder: string;
  city: string;
  priceLabel: string;
  bhk: string;
  status: "Pending" | "Approved" | "Rejected";
  isUserSubmission?: boolean;
  isDbProperty?: boolean;
  rera?: string | null;
  locality?: string;
  listerEmail?: string;
  listerPhone?: string;
  submittedAt?: string;
  purpose?: string;
  area?: string;
  interested?: number;
  wishlisted?: number;
};

type RawProp = {
  id: string;
  title: string;
  images: string[];
  owner: { name: string } | null;
  location: { city: string } | null;
  price: number;
  bhk: string | null;
  status: string;
  rera: string | null;
  slug: string;
  _count?: { leads: number; favoritedBy: number };
};

export function ListingsTab() {
  const dbListingsQ = trpc.admin.properties.list.useQuery({ limit: 50 });
  const approveMutation = trpc.admin.properties.approve.useMutation({
    onSuccess: () => {
      void dbListingsQ.refetch();
      toast.success("Property approved and set to Active.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const [localItems, setLocalItems] = useState<ListingItem[]>([]);

  useEffect(() => {
    const userSubs: ListingItem[] = getPendingListings().map((l) => ({
      id: l.id,
      title: l.title || `${l.bhk} ${l.propertyType} in ${l.city}`,
      image: "",
      builder: l.listerName,
      city: l.city,
      priceLabel: `₹${l.price}`,
      bhk: l.bhk,
      status:
        l.status === "pending" ? "Pending" : l.status === "approved" ? "Approved" : "Rejected",
      isUserSubmission: true,
      locality: l.locality,
      listerEmail: l.listerEmail,
      listerPhone: l.listerPhone,
      submittedAt: l.submittedAt,
      purpose: l.purpose,
      area: l.area,
    }));
    setLocalItems(userSubs);
  }, []);

  const dbItems: ListingItem[] = ((dbListingsQ.data?.items ?? []) as RawProp[]).map((p) => ({
    id: p.id,
    title: p.title,
    image: p.images?.[0] ?? "",
    builder: p.owner?.name ?? "",
    city: p.location?.city ?? "",
    priceLabel: p.price >= 1e7
      ? `₹${(p.price / 1e7).toFixed(2)} Cr`
      : p.price >= 1e5
      ? `₹${(p.price / 1e5).toFixed(1)} L`
      : `₹${p.price.toLocaleString("en-IN")}`,
    bhk: p.bhk ?? "",
    status: (p.status === "Active" ? "Approved" : p.status === "Sold" || p.status === "Rented" ? "Approved" : "Pending") as "Pending" | "Approved" | "Rejected",
    isDbProperty: true,
    rera: p.rera,
    interested: p._count?.leads ?? 0,
    wishlisted: p._count?.favoritedBy ?? 0,
  }));

  const items = [...localItems, ...dbItems];

  const approve = (it: ListingItem) => {
    if (it.isUserSubmission) {
      setLocalItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, status: "Approved" } : x)));
      persistListingStatus(it.id, "approved");
      toast.success(`Approved: ${it.title}`);
    } else {
      approveMutation.mutate({ id: it.id });
    }
  };

  const reject = (it: ListingItem) => {
    if (it.isUserSubmission) {
      setLocalItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, status: "Rejected" } : x)));
      persistListingStatus(it.id, "rejected");
    }
    toast.error(`Rejected: ${it.title}`);
  };

  const counts = {
    pending: items.filter((i) => i.status === "Pending").length,
    approved: items.filter((i) => i.status === "Approved").length,
    rejected: items.filter((i) => i.status === "Rejected").length,
    user: items.filter((i) => i.isUserSubmission).length,
  };

  return (
    <>
      <PageHead
        title="Listings Approvals"
        subtitle="Moderate property submissions before they go live."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Pending"
          value={String(counts.pending)}
          sub="Awaiting review"
          accent="text-amber-600"
        />
        <StatCard label="Approved" value={String(counts.approved)} sub="Live on site" />
        <StatCard
          label="Rejected"
          value={String(counts.rejected)}
          sub="Needs re-submission"
          accent="text-accent"
        />
        <StatCard
          label="User Submissions"
          value={String(counts.user)}
          sub="From /list form"
          accent="text-blue-600"
        />
      </div>
      <Section title="All Submissions">
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <div
              key={it.id}
              className={`rounded-xl border p-4 ${it.isUserSubmission ? "border-blue-200 bg-blue-50/30" : "border-border"}`}
            >
              <div className="flex gap-3">
                {it.image ? (
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={it.image}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid h-20 w-28 shrink-0 place-items-center rounded-lg bg-navy/8 text-xs font-semibold text-navy/40">
                    No image
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-1.5">
                    {it.isUserSubmission && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        User Submission
                      </span>
                    )}
                    <Badge
                      tone={
                        it.status === "Approved"
                          ? "success"
                          : it.status === "Rejected"
                            ? "hot"
                            : "warm"
                      }
                    >
                      {it.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-navy">{it.title}</div>
                  <div className="text-xs text-muted-foreground">{it.builder}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-navy">
                      {it.city}
                    </span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-navy">
                      {it.priceLabel}
                    </span>
                    {it.bhk && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-semibold text-navy">
                        {it.bhk}
                      </span>
                    )}
                    {it.purpose && (
                      <span className="rounded bg-accent/10 px-1.5 py-0.5 font-medium text-accent">
                        For {it.purpose}
                      </span>
                    )}
                    {it.isDbProperty && (
                      <>
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">
                          {it.interested ?? 0} interested
                        </span>
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-600">
                          {it.wishlisted ?? 0} wishlisted
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {it.isUserSubmission && (it.listerEmail || it.listerPhone) && (
                <div className="mt-3 flex flex-wrap gap-3 border-t border-blue-100 pt-3 text-xs text-muted-foreground">
                  {it.listerEmail && (
                    <span className="flex items-center gap-1">
                      <Mail size={11} className="text-accent" />
                      {it.listerEmail}
                    </span>
                  )}
                  {it.listerPhone && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} className="text-accent" />
                      +91 {it.listerPhone}
                    </span>
                  )}
                  {it.submittedAt && (
                    <span className="ml-auto text-[10px]">
                      {new Date(it.submittedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => approve(it)}
                  disabled={it.status === "Approved"}
                  className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  onClick={() => reject(it)}
                  disabled={it.status === "Rejected"}
                  className="rounded-md border border-border px-3 py-1 text-xs font-semibold transition hover:bg-secondary disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
