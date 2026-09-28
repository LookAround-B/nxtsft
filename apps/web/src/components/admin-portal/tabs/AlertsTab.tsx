"use client";
import { useState } from "react";
import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import { StatCard, Section } from "@/components/portal/PortalShell";
import { Pagination } from "@/components/ui/pagination";
import { ListSkeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ROLE_META } from "@/lib/auth";
import { PageHead } from "./PageHead";

type AlertType = "unlock" | "visit" | "enquiry" | "callback";

const TYPE_META: Record<AlertType, { label: string; cls: string }> = {
  unlock: { label: "Unlock Contact", cls: "bg-emerald-100 text-emerald-700" },
  visit: { label: "Site Visit", cls: "bg-blue-100 text-blue-700" },
  enquiry: { label: "Enquiry", cls: "bg-purple-100 text-purple-700" },
  callback: { label: "Callback", cls: "bg-amber-100 text-amber-700" },
};

const roleName = (role: string) => (ROLE_META as Record<string, { label: string }>)[role]?.label ?? role;

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Click Alerts — real buyer actions on listings, straight from the database:
 * contact unlocks, site-visit requests, property enquiries and callback
 * requests. Admin / super-admin only (server-enforced).
 */
export function AlertsTab() {
  const [type, setType] = useState<AlertType | undefined>(undefined);
  const [page, setPage] = useState(1);
  const q = trpc.admin.clickAlerts.useQuery({ type, page }, { placeholderData: keepPreviousData });
  const d = q.data;
  const items = d?.items ?? [];

  const pick = (t: AlertType | undefined) => {
    setType(t);
    setPage(1);
  };

  return (
    <>
      <PageHead
        title="Click Alerts"
        subtitle="Real buyer actions on listings: contact unlocks, site visits, enquiries and callback requests."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        <StatCard label="Last 24 hours" value={q.isLoading ? "…" : String(d?.last24h ?? 0)} sub="all actions" />
        {(Object.keys(TYPE_META) as AlertType[]).map((t) => (
          <StatCard key={t} label={TYPE_META[t].label} value={q.isLoading ? "…" : String(d?.counts[t] ?? 0)} sub="all time" />
        ))}
      </div>

      <Section title="Activity">
        <div className="mb-4 flex flex-wrap gap-2">
          {[undefined, ...(Object.keys(TYPE_META) as AlertType[])].map((t) => (
            <button
              key={t ?? "all"}
              onClick={() => pick(t)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                type === t ? "border-accent bg-accent text-accent-foreground" : "border-border bg-white"
              }`}
            >
              {t ? TYPE_META[t].label : "All"}
            </button>
          ))}
        </div>

        {q.isLoading && <ListSkeleton rows={6} />}
        {!q.isLoading && items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No buyer actions yet.</p>
        )}

        {items.length > 0 && (
          <div className="divide-y divide-border rounded-xl border border-border">
            {items.map((a) => (
              <div key={a.id} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-3">
                <span className={`w-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${TYPE_META[a.type].cls}`}>
                  {TYPE_META[a.type].label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold text-navy">{a.buyerName}</span>
                    {a.buyerPhone && (
                      <a href={`tel:${a.buyerPhone}`} className="text-xs font-bold text-accent hover:underline">
                        {a.buyerPhone}
                      </a>
                    )}
                    {a.buyerRole && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-navy">
                        {roleName(a.buyerRole)}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {a.detail}
                    {a.property && (
                      <>
                        {" · "}
                        <Link
                          href={`/properties/${a.property.slug}`}
                          target="_blank"
                          className="font-semibold text-accent hover:underline"
                        >
                          {a.property.title}
                        </Link>{" "}
                        <span className="font-mono">{a.property.code}</span>
                        {a.property.city && ` · ${a.property.city}`}
                      </>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(a.at)}</span>
              </div>
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={d?.totalPages ?? 1} onPageChange={setPage} />
      </Section>
    </>
  );
}
