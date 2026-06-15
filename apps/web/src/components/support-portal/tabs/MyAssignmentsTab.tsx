"use client";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth";
import {
  PageHead,
  type DbTicket,
  STATUS_LABEL,
  ticketTone,
  capitalize,
} from "./shared";

export function MyAssignmentsTab() {
  const { session } = useAuth();
  const listQ = trpc.tickets.list.useQuery({ limit: 100 });
  const updateTicket = trpc.tickets.update.useMutation({
    onSuccess: () => listQ.refetch(),
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const all = (listQ.data?.items ?? []) as unknown as DbTicket[];

  const mine = all.filter((t) => session && t.assignedTo === (session as { id?: string }).id);
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
