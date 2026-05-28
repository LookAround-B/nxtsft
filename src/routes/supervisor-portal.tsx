import { createFileRoute } from "@tanstack/react-router";
import { PortalShell, StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { leads, teamMembers, activities } from "@/data/static";

export const Route = createFileRoute("/supervisor-portal")({
  head: () => ({ meta: [{ title: "NestIQ Desk — Supervisor" }] }),
  component: Sup,
});

const nav = [
  { label: "Team Dashboard", to: "/supervisor-portal", icon: "◆" },
  { label: "Team Leads", to: "/supervisor-portal#leads", icon: "✦" },
  { label: "Reassignment", to: "/supervisor-portal#reassign", icon: "⇄" },
  { label: "Activity Monitor", to: "/supervisor-portal#act", icon: "◉" },
  { label: "Performance", to: "/supervisor-portal#perf", icon: "▲" },
  { label: "Visit Calendar", to: "/supervisor-portal#cal", icon: "▣" },
  { label: "Escalations", to: "/supervisor-portal#esc", icon: "!" },
];

function Sup() {
  const team = teamMembers.slice(0, 3);
  return (
    <PortalShell brand="NestIQ Desk" role="Supervisor" accent="green" user={{ name: "Rahul Verma", initials: "RV" }} nav={nav} basePath="/supervisor-portal">
      <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Team · West Region (3 reps)</div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Team Open Leads" value={String(team.reduce((s, m) => s + m.leadsOpen, 0))} sub="+4 today" />
        <StatCard label="Closed MTD" value={String(team.reduce((s, m) => s + m.closedMTD, 0))} sub="+2 yesterday" />
        <StatCard label="Avg Conversion" value={`${Math.round(team.reduce((s, m) => s + m.conversion, 0) / team.length)}%`} sub="+1.2 pts" />
        <StatCard label="Site Visits This Wk" value="22" sub="6 scheduled today" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Team Members — Live Status">
            {team.map((m) => (
              <div key={m.id} className="border-b border-border py-4 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-mid-blue text-white font-semibold">{m.name.split(" ").map((n) => n[0]).join("")}</div>
                    <div>
                      <div className="font-semibold text-navy">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.city} · {m.leadsOpen} open · {m.closedMTD} closed</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="success">Online</Badge>
                    <button className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">View</button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-secondary">
                    <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${m.achieved}%` }} />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{m.achieved}% of target</span>
                </div>
              </div>
            ))}
          </Section>

          <Section title="Team Leads — Reassign / Comment">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="py-2">Lead</th><th>Interest</th><th>Owner</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {leads.slice(0, 5).map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="py-3"><div className="font-semibold text-navy">{l.name}</div><div className="font-mono text-[10px] text-muted-foreground">{l.id}</div></td>
                    <td className="text-xs">{l.interest}</td>
                    <td className="text-xs">{l.owner}</td>
                    <td><Badge tone={l.status.toLowerCase() as "hot" | "warm" | "cold" | "new"}>{l.status}</Badge></td>
                    <td><button className="rounded-md bg-mid-blue px-3 py-1 text-xs font-semibold text-white">Reassign</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>

        <div>
          <Section title="Live Activity">
            {activities.map((a, i) => (
              <div key={i} className="border-b border-border py-3 last:border-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-navy">{a.user}</span>
                  <span className="font-mono text-muted-foreground">{a.ts}</span>
                </div>
                <div className="mt-1 text-sm">{a.action}</div>
                <div className="text-xs text-muted-foreground">{a.outcome}</div>
              </div>
            ))}
          </Section>
          <Section title="Escalations">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
              <div className="font-bold text-amber-800">L-1031 stuck 6 days</div>
              <div className="mt-1 text-amber-700">No follow-up by Karan J. — escalate to Admin?</div>
              <button className="mt-2 rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white">Escalate</button>
            </div>
          </Section>
        </div>
      </div>
    </PortalShell>
  );
}