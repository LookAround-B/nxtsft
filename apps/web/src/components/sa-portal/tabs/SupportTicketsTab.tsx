"use client";
import { useState } from "react";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { downloadCSV } from "@/lib/download-csv";
import { TabHeader } from "./shared";

export function SupportTicketsTab() {
  const utils = trpc.useUtils();
  const ticketsQ = trpc.tickets.report.useQuery();
  const tickets = ticketsQ.data ?? [];
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "Resolved" | "Escalated">(
    "All",
  );
  const [search, setSearch] = useState("");

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "All" && t.status !== statusFilter) return false;
    if (
      search &&
      !t.subject.toLowerCase().includes(search.toLowerCase()) &&
      !t.raisedBy.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const resolveM = trpc.tickets.update.useMutation({
    onSuccess: () => {
      utils.tickets.report.invalidate();
      toast.success("Ticket resolved");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const resolve = (id: string) => resolveM.mutate({ id, status: "resolved" });

  const open = tickets.filter((t) => t.status === "Open").length;
  const escalated = tickets.filter((t) => t.status === "Escalated").length;
  const resolved = tickets.filter((t) => t.status === "Resolved").length;
  const withinTAT = tickets.filter((t) => t.withinTAT === true).length;
  const tatPct = resolved > 0 ? Math.round((withinTAT / resolved) * 100) : 0;

  return (
    <>
      <TabHeader
        title="Support Tickets"
        subtitle="Platform-wide customer support ticket management and TAT tracking."
        action={
          <button
            onClick={() =>
              downloadCSV(
                "tickets.csv",
                [
                  "ID",
                  "Subject",
                  "Raised By",
                  "Category",
                  "City",
                  "Assigned To",
                  "Supervisor",
                  "Status",
                  "Raised On",
                  "Resolved On",
                  "TAT (hrs)",
                  "Within TAT",
                ],
                tickets.map((t) => [
                  t.id,
                  t.subject,
                  t.raisedBy,
                  t.category,
                  t.city,
                  t.assignedTo,
                  t.supervisor,
                  t.status,
                  t.raisedOn,
                  t.resolvedOn ?? "—",
                  t.tatHours,
                  t.withinTAT === null ? "—" : t.withinTAT ? "Yes" : "No",
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
        <StatCard label="Open" value={String(open)} sub="needs action" accent="text-amber-600" />
        <StatCard
          label="Escalated"
          value={String(escalated)}
          sub="SLA breach"
          accent="text-red-600"
        />
        <StatCard label="Resolved" value={String(resolved)} />
        <StatCard label="Within TAT" value={`${tatPct}%`} sub={`${withinTAT}/${resolved}`} />
      </div>

      <div className="mb-4 mt-2 flex flex-wrap items-center gap-3">
        <input
          placeholder="Search subject or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        {(["All", "Open", "Resolved", "Escalated"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              statusFilter === s
                ? "bg-accent text-white"
                : "border border-border text-navy hover:border-accent"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <Section title={`${filtered.length} tickets`}>
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th>
                <th>Subject</th>
                <th>Raised By</th>
                <th>Category</th>
                <th>City</th>
                <th>Assigned To</th>
                <th>Supervisor</th>
                <th>TAT</th>
                <th>Raised On</th>
                <th>Status</th>
                <th>Within TAT</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono text-xs">{t.id.slice(0, 8)}</td>
                  <td className="max-w-[160px] truncate text-xs font-semibold text-navy">
                    {t.subject}
                  </td>
                  <td className="text-xs">{t.raisedBy}</td>
                  <td className="text-xs">{t.category}</td>
                  <td className="text-xs">{t.city}</td>
                  <td className="text-xs">{t.assignedTo}</td>
                  <td className="text-xs">{t.supervisor}</td>
                  <td className="font-mono text-xs">{t.tatHours}h</td>
                  <td className="font-mono text-xs">{t.raisedOn}</td>
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
                  <td className="text-right">
                    {t.status === "Open" && (
                      <button
                        onClick={() => resolve(t.id)}
                        disabled={resolveM.isPending}
                        className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-600 transition disabled:opacity-60"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
