"use client";
import { useState, useMemo, type ReactNode } from "react";
import {
  Download, Filter, ChevronDown, ChevronUp, X,
  TrendingUp, Wallet, Users, MapPin, Star, Megaphone,
  ArrowUpRight, ArrowDownRight, Target,
} from "lucide-react";
import { Badge } from "@/components/portal/PortalShell";
import { REPORT_CATEGORIES } from "@/data/reports";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

/* ─── Types ─────────────────────────────────────────────────── */
type DatePreset = "today" | "week" | "month" | "lastmonth" | "all";

interface Filters {
  preset: DatePreset;
  from: string;
  to: string;
  category: string;
  city: string;
  state: string;
  builder: string;
  supervisor: string;
  salesStaff: string;
  userStatus: string;
  subType: string;
  subStatus: string;
}

const DEFAULT_FILTERS: Filters = {
  preset: "all",
  from: "2000-01-01",
  to: "2099-12-31",
  category: "All",
  city: "All",
  state: "All",
  builder: "All",
  supervisor: "All",
  salesStaff: "All",
  userStatus: "All",
  subType: "All",
  subStatus: "All",
};

function buildPresets(): Record<DatePreset, [string, string]> {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  const today = new Date(y, m, d);
  const weekStart = new Date(today);
  weekStart.setDate(d - ((now.getDay() + 6) % 7));
  return {
    today: [fmt(today), fmt(today)],
    week: [fmt(weekStart), fmt(today)],
    month: [fmt(new Date(y, m, 1)), fmt(new Date(y, m + 1, 0))],
    lastmonth: [fmt(new Date(y, m - 1, 1)), fmt(new Date(y, m, 0))],
    all: ["2000-01-01", "2099-12-31"],
  };
}

const PRESETS = buildPresets();
const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today", week: "This Week", month: "This Month", lastmonth: "Last Month", all: "All Time",
};
const USER_STATUS_OPTIONS = ["All", "Active", "Inactive"] as const;
const SUB_TYPE_OPTIONS = ["All", "Fresh", "Renewal"] as const;
const SUB_STATUS_OPTIONS = ["All", "Paid", "Unpaid", "Follow-up", "Not Interested"] as const;

/* ─── Helpers ───────────────────────────────────────────────── */
function fmtINR(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function dlCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: filename,
  });
  a.click();
}

