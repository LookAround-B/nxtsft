"use client";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { downloadCSV } from "@/lib/download-csv";
import { PageHead } from "./shared";

export function TATReportTab() {
  const ticketsQ = trpc.tickets.report.useQuery();
  const allTickets = ticketsQ.data ?? [];
  const resolved = allTickets.filter((t) => t.status === "Resolved");
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
                ["ID", "Subject", "Category", "City", "Assigned To", "TAT (hrs)", "Actual (hrs)", "Status", "Within TAT"],
                allTickets.map((t) => [
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
        <StatCard label="TAT Breached" value={String(breached)} sub="need review" accent="text-red-600" />
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
                {allTickets.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs">{t.id.slice(0, 8)}</td>
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
