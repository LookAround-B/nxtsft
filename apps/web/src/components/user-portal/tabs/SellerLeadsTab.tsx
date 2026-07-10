"use client";
import Link from "next/link";
import { Users, Phone, Mail, MapPin } from "lucide-react";
import { Badge, Section } from "@/components/portal/PortalShell";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Head, fmtDate } from "./shared";

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  interest: string | null;
  source: string | null;
  status: string;
  value: number | null;
  createdAt: string;
  property: { id: string; title: string; slug: string } | null;
};

type Unlock = {
  buyer: { id: string; name: string; phone: string } | null;
  property: { id: string; title: string; slug: string } | null;
  createdAt: string;
};

// Lead status → Badge tone. Falls back to "default" for anything unmapped.
const leadTone: Record<string, "success" | "warm" | "cold" | "new" | "hot" | "default"> = {
  Hot: "hot",
  Warm: "warm",
  Cold: "cold",
  New: "new",
  Converted: "success",
  Lost: "default",
};

export function SellerLeadsTab() {
  const { session } = useAuth();
  const leadsQ = trpc.users.sellerLeads.useQuery(undefined, {
    enabled: session?.role === "home-seller",
  });
  const unlocksQ = trpc.users.sellerUnlocks.useQuery(undefined, {
    enabled: session?.role === "home-seller",
  });

  if (session?.role !== "home-seller") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Users size={40} className="mb-4 text-muted-foreground/30" />
        <p className="text-sm font-semibold text-navy">This section is for Home Sellers</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Leads are buyers who enquired on your listings.
        </p>
      </div>
    );
  }

  const enquiries = (leadsQ.data ?? []) as unknown as Lead[];
  const unlocks = (unlocksQ.data ?? []) as unknown as Unlock[];

  // Contact-unlock events are leads too (buyer paid a credit to see the owner's
  // number) — merge them into the same list so they don't hide in a section
  // below the fold. LA-327: reporter expected unlocks to show under "Leads".
  const unlockLeads: Lead[] = unlocks
    .filter((u) => u.buyer)
    .map((u) => ({
      id: `unlock-${u.property?.id ?? "x"}-${u.buyer!.id}-${u.createdAt}`,
      name: u.buyer!.name,
      phone: u.buyer!.phone,
      email: null,
      city: null,
      interest: null,
      source: "Contact Unlock",
      status: "New",
      value: null,
      createdAt: u.createdAt,
      property: u.property,
    }));

  const items = [...enquiries, ...unlockLeads].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <>
      <Head t="Leads" s="Buyers who enquired or unlocked contact on your listings." />
      <Section title={items.length ? `${items.length} lead${items.length > 1 ? "s" : ""}` : "Leads"}>
        {leadsQ.isLoading || unlocksQ.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-secondary/40" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/20 py-14 text-center">
            <Users size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No leads yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              When a buyer enquires or unlocks contact on one of your listings, they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((l) => (
              <div key={l.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-navy">{l.name}</span>
                      <Badge tone={leadTone[l.status] ?? "default"}>{l.status}</Badge>
                      {l.source && <Badge tone="default">{l.source}</Badge>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {l.phone && (
                        <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 hover:text-accent hover:underline">
                          <Phone size={11} /> {l.phone}
                        </a>
                      )}
                      {l.email && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Mail size={11} /> {l.email}
                        </span>
                      )}
                      {l.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} /> {l.city}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    {fmtDate(l.createdAt)}
                  </div>
                </div>
                {(l.interest || l.property) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
                    {l.interest && (
                      <span className="text-muted-foreground">
                        Interested in <span className="font-medium text-navy">{l.interest}</span>
                      </span>
                    )}
                    {l.property && (
                      <Link
                        href={`/properties/${l.property.slug}`}
                        className="ml-auto rounded-md border border-border px-2.5 py-1 font-semibold text-navy transition hover:border-accent hover:text-accent"
                      >
                        {l.property.title}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
