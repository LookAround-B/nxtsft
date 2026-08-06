"use client";
import { Building2 } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { Head, type DbLead } from "./shared";

// Properties this rep created for their customers. The rep never owns them —
// each one sits on the customer's account and is reached through the lead, so
// the lead list is the source of truth here.

const statusTone: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Inactive: "bg-muted text-muted-foreground",
};

export function ListingsTab() {
  const leadsQ = trpc.leads.list.useQuery({ limit: 100 });
  const withProperty = ((leadsQ.data?.items ?? []) as DbLead[]).filter((l) => l.property);

  return (
    <>
      <Head t="Listings" s="Properties you listed for your customers." />
      <Section title="Customer listings">
        {leadsQ.isLoading ? (
          <div className="space-y-4 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2 border-b border-border pb-4">
                <div className="h-4 w-56 rounded bg-secondary" />
                <div className="h-3 w-72 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : withProperty.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Building2 size={32} className="text-muted-foreground/40" />
            <p className="max-w-md text-sm text-muted-foreground">
              You haven&apos;t listed a property for a customer yet. Open a lead in{" "}
              <span className="font-semibold text-navy">My Leads</span> and use{" "}
              <span className="font-semibold text-navy">List their property</span> — the listing is
              created on the customer&apos;s own account and goes live when they pay.
            </p>
            <a
              href="/list"
              className="rounded-md bg-accent px-4 py-2 text-xs font-bold text-white hover:opacity-90"
            >
              List a property
            </a>
          </div>
        ) : (
          withProperty.map((l) => (
            <div key={l.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-border py-4 last:border-0">
              <div className="min-w-0">
                <a
                  href={`/properties/${l.property!.slug}`}
                  className="font-semibold text-navy hover:underline"
                >
                  {l.property!.title}
                </a>
                <div className="mt-1 text-xs text-muted-foreground">
                  {l.name} · {l.phone}
                  {l.plan ? ` · ${l.plan}` : ""}
                  {l.amount ? ` · ₹${l.amount.toLocaleString("en-IN")}` : ""}
                </div>
                {l.expiryDate && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Valid till {new Date(l.expiryDate).toLocaleDateString("en-IN")}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    statusTone[l.property!.status] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {l.property!.status === "Pending" ? "Draft — awaiting payment" : l.property!.status}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
                  {l.paymentStatus ?? "Pending"}
                </span>
              </div>
            </div>
          ))
        )}
      </Section>
    </>
  );
}