/* ─── Sub-components ────────────────────────────────────────── */
function Sel({ label, value, options, onChange, locked }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void; locked?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange} disabled={locked}>
        <SelectTrigger size="sm" className="min-w-[7rem]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function RptSection({ title, count, onExport, children }: {
  title: string; count: number; onExport: () => void; children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex cursor-pointer items-center justify-between px-5 py-4" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center gap-3">
          <h3 className="font-display text-base font-bold text-navy">{title}</h3>
          <Badge tone="new">{count} records</Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onExport(); }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent"
          >
            <Download size={11} /> Export CSV
          </button>
          {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </div>
      {open && <div className="border-t border-border px-5 pb-5 pt-4 overflow-x-auto">{children}</div>}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, accent = false }: {
  icon: ReactNode; label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent ? "bg-accent/10 text-accent" : "bg-navy/8 text-navy"}`}>
        {icon}
      </div>
      <div className="mt-3 font-display text-2xl font-black text-navy">{value}</div>
      <div className="mt-0.5 text-xs font-semibold text-muted-foreground">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/* ─── Funnel bar ─────────────────────────────────────────────── */
const FUNNEL_COLORS: Record<string, string> = {
  New: "bg-sky-400", Hot: "bg-red-500", Warm: "bg-amber-400",
  Cold: "bg-blue-300", Converted: "bg-emerald-500", Lost: "bg-zinc-400",
};

/* ─── Main component ────────────────────────────────────────── */
export function ReportsDashboard({
  title = "Reports",
  subtitle = "Calendar-filtered reports across all business dimensions.",
  showAgentsAndTickets = true,
}: {
  title?: string;
  subtitle?: string;
  showAgentsAndTickets?: boolean;
}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const setF = (key: keyof Filters, value: string) => setFilters((f) => ({ ...f, [key]: value }));
  const setPreset = (preset: DatePreset) => {
    const [from, to] = PRESETS[preset];
    setFilters((f) => ({ ...f, preset, from, to }));
  };
  const resetFilters = () => setFilters({ ...DEFAULT_FILTERS, from: PRESETS.all[0], to: PRESETS.all[1] });

  const { from, to } = filters;
  const snap = trpc.reports.snapshot.useQuery({ from, to });
  const snapData = snap.data;

  const activeFilterCount = [
    filters.category !== "All", filters.city !== "All", filters.state !== "All",
    filters.builder !== "All", filters.supervisor !== "All", filters.salesStaff !== "All",
    filters.userStatus !== "All", filters.subType !== "All", filters.subStatus !== "All",
  ].filter(Boolean).length;

  const { cityOptions, stateOptions, builderOptions, supervisorOptions, salesStaffOptions } = useMemo(() => {
    const cities = new Set<string>(), states = new Set<string>(), builders = new Set<string>(),
      supervisors = new Set<string>(), sales = new Set<string>();
    const addFull = (item: { city?: string; state?: string; builder?: string; supervisor?: string; salesStaff?: string }) => {
      if (item.city && item.city !== "—") cities.add(item.city);
      if (item.state && item.state !== "—") states.add(item.state);
      if (item.builder && item.builder !== "—") builders.add(item.builder);
      if (item.supervisor && item.supervisor !== "—") supervisors.add(item.supervisor);
      if (item.salesStaff && item.salesStaff !== "—") sales.add(item.salesStaff);
    };
    (snapData?.users ?? []).forEach(addFull);
    (snapData?.subscriptions ?? []).forEach(addFull);
    (snapData?.siteVisits ?? []).forEach(addFull);
    return {
      cityOptions: ["All", ...[...cities].sort()],
      stateOptions: ["All", ...[...states].sort()],
      builderOptions: ["All", ...[...builders].sort()],
      supervisorOptions: ["All", ...[...supervisors].sort()],
      salesStaffOptions: ["All", ...[...sales].sort()],
    };
  }, [snapData]);

  const matchDims = (item: { category?: string; city: string; state: string; builder?: string; supervisor?: string; salesStaff?: string }) => {
    if (filters.category !== "All" && item.category !== filters.category) return false;
    if (filters.city !== "All" && item.city !== filters.city) return false;
    if (filters.state !== "All" && item.state !== filters.state) return false;
    if (filters.builder !== "All" && item.builder !== filters.builder) return false;
    if (filters.supervisor !== "All" && item.supervisor !== filters.supervisor) return false;
    if (filters.salesStaff !== "All" && item.salesStaff !== filters.salesStaff) return false;
    return true;
  };

  const fUsers = useMemo(() =>
    (snapData?.users ?? []).filter((u) => matchDims(u) && (filters.userStatus === "All" || u.status === filters.userStatus)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [snapData, filters]);

  const fSubs = useMemo(() =>
    (snapData?.subscriptions ?? []).filter((s) =>
      matchDims(s) &&
      (filters.subType === "All" || s.type === filters.subType) &&
      (filters.subStatus === "All" || s.status === filters.subStatus),
    ),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [snapData, filters]);

  const fVisits = useMemo(() => (snapData?.siteVisits ?? []).filter((v) => matchDims(v)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [snapData, filters]);

  const fAgents = useMemo(() =>
    (snapData?.agentRegs ?? []).filter((a) => {
      if (filters.city !== "All" && a.city !== filters.city) return false;
      if (filters.state !== "All" && a.state !== filters.state) return false;
      return true;
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [snapData, filters]);

  const fTickets = useMemo(() =>
    (snapData?.tickets ?? []).filter((t) => {
      if (filters.city !== "All" && t.city !== filters.city) return false;
      if (filters.state !== "All" && t.state !== filters.state) return false;
      if (filters.supervisor !== "All" && t.supervisor !== filters.supervisor) return false;
      if (filters.salesStaff !== "All" && t.assignedTo !== filters.salesStaff) return false;
      return true;
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [snapData, filters]);

  // Filtered commissions (by supervisor / salesStaff)
  const fCommissions = useMemo(() =>
    (snapData?.commissions ?? []).filter((c) => {
      if (filters.supervisor !== "All" && c.supervisor !== filters.supervisor) return false;
      if (filters.salesStaff !== "All" && c.repName !== filters.salesStaff) return false;
      return true;
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [snapData, filters]);

  // Filtered staff performance
  const fStaffPerf = useMemo(() =>
    (snapData?.staffPerf ?? []).filter((s) => {
      if (filters.supervisor !== "All" && s.supervisor !== filters.supervisor) return false;
      if (filters.salesStaff !== "All" && s.repName !== filters.salesStaff) return false;
      return true;
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [snapData, filters]);

  /* ── Derived KPIs ─────────────────────────────────────────── */
  const revSummary = snapData?.revSummary;
  const leadsFunnel = snapData?.leadsFunnel ?? [];
  const totalLeads = leadsFunnel.reduce((a, f) => a + f.count, 0);
  const convertedLeads = leadsFunnel.find((f) => f.status === "Converted")?.count ?? 0;
  const convRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
  const visitsCompleted = fVisits.filter((v) => v.status === "Completed").length;
  const freshPaid = fSubs.filter((s) => s.type === "Fresh" && s.status === "Paid").length;
  const freshUnpaid = fSubs.filter((s) => s.type === "Fresh" && s.status !== "Paid").length;
  const renPaid = fSubs.filter((s) => s.type === "Renewal" && s.status === "Paid").length;
  const renUnpaid = fSubs.filter((s) => s.type === "Renewal" && s.status !== "Paid").length;
  const resolvedTickets = fTickets.filter((t) => t.status === "Resolved");
  const withinTAT = resolvedTickets.filter((t) => t.withinTAT).length;
  const commissionsTotal = fCommissions.reduce((a, c) => a + c.amount, 0);
  const commissionsPaid = fCommissions.filter((c) => c.status === "cleared").reduce((a, c) => a + c.amount, 0);

  const funnelMax = Math.max(1, ...leadsFunnel.map((f) => f.count));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h2 className="font-display text-2xl font-bold text-navy">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {snap.isLoading && (
        <div className="rounded-2xl border border-border bg-white px-5 py-4 text-sm text-muted-foreground shadow-sm">
          Loading report data…
        </div>
      )}

      {/* ── KPI Cards row ─────────────────────────────────────── */}
      {!snap.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<Wallet size={18} />}
            label="Revenue (Paid)"
            value={fmtINR(revSummary?.totalRevenue ?? 0)}
            sub={`Pending: ${fmtINR(revSummary?.pendingRevenue ?? 0)}`}
            accent
          />
          <KpiCard
            icon={<TrendingUp size={18} />}
            label="Subscriptions"
            value={String(fSubs.length)}
            sub={`${fSubs.filter((s) => s.status === "Paid").length} paid · ${fSubs.filter((s) => s.status !== "Paid").length} pending`}
          />
          <KpiCard
            icon={<Target size={18} />}
            label="Leads Converted"
            value={`${convertedLeads} / ${totalLeads}`}
            sub={`${convRate}% conversion rate`}
          />
          <KpiCard
            icon={<MapPin size={18} />}
            label="Site Visits"
            value={String(fVisits.length)}
            sub={`${visitsCompleted} completed`}
          />
        </div>
      )}

      {/* ── Filter bar ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Filters</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">{activeFilterCount}</span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-accent transition-colors">
              <X size={11} /> Reset filters
            </button>
          )}
        </div>

        {/* Preset buttons */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(Object.keys(PRESET_LABELS) as DatePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filters.preset === p ? "bg-accent text-white" : "border border-border bg-white text-navy hover:border-accent"}`}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
          <div className="ml-1 flex items-center gap-2">
            <input type="date" value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, preset: "all", from: e.target.value }))}
              className="rounded-lg border border-input bg-background px-2 py-1 text-xs focus:border-accent focus:outline-none" />
            <span className="text-xs text-muted-foreground">→</span>
            <input type="date" value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, preset: "all", to: e.target.value }))}
              className="rounded-lg border border-input bg-background px-2 py-1 text-xs focus:border-accent focus:outline-none" />
          </div>
        </div>

        <div className="mb-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Sel label="Category" value={filters.category} options={REPORT_CATEGORIES} onChange={(v) => setF("category", v)} />
          <Sel label="City" value={filters.city} options={cityOptions} onChange={(v) => setF("city", v)} />
          <Sel label="State" value={filters.state} options={stateOptions} onChange={(v) => setF("state", v)} />
        </div>
        <div className="mb-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Sel label="Builder / Project" value={filters.builder} options={builderOptions} onChange={(v) => setF("builder", v)} />
          <Sel label="Supervisor" value={filters.supervisor} options={supervisorOptions} onChange={(v) => setF("supervisor", v)} />
          <Sel label="Sales Staff" value={filters.salesStaff} options={salesStaffOptions} onChange={(v) => setF("salesStaff", v)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Sel label="User Status" value={filters.userStatus} options={USER_STATUS_OPTIONS} onChange={(v) => setF("userStatus", v)} />
          <Sel label="Subscription Type" value={filters.subType} options={SUB_TYPE_OPTIONS} onChange={(v) => setF("subType", v)} />
          <Sel label="Subscription Status" value={filters.subStatus} options={SUB_STATUS_OPTIONS} onChange={(v) => setF("subStatus", v)} />
        </div>
      </div>

      {/* ── Summary pills ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{fUsers.length} Users</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          {fSubs.length} Subscriptions ({freshPaid}F-Paid · {freshUnpaid}F-Unpaid · {renPaid}R-Paid · {renUnpaid}R-Other)
        </span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{fVisits.length} Site Visits</span>
        <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">{totalLeads} Leads · {convertedLeads} Converted</span>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">{fmtINR(commissionsTotal)} Commissions</span>
        {showAgentsAndTickets && (
          <>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{fAgents.length} Agent Regs</span>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
              {fTickets.length} Tickets · {resolvedTickets.length > 0 ? Math.round((withinTAT / resolvedTickets.length) * 100) : 0}% TAT
            </span>
          </>
        )}
      </div>

      {/* ══ REVENUE OVERVIEW ════════════════════════════════════ */}
      <RptSection
        title="Revenue Overview"
        count={(revSummary?.byPlan ?? []).length}
        onExport={() =>
          dlCSV("revenue-by-plan.csv",
            ["Plan", "Subscriptions", "Total Revenue (₹)"],
            (revSummary?.byPlan ?? []).map((p) => [p.plan, p.count, p.total]),
          )
        }
      >
        {/* Summary row */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Revenue", value: fmtINR(revSummary?.totalRevenue ?? 0), color: "text-emerald-600" },
            { label: "Fresh Subscriptions", value: fmtINR(revSummary?.freshRevenue ?? 0), color: "text-blue-600" },
            { label: "Renewal Revenue", value: fmtINR(revSummary?.renewalRevenue ?? 0), color: "text-purple-600" },
            { label: "Avg Deal Value", value: fmtINR(revSummary?.avgDeal ?? 0), color: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-secondary/30 p-3 text-center">
              <div className={`font-display text-xl font-black ${s.color}`}>{s.value}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {(revSummary?.byPlan ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No paid subscriptions in this period.</p>
        ) : (
          <table className="portal-table w-full">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Paid Subscriptions</th>
                <th>Total Revenue</th>
                <th>Avg Value</th>
              </tr>
            </thead>
            <tbody>
              {(revSummary?.byPlan ?? []).sort((a, b) => b.total - a.total).map((p) => (
                <tr key={p.plan}>
                  <td className="font-semibold text-navy">{p.plan}</td>
                  <td className="font-mono text-xs">{p.count}</td>
                  <td className="font-mono text-xs font-bold text-emerald-700">{fmtINR(p.total)}</td>
                  <td className="font-mono text-xs">{fmtINR(p.count > 0 ? Math.round(p.total / p.count) : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </RptSection>

      {/* ══ LEADS FUNNEL ════════════════════════════════════════ */}
      <RptSection
        title="Leads Funnel"
        count={totalLeads}
        onExport={() =>
          dlCSV("leads-funnel.csv", ["Stage", "Count", "% of Total"],
            leadsFunnel.map((f) => [f.status, f.count, totalLeads > 0 ? Math.round((f.count / totalLeads) * 100) : 0]),
          )
        }
      >
        {/* Visual funnel bars */}
        <div className="mb-4 space-y-2">
          {leadsFunnel.map((f) => (
            <div key={f.status} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-right text-xs font-semibold text-navy">{f.status}</span>
              <div className="flex-1 rounded-full bg-secondary h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${FUNNEL_COLORS[f.status] ?? "bg-navy"}`}
                  style={{ width: `${funnelMax > 0 ? Math.round((f.count / funnelMax) * 100) : 0}%` }}
                />
              </div>
              <span className="w-10 text-xs font-bold text-navy tabular-nums">{f.count}</span>
              <span className="w-10 text-[11px] text-muted-foreground tabular-nums">
                {totalLeads > 0 ? Math.round((f.count / totalLeads) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-secondary/30 p-3">
          <div className="text-xs">
            <span className="font-bold text-navy">{totalLeads}</span>
            <span className="ml-1 text-muted-foreground">Total leads</span>
          </div>
          <div className="text-xs">
            <span className="font-bold text-emerald-600">{convertedLeads}</span>
            <span className="ml-1 text-muted-foreground">Converted</span>
          </div>
          <div className="text-xs">
            <span className="font-bold text-accent">{convRate}%</span>
            <span className="ml-1 text-muted-foreground">Conversion rate</span>
          </div>
          <div className="text-xs">
            <span className="font-bold text-amber-600">{leadsFunnel.find((f) => f.status === "Hot")?.count ?? 0}</span>
            <span className="ml-1 text-muted-foreground">Hot leads</span>
          </div>
        </div>
      </RptSection>

      {/* ══ TARGET vs ACHIEVEMENT (Staff Performance) ═══════════ */}
      <RptSection
        title="Target vs Achievement — Sales Team"
        count={fStaffPerf.length}
        onExport={() =>
          dlCSV("staff-performance.csv",
            ["Sales Rep", "Supervisor", "Leads", "Converted", "Conv %", "Visits", "Completed", "Subs", "Revenue (₹)", "Commission Total (₹)", "Commission Paid (₹)"],
            fStaffPerf.map((s) => [
              s.repName, s.supervisor, s.leadsTotal, s.leadsConverted, `${s.conversionRate}%`,
              s.siteVisitsTotal, s.siteVisitsCompleted, s.subsCount,
              s.subsRevenue, s.commissionsTotal, s.commissionsPaid,
            ]),
          )
        }
      >
        {fStaffPerf.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No staff performance data for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table w-full">
              <thead>
                <tr>
                  <th>Sales Rep</th>
                  <th>Supervisor</th>
                  <th>Leads</th>
                  <th>Converted</th>
                  <th>Conv %</th>
                  <th>Visits</th>
                  <th>Done</th>
                  <th>Subs</th>
                  <th>Sub Revenue</th>
                  <th>Commission</th>
                  <th>Paid Out</th>
                </tr>
              </thead>
              <tbody>
                {fStaffPerf.sort((a, b) => b.leadsConverted - a.leadsConverted).map((s) => (
                  <tr key={s.repId}>
                    <td className="font-semibold text-navy">{s.repName}</td>
                    <td className="text-xs text-muted-foreground">{s.supervisor}</td>
                    <td className="font-mono text-xs">{s.leadsTotal}</td>
                    <td>
                      <span className={`font-mono text-xs font-bold ${s.leadsConverted > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {s.leadsConverted}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {s.conversionRate >= 50 ? (
                          <ArrowUpRight size={11} className="text-emerald-500" />
                        ) : s.conversionRate > 0 ? (
                          <ArrowDownRight size={11} className="text-amber-500" />
                        ) : null}
                        <span className={`font-mono text-xs font-bold ${s.conversionRate >= 50 ? "text-emerald-600" : s.conversionRate > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                          {s.conversionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="font-mono text-xs">{s.siteVisitsTotal}</td>
                    <td className="font-mono text-xs text-emerald-600">{s.siteVisitsCompleted}</td>
                    <td className="font-mono text-xs">{s.subsCount}</td>
                    <td className="font-mono text-xs font-bold text-navy">{fmtINR(s.subsRevenue)}</td>
                    <td className="font-mono text-xs">{fmtINR(s.commissionsTotal)}</td>
                    <td>
                      <Badge tone={s.commissionsPaid >= s.commissionsTotal && s.commissionsTotal > 0 ? "success" : "warm"}>
                        {fmtINR(s.commissionsPaid)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </RptSection>

      {/* ══ COMMISSIONS ═════════════════════════════════════════ */}
      <RptSection
        title="Commissions"
        count={fCommissions.length}
        onExport={() =>
          dlCSV("commissions.csv",
            ["ID", "Sales Rep", "Supervisor", "Deal Value (₹)", "Commission (₹)", "Status", "Period", "Date"],
            fCommissions.map((c) => [c.id, c.repName, c.supervisor, c.dealValue, c.amount, c.status, c.period, c.createdAt]),
          )
        }
      >
        {/* Summary */}
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="rounded-xl border border-border bg-secondary/30 px-4 py-2 text-center">
            <div className="font-display text-lg font-black text-navy">{fmtINR(commissionsTotal)}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total Earned</div>
          </div>
          <div className="rounded-xl border border-border bg-secondary/30 px-4 py-2 text-center">
            <div className="font-display text-lg font-black text-emerald-600">{fmtINR(commissionsPaid)}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Paid Out</div>
          </div>
          <div className="rounded-xl border border-border bg-secondary/30 px-4 py-2 text-center">
            <div className="font-display text-lg font-black text-amber-600">{fmtINR(commissionsTotal - commissionsPaid)}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Pending</div>
          </div>
        </div>

        {fCommissions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No commission records for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table w-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sales Rep</th>
                  <th>Supervisor</th>
                  <th>Deal Value</th>
                  <th>Commission</th>
                  <th>Period</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {fCommissions.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono text-xs">{c.id}</td>
                    <td className="font-semibold text-navy">{c.repName}</td>
                    <td className="text-xs text-muted-foreground">{c.supervisor}</td>
                    <td className="font-mono text-xs">{fmtINR(c.dealValue)}</td>
                    <td className="font-mono text-xs font-bold text-emerald-700">{fmtINR(c.amount)}</td>
                    <td className="font-mono text-xs">{c.period}</td>
                    <td>
                      <Badge tone={c.status === "cleared" ? "success" : "warm"}>
                        {c.status === "cleared" ? "Paid" : "Pending"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </RptSection>

      {/* ══ REGISTERED USERS ════════════════════════════════════ */}
      <RptSection
        title="Registered Users"
        count={fUsers.length}
        onExport={() =>
          dlCSV("registered-users.csv",
            ["ID", "Name", "Email", "Phone", "Category", "City", "State", "Builder", "Supervisor", "Sales Staff", "Registered On", "Status"],
            fUsers.map((u) => [u.id, u.name, u.email, u.phone, u.category, u.city, u.state, u.builder, u.supervisor, u.salesStaff, u.registeredOn, u.status]),
          )
        }
      >
        {fUsers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No records match the selected filters.</p>
        ) : (
          <div className="overflow-x-auto"><table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th><th>Name</th><th>Category</th><th>City</th>
                <th>State</th><th>Builder</th><th>Supervisor</th><th>Sales</th>
                <th>Registered</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fUsers.map((u) => (
                <tr key={u.id}>
                  <td className="font-mono text-xs">{u.id}</td>
                  <td><div className="font-semibold text-navy">{u.name}</div><div className="text-[10px] text-muted-foreground">{u.email}</div></td>
                  <td className="text-xs">{u.category}</td>
                  <td className="text-xs">{u.city}</td>
                  <td className="text-xs text-muted-foreground">{u.state}</td>
                  <td className="text-xs">{u.builder}</td>
                  <td className="text-xs">{u.supervisor}</td>
                  <td className="text-xs">{u.salesStaff}</td>
                  <td className="font-mono text-xs">{u.registeredOn}</td>
                  <td><Badge tone={u.status === "Active" ? "success" : "warm"}>{u.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </RptSection>

      {/* ══ SUBSCRIPTIONS ═══════════════════════════════════════ */}
      <RptSection
        title="Subscriptions"
        count={fSubs.length}
        onExport={() =>
          dlCSV("subscriptions.csv",
            ["ID", "User", "Plan", "Amount (₹)", "Category", "City", "State", "Builder", "Supervisor", "Sales", "Type", "Status", "Subscribed On", "Due Date"],
            fSubs.map((s) => [s.id, s.userName, s.plan, s.amount, s.category, s.city, s.state, s.builder, s.supervisor, s.salesStaff, s.type, s.status, s.subscribedOn, s.dueDate]),
          )
        }
      >
        {fSubs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No records match the selected filters.</p>
        ) : (
          <div className="overflow-x-auto"><table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th><th>User</th><th>Plan</th><th>Amount</th>
                <th>Type</th><th>Status</th><th>City</th><th>Supervisor</th>
                <th>Sales</th><th>Subscribed</th><th>Due</th>
              </tr>
            </thead>
            <tbody>
              {fSubs.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-xs">{s.id}</td>
                  <td className="font-semibold text-navy">{s.userName}</td>
                  <td className="text-xs">{s.plan}</td>
                  <td className="font-mono text-xs">₹{s.amount.toLocaleString("en-IN")}</td>
                  <td><Badge tone={s.type === "Fresh" ? "new" : "warm"}>{s.type}</Badge></td>
                  <td>
                    <Badge tone={s.status === "Paid" ? "success" : s.status === "Follow-up" ? "warm" : s.status === "Not Interested" ? "cold" : "hot"}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="text-xs">{s.city}</td>
                  <td className="text-xs">{s.supervisor}</td>
                  <td className="text-xs">{s.salesStaff}</td>
                  <td className="font-mono text-xs">{s.subscribedOn}</td>
                  <td className="font-mono text-xs">{s.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </RptSection>

      {/* ══ SITE VISITS ═════════════════════════════════════════ */}
      <RptSection
        title="Site Visits"
        count={fVisits.length}
        onExport={() =>
          dlCSV("site-visits.csv",
            ["ID", "Lead Name", "Property", "City", "State", "Builder", "Supervisor", "Sales Staff", "Category", "Scheduled On", "Status"],
            fVisits.map((v) => [v.id, v.leadName, v.property, v.city, v.state, v.builder, v.supervisor, v.salesStaff, v.category, v.scheduledOn, v.status]),
          )
        }
      >
        {fVisits.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No records match the selected filters.</p>
        ) : (
          <div className="overflow-x-auto"><table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th><th>Lead</th><th>Property</th><th>City</th>
                <th>Builder</th><th>Supervisor</th><th>Sales</th><th>Category</th>
                <th>Scheduled</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fVisits.map((v) => (
                <tr key={v.id}>
                  <td className="font-mono text-xs">{v.id}</td>
                  <td className="font-semibold text-navy">{v.leadName}</td>
                  <td className="max-w-[180px] truncate text-xs">{v.property}</td>
                  <td className="text-xs">{v.city}</td>
                  <td className="text-xs">{v.builder}</td>
                  <td className="text-xs">{v.supervisor}</td>
                  <td className="text-xs">{v.salesStaff}</td>
                  <td className="text-xs">{v.category}</td>
                  <td className="font-mono text-xs">{v.scheduledOn}</td>
                  <td>
                    <Badge tone={v.status === "Completed" ? "success" : v.status === "Scheduled" ? "new" : v.status === "Cancelled" ? "warm" : "hot"}>
                      {v.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </RptSection>

      {showAgentsAndTickets && (
        <>
          {/* ══ CAMPAIGNS / BANNER ADS ══════════════════════════ */}
          <RptSection
            title="Campaigns & Banner Ads"
            count={(snapData?.campaigns ?? []).length}
            onExport={() =>
              dlCSV("campaigns.csv",
                ["ID", "Name", "Type", "Audience", "Status", "Budget (₹)", "Leads", "Clicks", "Scheduled"],
                (snapData?.campaigns ?? []).map((c) => [c.id, c.name, c.type, c.audience, c.status, c.budget, c.leads, c.clicks, c.scheduledAt]),
              )
            }
          >
            {(snapData?.campaigns ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No campaigns in this period.</p>
            ) : (
              <div className="overflow-x-auto"><table className="portal-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Name</th><th>Type</th><th>Audience</th>
                    <th>Budget</th><th>Leads</th><th>Clicks</th><th>Scheduled</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(snapData?.campaigns ?? []).map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono text-xs">{c.id}</td>
                      <td className="font-semibold text-navy">{c.name}</td>
                      <td className="text-xs capitalize">{c.type}</td>
                      <td className="text-xs capitalize">{c.audience}</td>
                      <td className="font-mono text-xs">{c.budget > 0 ? fmtINR(c.budget) : "—"}</td>
                      <td className="font-mono text-xs">{c.leads}</td>
                      <td className="font-mono text-xs">{c.clicks}</td>
                      <td className="font-mono text-xs">{c.scheduledAt}</td>
                      <td>
                        <Badge tone={c.status === "active" ? "success" : c.status === "completed" ? "new" : c.status === "paused" ? "warm" : "default"}>
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </RptSection>

          {/* ══ AGENT REGISTRATIONS ═════════════════════════════ */}
          <RptSection
            title="Agent Registrations"
            count={fAgents.length}
            onExport={() =>
              dlCSV("agent-registrations.csv",
                ["ID", "Name", "City", "State", "RERA Number", "Registered On", "Status"],
                fAgents.map((a) => [a.id, a.name, a.city, a.state, a.rera, a.registeredOn, a.status]),
              )
            }
          >
            {fAgents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No records match the selected filters.</p>
            ) : (
              <div className="overflow-x-auto"><table className="portal-table">
                <thead>
                  <tr>
                    <th className="py-2">ID</th><th>Name</th><th>City</th>
                    <th>State</th><th>RERA Number</th><th>Registered On</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fAgents.map((a) => (
                    <tr key={a.id}>
                      <td className="font-mono text-xs">{a.id}</td>
                      <td className="font-semibold text-navy">{a.name}</td>
                      <td className="text-xs">{a.city}</td>
                      <td className="text-xs text-muted-foreground">{a.state}</td>
                      <td className="font-mono text-xs">{a.rera}</td>
                      <td className="font-mono text-xs">{a.registeredOn}</td>
                      <td>
                        <Badge tone={a.status === "Active" ? "success" : a.status === "Pending" ? "warm" : "hot"}>
                          {a.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </RptSection>

          {/* ══ SUPPORT TICKETS (TAT) ═══════════════════════════ */}
          <RptSection
            title="Support Tickets (TAT)"
            count={fTickets.length}
            onExport={() =>
              dlCSV("support-tickets.csv",
                ["ID", "Subject", "Raised By", "Category", "City", "State", "Assigned To", "Supervisor", "Raised On", "Resolved On", "TAT (hrs)", "Actual (hrs)", "Status", "Within TAT"],
                fTickets.map((t) => [t.id, t.subject, t.raisedBy, t.category, t.city, t.state, t.assignedTo, t.supervisor, t.raisedOn, t.resolvedOn ?? "—", t.tatHours, t.actualHours ?? "—", t.status, t.withinTAT === null ? "—" : t.withinTAT ? "Yes" : "No"]),
              )
            }
          >
            {fTickets.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No records match the selected filters.</p>
            ) : (
              <div className="overflow-x-auto"><table className="portal-table">
                <thead>
                  <tr>
                    <th className="py-2">ID</th><th>Subject</th><th>Raised By</th><th>Category</th>
                    <th>City</th><th>Assigned To</th><th>Raised On</th><th>TAT</th>
                    <th>Actual</th><th>Status</th><th>Within TAT</th>
                  </tr>
                </thead>
                <tbody>
                  {fTickets.map((t) => (
                    <tr key={t.id}>
                      <td className="font-mono text-xs">{t.id}</td>
                      <td className="max-w-[180px] truncate text-xs font-semibold text-navy">{t.subject}</td>
                      <td className="text-xs">{t.raisedBy}</td>
                      <td className="text-xs">{t.category}</td>
                      <td className="text-xs">{t.city}</td>
                      <td className="text-xs">{t.assignedTo}</td>
                      <td className="font-mono text-xs">{t.raisedOn}</td>
                      <td className="font-mono text-xs">{t.tatHours}h</td>
                      <td className="font-mono text-xs">{t.actualHours != null ? `${t.actualHours}h` : "—"}</td>
                      <td>
                        <Badge tone={t.status === "Resolved" ? "success" : t.status === "Escalated" ? "hot" : "warm"}>
                          {t.status}
                        </Badge>
                      </td>
                      <td>
                        {t.withinTAT === null ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Badge tone={t.withinTAT ? "success" : "hot"}>{t.withinTAT ? "Yes" : "Breached"}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </RptSection>
        </>
      )}
    </div>
  );
}
