"use client";
import Link from "next/link";
import { Calendar, Phone, Clock } from "lucide-react";
import { Badge, Section } from "@/components/portal/PortalShell";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Head } from "./shared";

type Visit = {
  id: string;
  scheduledAt: string;
  status: string;
  notes: string | null;
  property: { id: string; title: string; slug: string; location: { city: string } | null } | null;
  buyer: { id: string; name: string; phone: string | null } | null;
};

// Visit status → Badge tone.
const visitTone: Record<string, "success" | "warm" | "cold" | "new" | "default"> = {
  Scheduled: "new",
  Completed: "success",
  Cancelled: "cold",
  Rescheduled: "warm",
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export function SellerVisitsTab() {
  const { session } = useAuth();
  const visitsQ = trpc.users.sellerVisits.useQuery(undefined, {
    enabled: session?.role === "home-seller",
  });

  if (session?.role !== "home-seller") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Calendar size={40} className="mb-4 text-muted-foreground/30" />
        <p className="text-sm font-semibold text-navy">This section is for Home Sellers</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Visits buyers have booked to see your listings appear here.
        </p>
      </div>
    );
  }

  const items = (visitsQ.data ?? []) as unknown as Visit[];

  return (
    <>
      <Head t="Visits" s="Visits buyers have booked to see your listings." />
      <Section title={items.length ? `${items.length} visit${items.length > 1 ? "s" : ""}` : "Visits"}>
        {visitsQ.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-secondary/40" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/20 py-14 text-center">
            <Calendar size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No visits booked yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              When a buyer schedules a visit to one of your listings, it&apos;ll show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((v) => (
              <div key={v.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-navy">
                        {v.property?.title ?? "Listing"}
                      </span>
                      <Badge tone={visitTone[v.status] ?? "default"}>{v.status}</Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} /> {fmtDateTime(v.scheduledAt)}
                      </span>
                      {v.buyer && (
                        <span className="inline-flex items-center gap-1">
                          {v.buyer.name}
                          {v.buyer.phone && (
                            <>
                              <span className="text-border">·</span>
                              <Phone size={11} /> {v.buyer.phone}
                            </>
                          )}
                        </span>
                      )}
                      {v.property?.location?.city && <span>{v.property.location.city}</span>}
                    </div>
                    {v.notes && <p className="mt-2 text-xs text-muted-foreground">{v.notes}</p>}
                  </div>
                  {v.property && (
                    <Link
                      href={`/properties/${v.property.slug}`}
                      className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
