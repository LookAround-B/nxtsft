"use client";
import { useState, useMemo, type ReactNode } from "react";
import { Download, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/portal/PortalShell";
import {
  REPORT_CATEGORIES,
  REPORT_CITIES,
  REPORT_STATES,
  REPORT_BUILDERS,
  REPORT_SUPERVISORS,
  REPORT_SALES,
} from "@/data/reports";
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
  sales: string;
}

function buildPresets(): Record<DatePreset, [string, string]> {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  const today = new Date(y, m, d);
  const weekStart = new Date(today);
  weekStart.setDate(d - ((now.getDay() + 6) % 7)); // Monday of current ISO week
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
  today: "Today",
  week: "This Week",
  month: "This Month",
  lastmonth: "Last Month",
  all: "All Time",
};

/* ─── Helpers ───────────────────────────────────────────────── */
function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
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
function Sel({
  label,
  value,
  options,
  onChange,
  locked,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  locked?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onChange} disabled={locked}>
        <SelectTrigger size="sm" className="min-w-[7rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function RptSection({
  title,
  count,
  onExport,
  children,
}: {
  title: string;
  count: number;
  onExport: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm">
      <div
        className="flex cursor-pointer items-center justify-between px-5 py-4"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-display text-base font-bold text-navy">{title}</h3>
          <Badge tone="new">{count} records</Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent"
          >
            <Download size={11} /> Export CSV
          </button>
          {open ? (
            <ChevronUp size={16} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={16} className="text-muted-foreground" />
          )}
        </div>
      </div>
      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4 overflow-x-auto">{children}</div>
      )}
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────── */
export function ReportsDashboard({
  defaultSupervisor,
  defaultSales,
  title = "Reports",
  subtitle = "Calendar-filtered reports across all dimensions.",
}: {
  defaultSupervisor?: string;
  defaultSales?: string;
  title?: string;
  subtitle?: string;
}) {
  const [filters, setFilters] = useState<Filters>({
    preset: "all",
    from: PRESETS.all[0],
    to: PRESETS.all[1],
    category: "All",
    city: "All",
    state: "All",
    builder: "All",
    supervisor: defaultSupervisor ?? "All",
    sales: defaultSales ?? "All",
  });

  const setF = (key: keyof Filters, value: string) => setFilters((f) => ({ ...f, [key]: value }));

  const setPreset = (preset: DatePreset) => {
    const [from, to] = PRESETS[preset];
    setFilters((f) => ({ ...f, preset, from, to }));
  };

  const { from, to } = filters;

  const snap = trpc.reports.snapshot.useQuery({ from, to });
  const snapData = snap.data;

  const matchDims = (item: {
    category?: string;
    city: string;
    state: string;
    builder?: string;
    supervisor?: string;
    salesStaff?: string;
  }) => {
    if (filters.category !== "All" && item.category !== filters.category) return false;
    if (filters.city !== "All" && item.city !== filters.city) return false;
    if (filters.state !== "All" && item.state !== filters.state) return false;
    if (filters.builder !== "All" && item.builder !== filters.builder) return false;
    if (filters.supervisor !== "All" && item.supervisor !== filters.supervisor) return false;
    if (filters.sales !== "All" && item.salesStaff !== filters.sales) return false;
    return true;
  };

  const fUsers = useMemo(
    () => (snapData?.users ?? []).filter((u) => matchDims(u)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapData, filters],
  );

  const fSubs = useMemo(
    () => (snapData?.subscriptions ?? []).filter((s) => matchDims(s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapData, filters],
  );

  const fVisits = useMemo(
    () => (snapData?.siteVisits ?? []).filter((v) => matchDims(v)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapData, filters],
  );

  const fAgents = useMemo(
    () =>
      (snapData?.agentRegs ?? []).filter((a) => {
        if (filters.city !== "All" && a.city !== filters.city) return false;
        if (filters.state !== "All" && a.state !== filters.state) return false;
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapData, filters],
  );

  const fTickets = useMemo(
    () =>
      (snapData?.tickets ?? []).filter((t) => {
        if (filters.city !== "All" && t.city !== filters.city) return false;
        if (filters.state !== "All" && t.state !== filters.state) return false;
        if (filters.supervisor !== "All" && t.supervisor !== filters.supervisor) return false;
        if (filters.sales !== "All" && t.assignedTo !== filters.sales) return false;
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapData, filters],
  );

  /* ── TAT summary ─────────────────────────────────────────── */
  const resolvedTickets = fTickets.filter((t) => t.status === "Resolved");
  const withinTAT = resolvedTickets.filter((t) => t.withinTAT).length;

  /* ── Subscription summary ─────────────────────────────────── */
  const freshPaid = fSubs.filter((s) => s.type === "Fresh" && s.status === "Paid").length;
  const freshUnpaid = fSubs.filter((s) => s.type === "Fresh" && s.status !== "Paid").length;
  const renPaid = fSubs.filter((s) => s.type === "Renewal" && s.status === "Paid").length;
  const renUnpaid = fSubs.filter((s) => s.type === "Renewal" && s.status !== "Paid").length;

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

      {/* Filter bar */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Filter size={13} className="text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Filters
          </span>
        </div>

        {/* Preset buttons + date range */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(Object.keys(PRESET_LABELS) as DatePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filters.preset === p
                  ? "bg-accent text-white"
                  : "border border-border bg-white text-navy hover:border-accent"
              }`}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
          <div className="ml-1 flex items-center gap-2">
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, preset: "all", from: e.target.value }))}
              className="rounded-lg border border-input bg-background px-2 py-1 text-xs focus:border-accent focus:outline-none"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, preset: "all", to: e.target.value }))}
              className="rounded-lg border border-input bg-background px-2 py-1 text-xs focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Dimension filters */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Sel
            label="Category"
            value={filters.category}
            options={REPORT_CATEGORIES}
            onChange={(v) => setF("category", v)}
          />
          <Sel
            label="City"
            value={filters.city}
            options={REPORT_CITIES}
            onChange={(v) => setF("city", v)}
          />
          <Sel
            label="State"
            value={filters.state}
            options={REPORT_STATES}
            onChange={(v) => setF("state", v)}
          />
          <Sel
            label="Builder"
            value={filters.builder}
            options={REPORT_BUILDERS}
            onChange={(v) => setF("builder", v)}
          />
          <Sel
            label="Supervisor"
            value={filters.supervisor}
            options={REPORT_SUPERVISORS}
            onChange={(v) => setF("supervisor", v)}
            locked={!!defaultSupervisor}
          />
          <Sel
            label="Sales Staff"
            value={filters.sales}
            options={REPORT_SALES}
            onChange={(v) => setF("sales", v)}
            locked={!!defaultSales}
          />
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
          {fUsers.length} Users
        </span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          {fSubs.length} Subscriptions ({freshPaid}F-Paid · {freshUnpaid}F-Unpaid · {renPaid}R-Paid
          · {renUnpaid}R-Other)
        </span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
          {fVisits.length} Site Visits
        </span>
        <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
          {fAgents.length} Agent Regs
        </span>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
          {fTickets.length} Tickets ·{" "}
          {resolvedTickets.length > 0 ? Math.round((withinTAT / resolvedTickets.length) * 100) : 0}%
          within TAT
        </span>
      </div>

      {/* ── Registered Users ───────────────────────────────────── */}
      <RptSection
        title="Registered Users"
        count={fUsers.length}
        onExport={() =>
          dlCSV(
            "registered-users.csv",
            [
              "ID",
              "Name",
              "Email",
              "Phone",
              "Category",
              "City",
              "State",
              "Builder",
              "Supervisor",
              "Sales Staff",
              "Registered On",
              "Status",
            ],
            fUsers.map((u) => [
              u.id,
              u.name,
              u.email,
              u.phone,
              u.category,
              u.city,
              u.state,
              u.builder,
              u.supervisor,
              u.salesStaff,
              u.registeredOn,
              u.status,
            ]),
          )
        }
      >
        {fUsers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No records match the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto"><table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>City</th>
                <th>State</th>
                <th>Builder</th>
                <th>Supervisor</th>
                <th>Sales</th>
                <th>Registered</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fUsers.map((u) => (
                <tr key={u.id}>
                  <td className="font-mono text-xs">{u.id}</td>
                  <td>
                    <div className="font-semibold text-navy">{u.name}</div>
                    <div className="text-[10px] text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="text-xs">{u.category}</td>
                  <td className="text-xs">{u.city}</td>
                  <td className="text-xs text-muted-foreground">{u.state}</td>
                  <td className="text-xs">{u.builder}</td>
                  <td className="text-xs">{u.supervisor}</td>
                  <td className="text-xs">{u.salesStaff}</td>
                  <td className="font-mono text-xs">{u.registeredOn}</td>
                  <td>
                    <Badge tone={u.status === "Active" ? "success" : "warm"}>{u.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </RptSection>

      {/* ── Subscriptions ──────────────────────────────────────── */}
      <RptSection
        title="Subscriptions"
        count={fSubs.length}
        onExport={() =>
          dlCSV(
            "subscriptions.csv",
            [
              "ID",
              "User",
              "Plan",
              "Amount (₹)",
              "Category",
              "City",
              "State",
              "Builder",
              "Supervisor",
              "Sales",
              "Type",
              "Status",
              "Subscribed On",
              "Due Date",
            ],
            fSubs.map((s) => [
              s.id,
              s.userName,
              s.plan,
              s.amount,
              s.category,
              s.city,
              s.state,
              s.builder,
              s.supervisor,
              s.salesStaff,
              s.type,
              s.status,
              s.subscribedOn,
              s.dueDate,
            ]),
          )
        }
      >
        {fSubs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No records match the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto"><table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th>
                <th>User</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Status</th>
                <th>City</th>
                <th>Supervisor</th>
                <th>Sales</th>
                <th>Subscribed</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {fSubs.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-xs">{s.id}</td>
                  <td className="font-semibold text-navy">{s.userName}</td>
                  <td className="text-xs">{s.plan}</td>
                  <td className="font-mono text-xs">₹{s.amount.toLocaleString("en-IN")}</td>
                  <td>
                    <Badge tone={s.type === "Fresh" ? "new" : "warm"}>{s.type}</Badge>
                  </td>
                  <td>
                    <Badge
                      tone={
                        s.status === "Paid"
                          ? "success"
                          : s.status === "Follow-up"
                            ? "warm"
                            : s.status === "Not Interested"
                              ? "cold"
                              : "hot"
                      }
                    >
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

      {/* ── Site Visits ────────────────────────────────────────── */}
      <RptSection
        title="Site Visits"
        count={fVisits.length}
        onExport={() =>
          dlCSV(
            "site-visits.csv",
            [
              "ID",
              "Lead Name",
              "Property",
              "City",
              "State",
              "Builder",
              "Supervisor",
              "Sales Staff",
              "Category",
              "Scheduled On",
              "Status",
            ],
            fVisits.map((v) => [
              v.id,
              v.leadName,
              v.property,
              v.city,
              v.state,
              v.builder,
              v.supervisor,
              v.salesStaff,
              v.category,
              v.scheduledOn,
              v.status,
            ]),
          )
        }
      >
        {fVisits.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No records match the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto"><table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th>
                <th>Lead</th>
                <th>Property</th>
                <th>City</th>
                <th>Builder</th>
                <th>Supervisor</th>
                <th>Sales</th>
                <th>Category</th>
                <th>Scheduled</th>
                <th>Status</th>
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
                    <Badge
                      tone={
                        v.status === "Completed"
                          ? "success"
                          : v.status === "Scheduled"
                            ? "new"
                            : v.status === "Cancelled"
                              ? "warm"
                              : "hot"
                      }
                    >
                      {v.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </RptSection>

      {/* ── Agent Registrations ────────────────────────────────── */}
      <RptSection
        title="Agent Registrations"
        count={fAgents.length}
        onExport={() =>
          dlCSV(
            "agent-registrations.csv",
            ["ID", "Name", "City", "State", "RERA Number", "Registered On", "Status"],
            fAgents.map((a) => [a.id, a.name, a.city, a.state, a.rera, a.registeredOn, a.status]),
          )
        }
      >
        {fAgents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No records match the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto"><table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th>
                <th>Name</th>
                <th>City</th>
                <th>State</th>
                <th>RERA Number</th>
                <th>Registered On</th>
                <th>Status</th>
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
                    <Badge
                      tone={
                        a.status === "Active" ? "success" : a.status === "Pending" ? "warm" : "hot"
                      }
                    >
                      {a.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </RptSection>

      {/* ── Support Tickets (TAT) ──────────────────────────────── */}
      <RptSection
        title="Support Tickets (TAT)"
        count={fTickets.length}
        onExport={() =>
          dlCSV(
            "support-tickets.csv",
            [
              "ID",
              "Subject",
              "Raised By",
              "Category",
              "City",
              "State",
              "Assigned To",
              "Supervisor",
              "Raised On",
              "Resolved On",
              "TAT (hrs)",
              "Actual (hrs)",
              "Status",
              "Within TAT",
            ],
            fTickets.map((t) => [
              t.id,
              t.subject,
              t.raisedBy,
              t.category,
              t.city,
              t.state,
              t.assignedTo,
              t.supervisor,
              t.raisedOn,
              t.resolvedOn ?? "—",
              t.tatHours,
              t.actualHours ?? "—",
              t.status,
              t.withinTAT === null ? "—" : t.withinTAT ? "Yes" : "No",
            ]),
          )
        }
      >
        {fTickets.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No records match the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto"><table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th>
                <th>Subject</th>
                <th>Raised By</th>
                <th>Category</th>
                <th>City</th>
                <th>Assigned To</th>
                <th>Raised On</th>
                <th>TAT</th>
                <th>Actual</th>
                <th>Status</th>
                <th>Within TAT</th>
              </tr>
            </thead>
            <tbody>
              {fTickets.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono text-xs">{t.id}</td>
                  <td className="max-w-[180px] truncate text-xs font-semibold text-navy">
                    {t.subject}
                  </td>
                  <td className="text-xs">{t.raisedBy}</td>
                  <td className="text-xs">{t.category}</td>
                  <td className="text-xs">{t.city}</td>
                  <td className="text-xs">{t.assignedTo}</td>
                  <td className="font-mono text-xs">{t.raisedOn}</td>
                  <td className="font-mono text-xs">{t.tatHours}h</td>
                  <td className="font-mono text-xs">
                    {t.actualHours != null ? `${t.actualHours}h` : "—"}
                  </td>
                  <td>
                    <Badge
                      tone={
                        t.status === "Resolved"
                          ? "success"
                          : t.status === "Escalated"
                            ? "hot"
                            : "warm"
                      }
                    >
                      {t.status}
                    </Badge>
                  </td>
                  <td>
                    {t.withinTAT === null ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <Badge tone={t.withinTAT ? "success" : "hot"}>
                        {t.withinTAT ? "Yes" : "Breached"}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </RptSection>
    </div>
  );
}
