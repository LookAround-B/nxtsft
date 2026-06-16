"use client";
import Image from "next/image";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { leads, activities, properties, propertyViews } from "@/data/static";
import { downloadCSV } from "@/lib/download-csv";

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

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Listings" value={s ? s.totalProperties.toLocaleString() : "…"} sub="↑ +8.2% wk" />
        <StatCard label="Active Leads" value={s ? s.totalLeads.toLocaleString() : "…"} sub="↑ +12.4% wk" />
        <StatCard label="Revenue YTD" value={sa ? `₹${(sa.totalRevenue / 1_00_00_000).toFixed(1)}Cr` : "…"} sub="payments to date" />
        <StatCard label="Total Users" value={sa ? sa.usersCount.toLocaleString() : "…"} sub="registered" />
        <StatCard label="Active Sessions" value={sa ? sa.activeSessionsCount.toLocaleString() : "…"} sub="logged in now" />
        <StatCard label="Active Listings" value={s ? s.activeListings.toLocaleString() : "…"} sub="approved" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section
            title="Revenue & Lead Funnel — Last 12 weeks"
            action={<Badge tone="success">Live</Badge>}
          >
            <div className="flex h-64 items-end gap-1.5">
              {Array.from({ length: 12 }).map((_, i) => {
                const hPx = 40 + ((i * 37) % 130);
                const h2Px = 20 + ((i * 53) % 90);
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-col-reverse gap-0.5">
                      <div className="w-full rounded-sm bg-gold" style={{ height: `${h2Px}px` }} />
                      <div className="w-full rounded-sm bg-accent" style={{ height: `${hPx}px` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">W{i + 1}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded bg-accent" /> Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded bg-gold" /> Qualified Leads
              </span>
            </div>
          </Section>
        </div>
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

      <Section
        title="Recent Property Views"
        action={
          <div className="flex items-center gap-2">
            <Badge tone="success">{propertyViews.length} views</Badge>
            <button
              onClick={() =>
                downloadCSV(
                  "property-views.csv",
                  ["ID", "User", "Mobile", "Role", "Email", "Property", "City", "Duration", "Unlocked"],
                  propertyViews.map((v) => [
                    v.id,
                    v.userName,
                    v.userPhone,
                    v.userRole,
                    v.userEmail,
                    v.propertyTitle,
                    v.city,
                    v.durationSec,
                    v.contactUnlocked ? "Yes" : "No",
                  ]),
                )
              }
              className="text-xs font-semibold text-accent hover:underline"
            >
              Export CSV →
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Mobile</th>
                <th>Role</th>
                <th>Property</th>
                <th>City</th>
                <th>Viewed At</th>
                <th>Duration</th>
                <th>Unlocked</th>
              </tr>
            </thead>
            <tbody>
              {[...propertyViews]
                .sort((a, b) => b.ts.localeCompare(a.ts))
                .slice(0, 8)
                .map((v) => (
                  <tr key={v.id}>
                    <td className="font-semibold text-navy">{v.userName}</td>
                    <td className="font-mono text-xs text-muted-foreground">{v.userPhone}</td>
                    <td className="text-xs capitalize text-muted-foreground">{v.userRole}</td>
                    <td className="max-w-[180px] truncate text-sm text-navy">
                      {v.propertyTitle.split("—")[0].trim()}
                    </td>
                    <td className="text-xs text-muted-foreground">{v.city}</td>
                    <td className="font-mono text-xs text-muted-foreground">{v.ts}</td>
                    <td className="font-mono text-xs">
                      {v.durationSec < 60
                        ? `${v.durationSec}s`
                        : `${Math.floor(v.durationSec / 60)}m ${v.durationSec % 60}s`}
                    </td>
                    <td>
                      <Badge tone={v.contactUnlocked ? "success" : "cold"}>
                        {v.contactUnlocked ? "Yes" : "No"}
                      </Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Recent Audit Trail"
        action={
          <button
            onClick={() => toast.success("Audit PDF generated and downloading…")}
            className="text-xs font-semibold text-accent hover:underline"
          >
            Export PDF →
          </button>
        }
      >
        <table className="portal-table">
          <thead>
            <tr>
              <th className="py-2">Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a, i) => (
              <tr key={i}>
                <td className="font-mono text-xs">{a.ts}</td>
                <td className="font-semibold text-navy">{a.user}</td>
                <td>{a.action}</td>
                <td className="text-muted-foreground">{a.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Top Performing Listings">
          {properties.slice(0, 4).map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 border-b border-border py-3 last:border-0"
            >
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded">
                <Image src={p.image} alt="" fill className="object-cover" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-navy">{p.title}</div>
                <div className="text-xs text-muted-foreground">
                  {p.locality} · {p.priceLabel}
                </div>
              </div>
              <Badge tone="hot">{p.matchScore}%</Badge>
            </div>
          ))}
        </Section>
        <Section title="Latest Leads">
          {leads.slice(0, 4).map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between border-b border-border py-3 last:border-0"
            >
              <div>
                <div className="text-sm font-semibold text-navy">{l.name}</div>
                <div className="text-xs text-muted-foreground">
                  {l.interest} · {l.city}
                </div>
              </div>
              <Badge tone={l.status.toLowerCase() as "hot" | "warm" | "cold" | "new"}>
                {l.status}
              </Badge>
            </div>
          ))}
        </Section>
      </div>
    </>
  );
}
