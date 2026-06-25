"use client";
import { useContext } from "react";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { SupportPortalContext } from "@/lib/support-portal-context";
import { SupportDashboardHeader } from "@/components/support-portal/SupportDashboardHeader";
import {
  PageHead,
  type DbTicket,
  isEscalated,
  capitalize,
  fmtTicketDate,
} from "./shared";

export function EscalationsTab() {
  const ctx = useContext(SupportPortalContext);
  const startDate = ctx?.startDate?.toISOString().slice(0, 10);
  const endDate = ctx?.endDate?.toISOString().slice(0, 10);
  const jobRoles = ctx?.selectedJobRoles ?? [];

  const listQ = trpc.tickets.list.useQuery({
    limit: 100,
    startDate,
    endDate,
    jobRole: jobRoles.length ? jobRoles : undefined,
  });
  const updateTicket = trpc.tickets.update.useMutation({
    onSuccess: () => listQ.refetch(),
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const all = (listQ.data?.items ?? []) as unknown as DbTicket[];

  const escalated = all.filter(
    (t) => isEscalated(t.priority) && t.status !== "resolved" && t.status !== "closed",
  );
  const openCount = all.filter((t) => t.status === "open").length;

  const resolve = (id: string) =>
    updateTicket.mutate({ id, status: "resolved" }, { onSuccess: () => toast.success("Ticket resolved") });

  return (
    <>
      <PageHead
        title="Escalations"
        subtitle="High-priority tickets requiring urgent attention or management intervention."
      />
      <SupportDashboardHeader />
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
