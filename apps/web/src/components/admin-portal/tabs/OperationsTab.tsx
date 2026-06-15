"use client";
import { StatCard, Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { activities } from "@/data/static";
import { PageHead } from "./PageHead";

// ─── Activity border colours by user type ───────────────────────────────────
const activityBorderColor = (user: string) => {
  if (user === "System") return "border-l-amber-500";
  if (user.startsWith("Priya")) return "border-l-emerald-500";
  if (user.startsWith("Karan")) return "border-l-blue-500";
  if (user.startsWith("Anita")) return "border-l-purple-500";
  if (user.startsWith("Devansh")) return "border-l-rose-500";
  return "border-l-accent";
};

function FunnelBar({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const pct = Math.round((count / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-semibold text-navy">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-secondary h-4">
        <div className={`h-4 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-xs font-bold text-navy">
        {count}
      </span>
    </div>
  );
}

export function OperationsTab() {
  const statsQ = trpc.admin.stats.useQuery();
  const s = statsQ.data;

  const fmtRevenue = (r: number) =>
    r >= 1e7 ? `₹${(r / 1e7).toFixed(1)} Cr` : r >= 1e5 ? `₹${(r / 1e5).toFixed(1)} L` : `₹${r.toLocaleString("en-IN")}`;

  return (
    <>
      <PageHead
        title="Operations Overview"
        subtitle="Pulse of all NxtSft.com ops — refreshed every 30 seconds."
      />

      {/* 8-card stat grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Revenue" value={s ? fmtRevenue(s.totalRevenue) : "…"} sub="from verified payments" />
        <StatCard label="Open Leads" value={s ? String(s.totalLeads) : "…"} sub={s ? `${s.hotLeads} hot` : "loading"} />
        <StatCard label="Active Listings" value={s ? String(s.activeListings) : "…"} sub={s ? `of ${s.totalProperties} total` : "loading"} accent="text-amber-600" />
        <StatCard
          label="Hot Leads"
          value={s ? String(s.hotLeads) : "…"}
          sub="need immediate action"
          accent="text-accent"
        />
        <StatCard label="Total Properties" value={s ? String(s.totalProperties) : "…"} sub="across all cities" />
        <StatCard
          label="Registered Users"
          value={s ? String(s.totalUsers) : "…"}
          sub="buyers + staff"
          accent="text-emerald-600"
        />
        <StatCard label="Avg Deal Size" value="₹52 L" sub="static — wire later" />
        <StatCard label="Team Size" value={s ? String(s.totalUsers) : "…"} sub="all roles" />
      </div>

      {/* Funnel section */}
      <Section title="Conversion Funnel — This Month">
        <div className="space-y-3 py-1">
          <FunnelBar label="Leads" count={412} max={412} color="bg-blue-500" />
          <FunnelBar label="Qualified" count={198} max={412} color="bg-violet-500" />
          <FunnelBar label="Site Visit" count={87} max={412} color="bg-amber-500" />
          <FunnelBar label="Closed" count={23} max={412} color="bg-emerald-500" />
        </div>
        <div className="mt-3 flex gap-6 text-[11px] text-muted-foreground">
          <span>
            Qualified rate: <strong className="text-navy">48%</strong>
          </span>
          <span>
            Visit rate: <strong className="text-navy">44%</strong>
          </span>
          <span>
            Close rate: <strong className="text-navy">26%</strong>
          </span>
          <span>
            Overall: <strong className="text-emerald-600">5.6%</strong>
          </span>
        </div>
      </Section>

      {/* Activity stream with coloured left border */}
      <Section title="Live Activity Stream">
        {activities.map((a, i) => (
          <div
            key={i}
            className={`border-b border-border py-3 last:border-0 pl-3 border-l-4 ${activityBorderColor(a.user)}`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-navy">{a.user}</span>
              <span className="font-mono text-muted-foreground">{a.ts}</span>
            </div>
            <div className="mt-1 text-sm">{a.action}</div>
            <div className="text-xs text-muted-foreground">{a.outcome}</div>
          </div>
        ))}
      </Section>

      <Section title="Quick Actions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Approve listing", hash: "listings" },
            { label: "Invite team member", hash: "team" },
            { label: "View click alerts", hash: "alerts" },
            { label: "Run weekly report", hash: "reports" },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => {
                window.location.hash = a.hash;
              }}
              className="rounded-lg border border-border bg-secondary/40 p-4 text-left text-sm font-semibold text-navy transition hover:border-accent hover:bg-white"
            >
              {a.label} →
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}
