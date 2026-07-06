"use client";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { activities, teamMembers } from "@/data/static";
import type { BadgeCounts } from "./shared";
import {
  ShieldCheck,
  Building2,
  UserCheck,
  Inbox,
  ArrowRight,
  Crown,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

/* ─── Helpers ────────────────────────────────────────────────────────── */
function fmtRevenue(r: number) {
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(1)} Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)} L`;
  return `₹${r.toLocaleString("en-IN")}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDateStr() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const activityBorder = (user: string) => {
  if (user === "System") return "border-l-amber-500";
  if (user.startsWith("Priya")) return "border-l-emerald-500";
  if (user.startsWith("Karan")) return "border-l-blue-500";
  if (user.startsWith("Anita")) return "border-l-purple-500";
  if (user.startsWith("Devansh")) return "border-l-rose-500";
  return "border-l-accent";
};

/* ─── Sub-components ─────────────────────────────────────────────────── */

/** Dark hero card — greeting + live platform metrics */
function CommandHeader({ revenue, leads, users, hotLeads, activeListings }: {
  revenue: number | undefined;
  leads: number | undefined;
  users: number | undefined;
  hotLeads: number | undefined;
  activeListings: number | undefined;
}) {
  const { session } = useAuth();
  const firstName = session?.name?.split(" ")[0] ?? "Admin";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-navy-deep px-6 py-5 text-white shadow-lg">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,64,64,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/3 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: greeting */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
            {getDateStr()}
          </p>
          <h1 className="mt-1 font-display text-2xl font-black text-white">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="mt-0.5 text-sm text-white/55">NxtSft.com Command Center</p>
        </div>

        {/* Right: quick metrics */}
        <div className="flex shrink-0 items-center gap-6 sm:gap-8">
          {[
            { label: "Revenue MTD", value: revenue != null ? fmtRevenue(revenue) : "—" },
            { label: "Open Leads",  value: leads != null ? String(leads) : "—" },
            { label: "Registered",  value: users != null ? String(users) : "—" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <div className="font-display text-xl font-bold text-white">{m.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/8 pt-3">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs text-white/50">Platform Online</span>
        </div>
        {hotLeads != null && (
          <>
            <span className="text-xs text-white/20">·</span>
            <span className="text-xs text-white/50">
              <span className="font-bold text-accent">{hotLeads}</span> hot leads need action
            </span>
          </>
        )}
        {activeListings != null && (
          <>
            <span className="text-xs text-white/20">·</span>
            <span className="text-xs text-white/50">
              <span className="font-bold text-white/80">{activeListings}</span> active listings
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* Action queue cards (pending items by category) — counts come from
   admin.badgeCounts (same source as the sidebar badges), null while loading. */
const makeActionItems = (b?: BadgeCounts) =>
  [
    {
      icon: ShieldCheck,
      count: b?.kyc,
      label: "KYC Pending",
      sublabel: "Documents awaiting review",
      border: "border-amber-200",
      iconBg: "bg-amber-50",
      iconClr: "text-amber-600",
      numClr: "text-amber-700",
      hoverBorder: "hover:border-amber-400",
      hash: "kyc",
    },
    {
      icon: Building2,
      count: b?.listings,
      label: "Listings to Approve",
      sublabel: "Awaiting RERA check",
      border: "border-blue-200",
      iconBg: "bg-blue-50",
      iconClr: "text-blue-600",
      numClr: "text-blue-700",
      hoverBorder: "hover:border-blue-400",
      hash: "listings",
    },
    {
      icon: UserCheck,
      count: b?.sellerApprovals,
      label: "Seller Verifications",
      sublabel: "New seller accounts",
      border: "border-violet-200",
      iconBg: "bg-violet-50",
      iconClr: "text-violet-600",
      numClr: "text-violet-700",
      hoverBorder: "hover:border-violet-400",
      hash: "seller-approvals",
    },
    {
      icon: Inbox,
      count: b?.enquiries,
      label: "Unread Enquiries",
      sublabel: "Contact form submissions",
      border: "border-emerald-200",
      iconBg: "bg-emerald-50",
      iconClr: "text-emerald-600",
      numClr: "text-emerald-700",
      hoverBorder: "hover:border-emerald-400",
      hash: "enquiries",
    },
  ] as const;

function ActionQueueCard({ item }: { item: ReturnType<typeof makeActionItems>[number] }) {
  const { icon: Icon, count, label, sublabel, border, iconBg, iconClr, numClr, hoverBorder, hash } = item;
  return (
    <button
      onClick={() => (window.location.hash = hash)}
      className={`group relative flex flex-col rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${border} ${hoverBorder}`}
    >
      <div className="mb-3 flex items-start justify-between">
        <span className={`inline-flex rounded-xl p-2 ${iconBg}`}>
          <Icon size={18} className={iconClr} />
        </span>
        <ArrowRight
          size={13}
          className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </div>
      <span className={`font-display text-3xl font-black ${numClr}`}>{count ?? "—"}</span>
      <span className="mt-1 text-sm font-semibold text-navy">{label}</span>
      <span className="mt-0.5 text-xs text-muted-foreground">{sublabel}</span>
    </button>
  );
}

/* KPI card — compact version with trend indicator */
function KpiCard({
  label,
  value,
  sub,
  trend,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        {icon && <div className="text-muted-foreground/40">{icon}</div>}
      </div>
      <div className="mt-2 font-display text-3xl font-black text-navy">{value}</div>
      {sub && (
        <div
          className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${
            trend === "up"
              ? "text-emerald-600"
              : trend === "down"
                ? "text-accent"
                : "text-muted-foreground"
          }`}
        >
          {trend === "up" && <TrendingUp size={11} />}
          {trend === "down" && <TrendingDown size={11} />}
          {sub}
        </div>
      )}
    </div>
  );
}

/* Conversion funnel bar */
function FunnelBar({
  label,
  count,
  max,
  pct,
  color,
}: {
  label: string;
  count: number;
  max: number;
  pct?: string;
  color: string;
}) {
  const width = Math.round((count / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-semibold text-navy">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-secondary h-3">
        <div
          className={`h-3 rounded-full ${color} transition-all duration-700`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-xs font-bold text-navy">{count}</span>
      {pct && (
        <span className="w-12 shrink-0 text-right text-[10px] font-semibold text-muted-foreground">
          {pct}
        </span>
      )}
    </div>
  );
}

/* Sales leaderboard row */
function LeaderboardRow({
  rank,
  name,
  city,
  closedMTD,
  conversion,
  achieved,
}: {
  rank: number;
  name: string;
  city: string;
  closedMTD: number;
  conversion: number;
  achieved: number;
}) {
  const isFirst = rank === 1;
  return (
    <div
      className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${isFirst ? "bg-gold/5" : "hover:bg-secondary/40"}`}
    >
      {/* Rank */}
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${
          isFirst
            ? "bg-gold text-navy"
            : rank === 2
              ? "bg-slate-100 text-slate-600"
              : "bg-secondary text-muted-foreground"
        }`}
      >
        {isFirst ? <Crown size={14} /> : rank}
      </div>

      {/* Name + bar */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-sm font-semibold text-navy">{name}</span>
          <span className="shrink-0 text-xs font-bold text-emerald-600">{closedMTD} closed</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${isFirst ? "bg-gold" : "bg-accent"}`}
              style={{ width: `${achieved}%` }}
            />
          </div>
          <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
            {achieved}% target
          </span>
        </div>
      </div>

      {/* Conversion */}
      <div className="shrink-0 text-right">
        <div className="text-xs font-bold text-navy">{conversion}%</div>
        <div className="text-[10px] text-muted-foreground">conv.</div>
      </div>
    </div>
  );
}

/* Inline card shell (no mt-6 so it plays well with space-y-6) */
function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-display text-base font-bold text-navy">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */
export function OperationsTab() {
  const statsQ = trpc.admin.stats.useQuery();
  const s = statsQ.data;
  const badgesQ = trpc.admin.badgeCounts.useQuery(undefined, { refetchInterval: 60_000 });
  const actionItems = makeActionItems(badgesQ.data);

  // Sort leaderboard by closedMTD desc
  const leaderboard = [...teamMembers].sort((a, b) => b.closedMTD - a.closedMTD);

  return (
    <div className="space-y-6">

      {/* ── Command Header ─────────────────────────────────────────────── */}
      <CommandHeader
        revenue={s?.totalRevenue}
        leads={s?.totalLeads}
        users={s?.totalUsers}
        hotLeads={s?.hotLeads}
        activeListings={s?.activeListings}
      />

      {/* ── Action Queue ───────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Zap size={13} className="text-accent" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Needs Attention
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {actionItems.map((item) => (
            <ActionQueueCard key={item.hash} item={item} />
          ))}
        </div>
      </div>

      {/* ── Main layout: 3 + 2 columns ─────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* ── Left column: Sales Intelligence ─────────────────────────── */}
        <div className="space-y-6 lg:col-span-3">

          {/* KPI Scorecard */}
          <div className="grid grid-cols-2 gap-4">
            <KpiCard
              label="Total Revenue"
              value={s ? fmtRevenue(s.totalRevenue) : "…"}
              sub="+8% vs last month"
              trend="up"
              icon={<TrendingUp size={15} />}
            />
            <KpiCard
              label="Open Leads"
              value={s ? String(s.totalLeads) : "…"}
              sub={s ? `${s.hotLeads} hot` : "loading"}
              trend="up"
            />
            <KpiCard
              label="Active Listings"
              value={s ? String(s.activeListings) : "…"}
              sub={s ? `of ${s.totalProperties} total` : "loading"}
              trend="neutral"
              icon={<Building2 size={15} />}
            />
            <KpiCard
              label="Registered Users"
              value={s ? String(s.totalUsers) : "…"}
              sub="buyers + sellers"
              trend="up"
              icon={<Users size={15} />}
            />
          </div>

          {/* Conversion Funnel */}
          <Card title="Conversion Funnel — This Month">
            <div className="space-y-3 py-1">
              <FunnelBar label="Leads"     count={412} max={412} color="bg-blue-500" />
              <FunnelBar label="Qualified" count={198} max={412} color="bg-violet-500" pct="48%" />
              <FunnelBar label="Site Visit"count={87}  max={412} color="bg-amber-500" pct="44%" />
              <FunnelBar label="Closed"    count={23}  max={412} color="bg-emerald-500" pct="26%" />
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
              <span>Qualify rate: <strong className="text-navy">48%</strong></span>
              <span>Visit rate: <strong className="text-navy">44%</strong></span>
              <span>Close rate: <strong className="text-navy">26%</strong></span>
              <span>Overall: <strong className="text-emerald-600">5.6%</strong></span>
            </div>
          </Card>

          {/* Sales Leaderboard */}
          <Card
            title="Sales Team — This Month"
            action={
              <button
                onClick={() => (window.location.hash = "team")}
                className="text-xs font-semibold text-accent hover:underline"
              >
                View All →
              </button>
            }
          >
            <div className="space-y-1">
              {leaderboard.map((m, i) => (
                <LeaderboardRow
                  key={m.id}
                  rank={i + 1}
                  name={m.name}
                  city={m.city}
                  closedMTD={m.closedMTD}
                  conversion={m.conversion}
                  achieved={m.achieved}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* ── Right column: Activity + Quick Actions ─────────────────── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Live Activity Stream */}
          <Card title="Live Activity Stream">
            <div>
              {activities.map((a, i) => (
                <div
                  key={i}
                  className={`border-b border-border py-3 pl-3 last:border-0 border-l-4 ${activityBorder(a.user)}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-navy">{a.user}</span>
                    <span className="font-mono text-muted-foreground">{a.ts}</span>
                  </div>
                  <div className="mt-0.5 text-sm">{a.action}</div>
                  <div className="text-xs text-muted-foreground">{a.outcome}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Approve Listing",   hash: "listings",      color: "text-blue-600 border-blue-100 hover:border-blue-300" },
                { label: "Invite Team Member",hash: "team",          color: "text-violet-600 border-violet-100 hover:border-violet-300" },
                { label: "Run Report",        hash: "reports",       color: "text-emerald-600 border-emerald-100 hover:border-emerald-300" },
                { label: "View Enquiries",    hash: "enquiries",     color: "text-amber-600 border-amber-100 hover:border-amber-300" },
                { label: "CRM Pipeline",      hash: "crm",           color: "text-accent border-accent/10 hover:border-accent/30" },
                { label: "Check Alerts",      hash: "alerts",        color: "text-slate-600 border-slate-100 hover:border-slate-300" },
              ].map((a) => (
                <button
                  key={a.hash}
                  onClick={() => (window.location.hash = a.hash)}
                  className={`rounded-xl border bg-white p-3 text-left text-xs font-semibold transition-all hover:bg-secondary/30 ${a.color}`}
                >
                  {a.label} →
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
