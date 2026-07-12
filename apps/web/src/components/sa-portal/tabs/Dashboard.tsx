"use client";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";

export function Dashboard() {
  const statsQ = trpc.admin.stats.useQuery();
  const saStatsQ = trpc.superAdmin.stats.useQuery();
  const healthQ = trpc.superAdmin.systemHealth.useQuery();
  const s = statsQ.data;
  const sa = saStatsQ.data;
  const health = healthQ.data;

  const fmtUptime = (sec: number) => {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const revenue = sa
    ? sa.totalRevenue >= 1_00_00_000
      ? `₹${(sa.totalRevenue / 1_00_00_000).toFixed(2)} Cr`
      : sa.totalRevenue >= 1_00_000
        ? `₹${(sa.totalRevenue / 1_00_000).toFixed(2)} L`
        : `₹${sa.totalRevenue.toLocaleString("en-IN")}`
    : "…";

  return (
    <>
      {/* Real platform KPIs */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Listings" value={s ? s.totalProperties.toLocaleString() : "…"} sub="all listings" />
        <StatCard label="Active Leads" value={s ? s.totalLeads.toLocaleString() : "…"} sub="in pipeline" />
        <StatCard label="Revenue" value={revenue} sub="payments to date" />
        <StatCard label="Total Users" value={sa ? sa.usersCount.toLocaleString() : "…"} sub="registered" />
        <StatCard label="Active Sessions" value={sa ? sa.activeSessionsCount.toLocaleString() : "…"} sub="logged in now" />
        <StatCard label="Active Listings" value={s ? s.activeListings.toLocaleString() : "…"} sub="approved" />
      </div>

      <div className="mt-6">
        <Section title="System Health" action={health ? <Badge tone="success">{health.status}</Badge> : null}>
          {([
            ["Uptime", health ? fmtUptime(health.uptimeSeconds) : "…", "ok"],
            ["Database", health?.databaseConnection ?? "…", health?.databaseConnection === "Connected" ? "ok" : "warn"],
            ["Cache", health?.cacheConnection ?? "…", health?.cacheConnection === "Connected" ? "ok" : "warn"],
            ["Razorpay", health?.services.razorpay ?? "…", health?.services.razorpay === "Online" ? "ok" : "warn"],
            ["Cloudflare R2", health?.services.cloudflareR2 ?? "…", health?.services.cloudflareR2 === "Online" ? "ok" : "warn"],
            ["SMS Gateway", health?.services.smsGateway ?? "…", health?.services.smsGateway === "Online" ? "ok" : "warn"],
          ] as const).map(([l, v, st]) => (
            <div
              key={l}
              className="flex items-center justify-between border-b border-border py-3 last:border-0"
            >
              <span className="text-sm">{l}</span>
              <span className={`font-mono text-sm font-bold ${st === "warn" ? "text-amber-600" : "text-emerald-600"}`}>
                {v}
              </span>
            </div>
          ))}
        </Section>
      </div>
    </>
  );
}
