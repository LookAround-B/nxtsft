"use client";
import { Trophy } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { teamMembers } from "@/data/static";
import { PageHead } from "./shared";

// Weekly trend data (last 4 weeks): closed deals per week
const weeklyTrend: Record<string, number[]> = {
  "Priya Sharma": [1, 2, 1, 4],
  "Karan Joshi": [2, 2, 3, 6],
  "Anita Rao": [0, 1, 1, 2],
  "Devansh Patel": [1, 1, 2, 3],
};

const monthlyTarget = 8;

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-6">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-3 rounded-sm bg-emerald-400 transition-all"
          style={{ height: `${Math.round((v / max) * 100)}%`, minHeight: 2 }}
          title={`Wk ${i + 1}: ${v}`}
        />
      ))}
    </div>
  );
}

export function PerformanceTab() {
  const sorted = [...teamMembers].sort((a, b) => b.closedMTD - a.closedMTD);

  return (
    <>
      <PageHead title="Performance" sub="Rep-level achievement vs targets." />

      {/* Leaderboard */}
      <Section title="Leaderboard — Closed MTD">
        <div className="space-y-3">
          {sorted.map((m, idx) => {
            const gap = Math.max(0, monthlyTarget - m.closedMTD);
            return (
              <div
                key={m.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-slate-50 px-4 py-3"
              >
                {/* Rank */}
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display text-sm font-black
                  ${idx === 0 ? "bg-amber-400 text-white" : idx === 1 ? "bg-slate-300 text-navy" : idx === 2 ? "bg-orange-300 text-white" : "bg-secondary text-muted-foreground"}`}
                >
                  {idx === 0 ? <Trophy size={14} /> : idx + 1}
                </div>
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy text-sm">{m.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {m.city} · {m.conversion}% conversion
                  </div>
                </div>
                {/* Sparkline */}
                <div className="hidden sm:block">
                  <div className="text-[9px] text-muted-foreground mb-1 text-center">4wk trend</div>
                  <Sparkline values={weeklyTrend[m.name] ?? [0, 0, 0, 0]} />
                </div>
                {/* Closed & gap */}
                <div className="text-right flex-shrink-0">
                  <div className="font-display text-xl font-black text-navy">{m.closedMTD}</div>
                  <div className="text-[10px] text-muted-foreground">closed</div>
                </div>
                <div
                  className={`flex-shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${gap === 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
                >
                  {gap === 0 ? "Target hit!" : `-${gap} to go`}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Detailed progress */}
      <Section title="MTD Target Achievement">
        <div className="overflow-x-auto">
          <table className="portal-table w-full text-sm">
            <thead>
              <tr>
                <th className="py-2 text-left">Rep</th>
                <th className="text-left">Closed</th>
                <th className="text-left">Conversion</th>
                <th className="text-left">Achievement</th>
                <th className="text-left">Target Gap</th>
                <th className="text-left">4-Week Trend</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((m) => {
                const gap = Math.max(0, monthlyTarget - m.closedMTD);
                return (
                  <tr key={m.id}>
                    <td className="py-3">
                      <div className="font-semibold text-navy">{m.name}</div>
                      <div className="text-[10px] text-muted-foreground">{m.city}</div>
                    </td>
                    <td className="font-display text-lg font-black text-navy">{m.closedMTD}</td>
                    <td className="text-xs">{m.conversion}%</td>
                    <td className="w-36">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-secondary">
                          <div
                            className="h-1.5 rounded-full bg-emerald-500"
                            style={{ width: `${m.achieved}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground w-10 text-right">
                          {m.achieved}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${gap === 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
                      >
                        {gap === 0 ? "Done" : `${gap} more`}
                      </span>
                    </td>
                    <td>
                      <Sparkline values={weeklyTrend[m.name] ?? [0, 0, 0, 0]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
