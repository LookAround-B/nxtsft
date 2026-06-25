"use client";
import { useState, useContext } from "react";
import { toast } from "sonner";
import { Section, Badge } from "@/components/portal/PortalShell";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { downloadCSV } from "@/lib/download-csv";
import { SupportPortalContext } from "@/lib/support-portal-context";
import { SupportDashboardHeader } from "@/components/support-portal/SupportDashboardHeader";
import {
  PageHead,
  type DbTicket,
  STATUS_LABEL,
  isEscalated,
  ticketTone,
  capitalize,
  fmtTicketDate,
} from "./shared";

export function QueueTab() {
  const ctx = useContext(SupportPortalContext);
  const startDate = ctx?.startDate?.toISOString().slice(0, 10);
  const endDate = ctx?.endDate?.toISOString().slice(0, 10);
  const filterJobRoles = ctx?.selectedJobRoles ?? [];

  const listQ = trpc.tickets.list.useQuery({
    limit: 100,
    startDate,
    endDate,
    jobRole: filterJobRoles.length ? filterJobRoles : undefined,
  });
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

      <SupportDashboardHeader />

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
