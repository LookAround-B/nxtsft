"use client";
import { useContext } from "react";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { SupportPortalContext } from "@/lib/support-portal-context";
import { SupportDashboardHeader } from "@/components/support-portal/SupportDashboardHeader";
import { PageHead, type DbTicket, STATUS_LABEL, ticketTone, capitalize, fmtTicketDate } from "./shared";

export function DashboardTab() {
  const ctx = useContext(SupportPortalContext);
  const startDate = ctx?.startDate?.toISOString().slice(0, 10);
  const endDate = ctx?.endDate?.toISOString().slice(0, 10);
  const jobRoles = ctx?.selectedJobRoles ?? [];

  const statsQ = trpc.tickets.stats.useQuery({
    startDate,
    endDate,
    jobRole: jobRoles.length ? jobRoles : undefined,
  });
  const listQ = trpc.tickets.list.useQuery({
    limit: 100,
    startDate,
    endDate,
    jobRole: jobRoles.length ? jobRoles : undefined,
  });
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

      <SupportDashboardHeader />

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
