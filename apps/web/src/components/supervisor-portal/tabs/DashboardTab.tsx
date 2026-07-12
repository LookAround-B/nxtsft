"use client";
import { StatCard } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { PageHead } from "./shared";

export function DashboardTab() {
  const statsQ = trpc.leads.stats.useQuery();
  const s = statsQ.data;
  const openLeads = s ? s.hot + s.warm + s.cold + s.new : 0;
  const conversionRate = s && s.total > 0 ? Math.round((s.converted / s.total) * 100) : 0;

  return (
    <>
      <PageHead title="Team Dashboard" sub="Live lead pipeline across your team." />

      {/* Lead pipeline — real, from leads.stats */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Team Open Leads" value={s ? String(openLeads) : "…"} sub="hot + warm + cold + new" />
        <StatCard label="Hot Leads" value={s ? String(s.hot) : "…"} sub="need action" accent="text-red-500" />
        <StatCard label="Converted" value={s ? String(s.converted) : "…"} sub="closed deals" accent="text-emerald-600" />
        <StatCard label="Conversion Rate" value={s ? `${conversionRate}%` : "…"} sub={s ? `of ${s.total} leads` : ""} />
        <StatCard label="Total Leads" value={s ? String(s.total) : "…"} sub="all-time" />
        <StatCard label="Lost" value={s ? String(s.lost) : "…"} sub="closed-lost" />
      </div>
    </>
  );
}
