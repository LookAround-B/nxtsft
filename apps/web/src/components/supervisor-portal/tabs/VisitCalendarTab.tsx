"use client";
import { useMemo } from "react";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { VisitsMap, type VisitPoint } from "@/components/map/VisitsMap";
import { categoryColor } from "@/lib/map";
import { trpc } from "@/lib/trpc";
import { PageHead } from "./shared";

const statusTone: Record<string, "success" | "warm" | "cold" | "new" | "default"> = {
  Scheduled: "new",
  Completed: "success",
  Cancelled: "cold",
  Rescheduled: "warm",
};

export function VisitCalendarTab() {
  const visitsQ = trpc.siteVisits.mapData.useQuery();
  const visits = useMemo(() => (visitsQ.data ?? []) as VisitPoint[], [visitsQ.data]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { Scheduled: 0, Completed: 0, Cancelled: 0, Rescheduled: 0 };
    for (const v of visits) c[v.status] = (c[v.status] ?? 0) + 1;
    return c;
  }, [visits]);

  const reps = useMemo(() => new Set(visits.map((v) => v.rep)).size, [visits]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <PageHead title="Visit Calendar" sub="Geographic spread of site visits across the team — colour-coded by rep." />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Visits" value={String(visits.length)} sub="all statuses" />
        <StatCard label="Scheduled" value={String(counts.Scheduled)} sub="upcoming" />
        <StatCard label="Completed" value={String(counts.Completed)} sub="done" />
        <StatCard label="Active Reps" value={String(reps)} sub="on the map" />
      </div>

      <Section title="Geographic View">
        {visitsQ.isLoading ? (
          <div className="flex h-96 items-center justify-center rounded-xl border border-border bg-secondary/30">
            <p className="text-sm text-muted-foreground">Loading map…</p>
          </div>
        ) : (
          <VisitsMap visits={visits} className="h-[28rem]" />
        )}
      </Section>

      <Section title="All Scheduled Visits" action={<Badge tone="new">{visits.length} visits</Badge>}>
        {visitsQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading visits…</p>
        ) : visits.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No site visits scheduled yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {visits.map((v) => {
              const color = categoryColor(v.rep);
              return (
                <div key={v.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-navy">{v.property}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color.hex }} />
                      {v.rep}
                      {(v.locality || v.city) && (
                        <span className="text-muted-foreground/70">
                          · {[v.locality, v.city].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">{fmtDate(v.scheduledAt)}</span>
                    <Badge tone={statusTone[v.status] ?? "default"}>{v.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
