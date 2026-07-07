"use client";
import Link from "next/link";
import { Phone, MapPin } from "lucide-react";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { teamMembers } from "@/data/static";
import { PageHead } from "./shared";

const dailyTargets = [
  { rep: "Priya Sharma", calls: 8, callTarget: 12, visits: 2, visitTarget: 3 },
  { rep: "Karan Joshi", calls: 11, callTarget: 12, visits: 3, visitTarget: 3 },
  { rep: "Anita Rao", calls: 5, callTarget: 12, visits: 1, visitTarget: 3 },
  { rep: "Devansh Patel", calls: 7, callTarget: 12, visits: 2, visitTarget: 3 },
];

const repCallsToday: Record<string, number> = {
  "Priya Sharma": 8,
  "Karan Joshi": 11,
  "Anita Rao": 5,
  "Devansh Patel": 7,
};

const repStatus: Record<string, "green" | "amber"> = {
  "Priya Sharma": "green",
  "Karan Joshi": "green",
  "Anita Rao": "amber",
  "Devansh Patel": "green",
};

export function DashboardTab() {
  const team = teamMembers.slice(0, 4);
  const statsQ = trpc.leads.stats.useQuery();
  const s = statsQ.data;
  const openLeads = s ? s.hot + s.warm + s.cold + s.new : 0;
  const conversionRate = s && s.total > 0 ? Math.round((s.converted / s.total) * 100) : 0;

  return (
    <>
      <PageHead title="Team Dashboard" sub="Live lead pipeline across your team." />

      {/* 6 stat cards — lead pipeline from leads.stats */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Team Open Leads" value={s ? String(openLeads) : "…"} sub="hot + warm + cold + new" />
        <StatCard label="Hot Leads" value={s ? String(s.hot) : "…"} sub="need action" accent="text-red-500" />
        <StatCard label="Converted" value={s ? String(s.converted) : "…"} sub="closed deals" accent="text-emerald-600" />
        <StatCard label="Conversion Rate" value={s ? `${conversionRate}%` : "…"} sub={s ? `of ${s.total} leads` : ""} />
        <StatCard label="Total Leads" value={s ? String(s.total) : "…"} sub="all-time" />
        <StatCard label="Lost" value={s ? String(s.lost) : "…"} sub="closed-lost" />
      </div>

      {/* Team members */}
      <Section title="Team Members — Live Status">
        {team.map((m) => (
          <div key={m.id} className="border-b border-border py-4 last:border-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Status dot */}
                <div className="relative">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-mid-blue text-white font-semibold text-sm">
                    {m.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${repStatus[m.name] === "green" ? "bg-emerald-500" : "bg-amber-400"}`}
                  />
                </div>
                <div>
                  <div className="font-semibold text-navy">{m.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.city} · {m.leadsOpen} open · {m.closedMTD} closed
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Calls today */}
                <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone size={11} />
                  <span>{repCallsToday[m.name] ?? 0} calls today</span>
                </div>
                <Badge tone="success">Online</Badge>
                <Link
                  href="/supervisor-portal#performance"
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-accent hover:text-accent"
                >
                  View
                </Link>
              </div>
            </div>
            {/* Conversion bar */}
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr]">
              <div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Target</span>
                  <span className="font-mono">{m.achieved}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${m.achieved}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Conversion</span>
                  <span className="font-mono">{m.conversion}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary">
                  <div
                    className="h-1.5 rounded-full bg-mid-blue transition-all"
                    style={{ width: `${m.conversion}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </Section>

      {/* Daily Targets */}
      <Section title="Daily Targets — Today">
        <div className="space-y-5">
          {dailyTargets.map((dt) => (
            <div key={dt.rep}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-navy">{dt.rep}</span>
                <span className="text-[10px] text-muted-foreground">
                  {dt.calls}/{dt.callTarget} calls · {dt.visits}/{dt.visitTarget} visits
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                    <Phone size={9} /> Calls
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(100, (dt.calls / dt.callTarget) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                    <MapPin size={9} /> Visits
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-mid-blue transition-all"
                      style={{ width: `${Math.min(100, (dt.visits / dt.visitTarget) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
