"use client";
import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Ticket,
  AlertTriangle,
  UserCheck,
  BarChart2,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PortalShell, StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { useActiveHash } from "@/lib/use-active-hash";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { reportTickets } from "@/data/reports";

/* ─── Types ─────────────────────────────────────────────────── */
type TicketStatus = "Open" | "Resolved" | "Escalated";

/* ─── DB ticket mapping (tickets.* router) ──────────────────── */
type DbTicket = {
  id: string;
  subject: string;
  category: string; // payment | property | agent | technical | other
  priority: string; // low | medium | high | urgent
  status: string; // open | in_progress | resolved | closed
  assignedTo: string | null;
  createdAt: string;
  resolvedAt: string | null;
  user: { id: string; name: string; email: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const isEscalated = (priority: string) => priority === "high" || priority === "urgent";

const ticketTone = (t: DbTicket): "success" | "hot" | "warm" | "default" => {
  if (t.status === "resolved" || t.status === "closed") return "success";
  if (isEscalated(t.priority)) return "hot";
  return "warm";
};

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const fmtTicketDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: filename,
  });
  a.click();
};

/* ─── Nav ─────────────────────────────────────────────────────── */
const nav = [
  { label: "Dashboard", to: "/support-portal", icon: <LayoutDashboard size={14} /> },
  { label: "Ticket Queue", to: "/support-portal#queue", icon: <Ticket size={14} /> },
  { label: "Escalations", to: "/support-portal#escalations", icon: <AlertTriangle size={14} /> },
  { label: "My Assignments", to: "/support-portal#mine", icon: <UserCheck size={14} /> },
  { label: "TAT Report", to: "/support-portal#tat", icon: <BarChart2 size={14} /> },
  { label: "Knowledge Base", to: "/support-portal#kb", icon: <BookOpen size={14} /> },
];

/* ─── Root page ──────────────────────────────────────────────── */
export default function SupportPortal() {
  const { session } = useAuth();
  const router = useRouter();
  const hash = useActiveHash();

  useEffect(() => {
    if (session !== undefined && !session) router.push("/admin-login");
  }, [session, router]);

  if (!session) return null;
  const user = { name: session.name, initials: session.initials };

  return (
    <PortalShell
      brand="NxtSft.com Support"
      role="Support Admin"
      accent="blue"
      user={user}
      nav={nav}
      basePath="/support-portal"
    >
      {renderTab(hash)}
    </PortalShell>
  );
}

function renderTab(h: string) {
  switch (h) {
    case "queue":
      return <QueueTab />;
    case "escalations":
      return <EscalationsTab />;
    case "mine":
      return <MyAssignmentsTab />;
    case "tat":
      return <TATReportTab />;
    case "kb":
      return <KnowledgeBaseTab />;
    default:
      return <Dashboard />;
  }
}

function PageHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-bold text-navy">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════ */
function Dashboard() {
  const statsQ = trpc.tickets.stats.useQuery();
  const listQ = trpc.tickets.list.useQuery({ limit: 100 });
  const s = statsQ.data;
  const items = (listQ.data?.items ?? []) as unknown as DbTicket[];

  const escalated = s ? s.byPriority.high + s.byPriority.urgent : 0;
  const recent = items.slice(0, 5);

  const categoryCount: Record<string, number> = {};
  for (const t of items) categoryCount[capitalize(t.category)] = (categoryCount[capitalize(t.category)] ?? 0) + 1;

  return (
    <>
      <PageHead
        title="Support Dashboard"
        subtitle="Live overview of all support tickets across the platform."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Open Tickets" value={s ? String(s.open) : "…"} sub="needs action" accent="text-amber-600" />
        <StatCard label="Escalated" value={s ? String(escalated) : "…"} sub="high / urgent priority" accent="text-red-600" />
        <StatCard label="In Progress" value={s ? String(s.inProgress) : "…"} sub="being handled" />
        <StatCard label="Resolved" value={s ? String(s.resolved) : "…"} sub={s ? `of ${s.total} total` : ""} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Recent Tickets">
          {listQ.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No tickets yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th className="py-2">ID</th>
                    <th>Subject</th>
                    <th>Raised By</th>
                    <th>Status</th>
                    <th>Raised On</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((t) => (
                    <tr key={t.id}>
                      <td className="font-mono text-xs">{t.id.slice(0, 8)}</td>
                      <td className="max-w-[160px] truncate text-sm font-semibold text-navy">{t.subject}</td>
                      <td className="text-xs">{t.user?.name ?? "—"}</td>
                      <td><Badge tone={ticketTone(t)}>{STATUS_LABEL[t.status] ?? t.status}</Badge></td>
                      <td className="font-mono text-xs">{fmtTicketDate(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Tickets by Category">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(categoryCount).map(([cat, count]) => {
                const pct = Math.round((count / items.length) * 100);
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-xs font-semibold text-navy">{cat}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-secondary h-3">
                      <div className="h-3 rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 shrink-0 text-right font-mono text-xs font-bold text-navy">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   TICKET QUEUE
═══════════════════════════════════════════════════════════ */
function QueueTab() {
  const listQ = trpc.tickets.list.useQuery({ limit: 100 });
  const updateTicket = trpc.tickets.update.useMutation({
    onSuccess: () => listQ.refetch(),
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const all = (listQ.data?.items ?? []) as unknown as DbTicket[];

  const [statusFilter, setStatusFilter] = useState("All");
  const [catFilter, setCatFilter] = useState("All");
  const [search, setSearch] = useState("");

  const categories = ["All", ...Array.from(new Set(all.map((t) => capitalize(t.category))))];

  const filtered = all.filter((t) => {
    if (statusFilter === "Escalated") {
      if (!isEscalated(t.priority)) return false;
    } else if (statusFilter !== "All" && (STATUS_LABEL[t.status] ?? t.status) !== statusFilter) {
      return false;
    }
    if (catFilter !== "All" && capitalize(t.category) !== catFilter) return false;
    if (
      search &&
      !t.subject.toLowerCase().includes(search.toLowerCase()) &&
      !(t.user?.name ?? "").toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const resolve = (id: string) =>
    updateTicket.mutate({ id, status: "resolved" }, { onSuccess: () => toast.success("Ticket resolved") });
  const escalate = (id: string) =>
    updateTicket.mutate({ id, priority: "urgent" }, { onSuccess: () => toast.success("Ticket escalated") });

  return (
    <>
      <PageHead
        title="Ticket Queue"
        subtitle="All incoming support tickets with assignment and action controls."
        action={
          <button
            onClick={() =>
              downloadCSV(
                "ticket-queue.csv",
                ["ID", "Subject", "Raised By", "Category", "Priority", "Assigned To", "Status", "Raised On"],
                filtered.map((t) => [
                  t.id,
                  t.subject,
                  t.user?.name ?? "",
                  capitalize(t.category),
                  capitalize(t.priority),
                  t.assignedTo ?? "",
                  STATUS_LABEL[t.status] ?? t.status,
                  fmtTicketDate(t.createdAt),
                ]),
              )
            }
            className="text-xs font-semibold text-accent hover:underline"
          >
            Export CSV →
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          placeholder="Search subject or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger size="sm" className="min-w-[8rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["All", "Open", "In Progress", "Resolved", "Closed", "Escalated"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger size="sm" className="min-w-[8rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Section title={listQ.isLoading ? "Loading…" : `${filtered.length} tickets`}>
        {listQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading tickets…</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No tickets match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2">ID</th>
                  <th>Subject</th>
                  <th>Raised By</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Assigned To</th>
                  <th>Raised On</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const done = t.status === "resolved" || t.status === "closed";
                  return (
                    <tr key={t.id}>
                      <td className="font-mono text-xs">{t.id.slice(0, 8)}</td>
                      <td className="max-w-[160px] truncate text-sm font-semibold text-navy">{t.subject}</td>
                      <td className="text-xs">{t.user?.name ?? "—"}</td>
                      <td className="text-xs">{capitalize(t.category)}</td>
                      <td className="text-xs">
                        <span className={isEscalated(t.priority) ? "font-semibold text-red-600" : ""}>
                          {capitalize(t.priority)}
                        </span>
                      </td>
                      <td className="text-xs">{t.assignedTo ?? "—"}</td>
                      <td className="font-mono text-xs">{fmtTicketDate(t.createdAt)}</td>
                      <td><Badge tone={ticketTone(t)}>{STATUS_LABEL[t.status] ?? t.status}</Badge></td>
                      <td className="text-right">
                        {done ? (
                          <span className="text-xs text-muted-foreground">{fmtTicketDate(t.resolvedAt)}</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => resolve(t.id)}
                              disabled={updateTicket.isPending}
                              className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-600 transition disabled:opacity-50"
                            >
                              Resolve
                            </button>
                            {!isEscalated(t.priority) && (
                              <button
                                onClick={() => escalate(t.id)}
                                disabled={updateTicket.isPending}
                                className="rounded-md bg-red-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-600 transition disabled:opacity-50"
                              >
                                Escalate
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ESCALATIONS
═══════════════════════════════════════════════════════════ */
function EscalationsTab() {
  const listQ = trpc.tickets.list.useQuery({ limit: 100 });
  const updateTicket = trpc.tickets.update.useMutation({
    onSuccess: () => listQ.refetch(),
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const all = (listQ.data?.items ?? []) as unknown as DbTicket[];

  const escalated = all.filter((t) => isEscalated(t.priority) && t.status !== "resolved" && t.status !== "closed");
  const openCount = all.filter((t) => t.status === "open").length;

  const resolve = (id: string) =>
    updateTicket.mutate({ id, status: "resolved" }, { onSuccess: () => toast.success("Ticket resolved") });

  return (
    <>
      <PageHead
        title="Escalations"
        subtitle="High-priority tickets requiring urgent attention or management intervention."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Escalated" value={String(escalated.length)} sub="active" accent="text-red-600" />
        <StatCard label="Open Tickets" value={String(openCount)} sub="platform-wide" accent="text-amber-600" />
        <StatCard label="Total" value={String(all.length)} sub="all tickets" />
      </div>

      {listQ.isLoading ? (
        <Section title="Escalated Tickets">
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        </Section>
      ) : escalated.length === 0 ? (
        <Section title="Escalated Tickets">
          <p className="py-8 text-center text-sm text-muted-foreground">No escalated tickets — all clear!</p>
        </Section>
      ) : (
        <Section title={`${escalated.length} escalated tickets`}>
          <div className="space-y-4">
            {escalated.map((t) => (
              <div key={t.id} className="rounded-xl border-2 border-red-200 bg-red-50/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{t.id.slice(0, 8)}</span>
                      <Badge tone="hot">{capitalize(t.priority)}</Badge>
                    </div>
                    <div className="mt-1 font-display text-base font-bold text-navy">{t.subject}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Raised by {t.user?.name ?? "—"} · {capitalize(t.category)} · Raised: {fmtTicketDate(t.createdAt)}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-navy">
                      Assigned to: {t.assignedTo ?? "Unassigned"}
                    </div>
                  </div>
                  <button
                    onClick={() => resolve(t.id)}
                    disabled={updateTicket.isPending}
                    className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600 transition disabled:opacity-50"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   MY ASSIGNMENTS
═══════════════════════════════════════════════════════════ */
function MyAssignmentsTab() {
  const { session } = useAuth();
  const listQ = trpc.tickets.list.useQuery({ limit: 100 });
  const updateTicket = trpc.tickets.update.useMutation({
    onSuccess: () => listQ.refetch(),
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const all = (listQ.data?.items ?? []) as unknown as DbTicket[];

  const mine = all.filter((t) => session && t.assignedTo === session.id);
  const openCount = mine.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const resolvedCount = mine.filter((t) => t.status === "resolved" || t.status === "closed").length;

  const resolve = (id: string) =>
    updateTicket.mutate({ id, status: "resolved" }, { onSuccess: () => toast.success("Ticket resolved") });

  return (
    <>
      <PageHead title="My Assignments" subtitle="Tickets assigned to you — respond within SLA." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Assigned to Me" value={String(mine.length)} sub="total" />
        <StatCard label="Open" value={String(openCount)} sub="action needed" accent="text-amber-600" />
        <StatCard label="Resolved" value={String(resolvedCount)} sub="this period" />
      </div>
      <Section title="My Queue">
        {listQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : mine.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No tickets assigned to you.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2">ID</th>
                  <th>Subject</th>
                  <th>Raised By</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((t) => {
                  const done = t.status === "resolved" || t.status === "closed";
                  return (
                    <tr key={t.id}>
                      <td className="font-mono text-xs">{t.id.slice(0, 8)}</td>
                      <td className="font-semibold text-navy">{t.subject}</td>
                      <td className="text-xs">{t.user?.name ?? "—"}</td>
                      <td className="text-xs">{capitalize(t.category)}</td>
                      <td className="text-xs">{capitalize(t.priority)}</td>
                      <td><Badge tone={ticketTone(t)}>{STATUS_LABEL[t.status] ?? t.status}</Badge></td>
                      <td className="text-right">
                        {!done && (
                          <button
                            onClick={() => resolve(t.id)}
                            disabled={updateTicket.isPending}
                            className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600 transition disabled:opacity-50"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAT REPORT
═══════════════════════════════════════════════════════════ */
function TATReportTab() {
  const resolved = reportTickets.filter((t) => t.status === "Resolved");
  const withinTAT = resolved.filter((t) => t.withinTAT === true).length;
  const breached = resolved.filter((t) => t.withinTAT === false).length;
  const tatPct = resolved.length > 0 ? Math.round((withinTAT / resolved.length) * 100) : 0;
  const avgActual =
    resolved.length > 0
      ? Math.round(resolved.reduce((s, t) => s + (t.actualHours ?? 0), 0) / resolved.length)
      : 0;

  const byAgent: Record<string, { total: number; within: number }> = {};
  for (const t of resolved) {
    if (!byAgent[t.assignedTo]) byAgent[t.assignedTo] = { total: 0, within: 0 };
    byAgent[t.assignedTo].total++;
    if (t.withinTAT) byAgent[t.assignedTo].within++;
  }

  return (
    <>
      <PageHead
        title="TAT Report"
        subtitle="Turnaround time analysis for resolved support tickets."
        action={
          <button
            onClick={() =>
              downloadCSV(
                "tat-report.csv",
                [
                  "ID",
                  "Subject",
                  "Category",
                  "City",
                  "Assigned To",
                  "TAT (hrs)",
                  "Actual (hrs)",
                  "Status",
                  "Within TAT",
                ],
                reportTickets.map((t) => [
                  t.id,
                  t.subject,
                  t.category,
                  t.city,
                  t.assignedTo,
                  t.tatHours,
                  t.actualHours ?? "Open",
                  t.status,
                  t.withinTAT === null ? "Open" : t.withinTAT ? "Yes" : "No",
                ]),
              )
            }
            className="text-xs font-semibold text-accent hover:underline"
          >
            Export CSV →
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Resolved" value={String(resolved.length)} />
        <StatCard label="Within TAT" value={String(withinTAT)} sub={`${tatPct}%`} />
        <StatCard
          label="TAT Breached"
          value={String(breached)}
          sub="need review"
          accent="text-red-600"
        />
        <StatCard label="Avg Resolution" value={`${avgActual}h`} sub="actual time" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="TAT Performance by Agent">
          <div className="space-y-3">
            {Object.entries(byAgent).map(([agent, { total, within }]) => {
              const pct = Math.round((within / total) * 100);
              return (
                <div key={agent} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs font-semibold text-navy">
                    {agent.split(" ")[0]}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-secondary h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right font-mono text-xs">
                    {within}/{total} · {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="All Tickets — TAT Detail">
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2">ID</th>
                  <th>Subject</th>
                  <th>TAT</th>
                  <th>Actual</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {reportTickets.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs">{t.id}</td>
                    <td className="max-w-[160px] truncate text-xs font-semibold text-navy">
                      {t.subject}
                    </td>
                    <td className="font-mono text-xs">{t.tatHours}h</td>
                    <td className="font-mono text-xs">
                      {t.actualHours != null ? `${t.actualHours}h` : "—"}
                    </td>
                    <td>
                      {t.withinTAT === null ? (
                        <Badge tone="warm">Open</Badge>
                      ) : (
                        <Badge tone={t.withinTAT ? "success" : "hot"}>
                          {t.withinTAT ? "✓ Within TAT" : "✗ Breached"}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   KNOWLEDGE BASE
═══════════════════════════════════════════════════════════ */
const KB_ARTICLES = [
  {
    id: "KB-01",
    title: "How to resolve billing disputes",
    category: "Billing",
    views: 142,
    updated: "2026-05-30",
  },
  {
    id: "KB-02",
    title: "Listing accuracy correction workflow",
    category: "Listing Accuracy",
    views: 98,
    updated: "2026-06-01",
  },
  {
    id: "KB-03",
    title: "Technical troubleshooting — OTP",
    category: "Technical",
    views: 87,
    updated: "2026-06-04",
  },
  {
    id: "KB-04",
    title: "Site visit cancellation process",
    category: "Site Visit",
    views: 64,
    updated: "2026-05-28",
  },
  {
    id: "KB-05",
    title: "RERA compliance verification",
    category: "Compliance",
    views: 55,
    updated: "2026-06-02",
  },
  {
    id: "KB-06",
    title: "Escalation policy and SLA thresholds",
    category: "Process",
    views: 211,
    updated: "2026-06-06",
  },
  {
    id: "KB-07",
    title: "Contact quality standards",
    category: "Contact Quality",
    views: 73,
    updated: "2026-05-25",
  },
];

function KnowledgeBaseTab() {
  const [search, setSearch] = useState("");
  const filtered = KB_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <PageHead
        title="Knowledge Base"
        subtitle="SOP articles, troubleshooting guides and escalation policies."
        action={
          <button
            onClick={() => toast.success("New article draft created")}
            className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition"
          >
            + New Article
          </button>
        }
      />

      <div className="mb-4">
        <input
          placeholder="Search articles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <Section title={`${filtered.length} articles`}>
        <div className="space-y-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0"
            >
              <div>
                <div className="font-semibold text-navy">{a.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {a.category} · {a.views} views · Updated {a.updated}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="new">{a.category}</Badge>
                <button
                  onClick={() => toast(`Opening: ${a.title}`)}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  View →
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
