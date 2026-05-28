import { createFileRoute } from "@tanstack/react-router";
import { PortalShell, StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { kpis, leads, activities, properties } from "@/data/static";

export const Route = createFileRoute("/sa-portal")({
  head: () => ({ meta: [{ title: "NestIQ Command — Super Admin" }] }),
  component: SA,
});

const nav = [
  { label: "Command Dashboard", to: "/sa-portal", icon: "◆" },
  { label: "User Management", to: "/sa-portal#users", icon: "◇" },
  { label: "Platform Config", to: "/sa-portal#config", icon: "⚙" },
  { label: "Global Analytics", to: "/sa-portal#analytics", icon: "◉" },
  { label: "Audit Trail", to: "/sa-portal#audit", icon: "≡" },
  { label: "AI Model Control", to: "/sa-portal#ai", icon: "▲" },
  { label: "Notifications", to: "/sa-portal#notify", icon: "✦" },
  { label: "Content CMS", to: "/sa-portal#cms", icon: "▤" },
  { label: "Security Console", to: "/sa-portal#sec", icon: "⚿" },
  { label: "Billing & Revenue", to: "/sa-portal#bill", icon: "₹" },
];

function SA() {
  return (
    <PortalShell brand="NestIQ Command" role="Super Admin" accent="gold" user={{ name: "Aarav Khanna", initials: "AK" }} nav={nav} basePath="/sa-portal">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Listings" value={kpis.totalListings.toLocaleString()} sub="+8.2% wk" />
        <StatCard label="Active Leads" value={kpis.activeLeads.toLocaleString()} sub="+12.4% wk" />
        <StatCard label="Revenue YTD" value={`₹${kpis.revenueCr}Cr`} sub="+24% YoY" />
        <StatCard label="DAU" value={kpis.dau.toLocaleString()} sub="+3.1%" />
        <StatCard label="MAU" value={`${(kpis.mau / 1000).toFixed(0)}K`} sub="+9.6%" />
        <StatCard label="Conv. Rate" value={`${kpis.conversion}%`} sub="+0.4 pts" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Revenue & Lead Funnel — Last 12 weeks" action={<Badge tone="success">Live</Badge>}>
            <div className="flex h-56 items-end gap-2">
              {Array.from({ length: 12 }).map((_, i) => {
                const h = 30 + ((i * 37) % 60);
                const h2 = 20 + ((i * 53) % 50);
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-col gap-0.5">
                      <div className="w-full rounded-t bg-accent" style={{ height: `${h}%` }} />
                      <div className="w-full rounded-b bg-gold" style={{ height: `${h2}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">W{i + 1}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-accent" /> Revenue</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-gold" /> Qualified Leads</span>
            </div>
          </Section>
        </div>
        <Section title="System Health">
          {[["API p50", "84ms", "ok"], ["DB Replication", "1.2s lag", "ok"], ["AI Model Drift", "0.4%", "ok"], ["Failed Logins (24h)", "12", "warn"]].map(([l, v, s]) => (
            <div key={l} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <span className="text-sm">{l}</span>
              <span className={`font-mono text-sm font-bold ${s === "warn" ? "text-amber-600" : "text-emerald-600"}`}>{v}</span>
            </div>
          ))}
        </Section>
      </div>

      <Section title="Recent Audit Trail" action={<button className="text-xs font-semibold text-accent">Export PDF →</button>}>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="py-2">Time</th><th>User</th><th>Action</th><th>Outcome</th></tr>
          </thead>
          <tbody>
            {activities.map((a, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-3 font-mono text-xs">{a.ts}</td>
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
            <div key={p.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
              <img src={p.image} alt="" className="h-12 w-16 rounded object-cover" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-navy">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.locality} · {p.priceLabel}</div>
              </div>
              <Badge tone="hot">{p.matchScore}%</Badge>
            </div>
          ))}
        </Section>
        <Section title="Latest Leads">
          {leads.slice(0, 4).map((l) => (
            <div key={l.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <div>
                <div className="text-sm font-semibold text-navy">{l.name}</div>
                <div className="text-xs text-muted-foreground">{l.interest} · {l.city}</div>
              </div>
              <Badge tone={l.status.toLowerCase() as "hot" | "warm" | "cold" | "new"}>{l.status}</Badge>
            </div>
          ))}
        </Section>
      </div>
    </PortalShell>
  );
}