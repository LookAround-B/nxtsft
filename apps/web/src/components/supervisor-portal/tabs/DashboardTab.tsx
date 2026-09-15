"use client";
import { StatCard } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { PageHead } from "./shared";

export function DashboardTab() {
  const statsQ = trpc.leads.stats.useQuery();
  const teamQ = trpc.supervisor.teamOverview.useQuery();
  const s = statsQ.data;
  const team = teamQ.data;
  const openLeads = s ? s.hot + s.warm + s.cold + s.new : 0;
  const conversionRate = s && s.total > 0 ? Math.round((s.converted / s.total) * 100) : 0;

  return (
    <>
      <PageHead title="Team Dashboard" sub="Live lead pipeline across your team." />

      {/* Lead pipeline — real, from leads.stats */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Team Open Leads" value={s ? String(openLeads) : "…"} sub="hot + warm + cold + new" />
        <StatCard label="Hot Leads" value={s ? String(s.hot) : "…"} sub="need action" accent="text-red-500" />
        <StatCard label="Converted" value={s ? String(s.converted) : "…"} sub="closed deals" accent="text-emerald-600" />
        <StatCard label="Conversion Rate" value={s ? `${conversionRate}%` : "…"} sub={s ? `of ${s.total} leads` : ""} />
        <StatCard label="Total Leads" value={s ? String(s.total) : "…"} sub="all-time" />
        <StatCard label="Lost" value={s ? String(s.lost) : "…"} sub="closed-lost" />
      </div>

      {/* My Team — who the reps are and what each is holding */}
      <div className="mt-8">
        <h3 className="font-display text-lg font-bold text-navy">
          My Team {team ? `(${team.length})` : ""}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">Sales reps reporting to you.</p>

        {teamQ.isLoading && <div className="mt-4 text-sm text-muted-foreground">Loading team…</div>}

        {team && team.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No sales reps assigned to you yet. Ask an admin to attach reps to your team.
          </div>
        )}

        {team && team.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {team.map((rep) => (
              <div
                key={rep.id}
                className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy/5 font-display text-sm font-bold text-navy">
                    {initials(rep.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-navy">{rep.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[rep.city, rep.phone].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <RepStat label="Open" value={rep.open} />
                  <RepStat label="Hot" value={rep.hot} accent="text-red-500" />
                  <RepStat label="Closed" value={rep.converted} accent="text-emerald-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function RepStat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl bg-muted/40 py-2">
      <div className={`font-display text-xl font-black ${accent ?? "text-navy"}`}>{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
