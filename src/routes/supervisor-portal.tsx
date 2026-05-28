import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell, StatCard, Section, Badge, useActiveHash } from "@/components/portal/PortalShell";
import { leads, teamMembers, activities } from "@/data/static";

export const Route = createFileRoute("/supervisor-portal")({
  head: () => ({ meta: [{ title: "NestIQ Desk — Supervisor" }] }),
  component: Sup,
});

const nav = [
  { label: "Team Dashboard", to: "/supervisor-portal", icon: "◆" },
  { label: "Team Leads", to: "/supervisor-portal#leads", icon: "✦" },
  { label: "Reassignment", to: "/supervisor-portal#reassign", icon: "⇄" },
  { label: "Activity Monitor", to: "/supervisor-portal#activity", icon: "◉" },
  { label: "Performance", to: "/supervisor-portal#performance", icon: "▲" },
  { label: "Visit Calendar", to: "/supervisor-portal#calendar", icon: "▣" },
  { label: "Escalations", to: "/supervisor-portal#escalations", icon: "!" },
];

function Sup() {
  const hash = useActiveHash();
  return (
    <PortalShell brand="NestIQ Desk" role="Supervisor" accent="green" user={{ name: "Rahul Verma", initials: "RV" }} nav={nav} basePath="/supervisor-portal">
      {render(hash)}
    </PortalShell>
  );
}

function render(h: string) {
  switch (h) {
    case "leads": return <TeamLeads />;
    case "reassign": return <Reassignment />;
    case "activity": return <Activity />;
    case "performance": return <Performance />;
    case "calendar": return <Calendar />;
    case "escalations": return <Escalations />;
    default: return <Dashboard />;
  }
}

function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (<div className="mb-6"><h2 className="font-display text-2xl font-bold text-navy">{title}</h2>{sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}</div>);
}

function Dashboard() {
  const team = teamMembers.slice(0, 3);
  return (
    <>
      <PageHead title="Team Dashboard" sub="West Region — 3 reps live now." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Team Open Leads" value={String(team.reduce((s, m) => s + m.leadsOpen, 0))} sub="+4 today" />
        <StatCard label="Closed MTD" value={String(team.reduce((s, m) => s + m.closedMTD, 0))} sub="+2 yesterday" />
        <StatCard label="Avg Conversion" value={`${Math.round(team.reduce((s, m) => s + m.conversion, 0) / team.length)}%`} sub="+1.2 pts" />
        <StatCard label="Site Visits This Wk" value="22" sub="6 scheduled today" />
      </div>
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
                <button onClick={() => toast(`Opening ${m.name}'s profile…`)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">View</button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-secondary"><div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${m.achieved}%` }} /></div>
              <span className="font-mono text-xs text-muted-foreground">{m.achieved}% of target</span>
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}

function TeamLeads() {
  return (
    <>
      <PageHead title="Team Leads" sub="Every lead across the team — comment or reassign." />
      <Section title="All Leads">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2">Lead</th><th>Interest</th><th>Owner</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="py-3"><div className="font-semibold text-navy">{l.name}</div><div className="font-mono text-[10px] text-muted-foreground">{l.id}</div></td>
                <td className="text-xs">{l.interest}</td>
                <td className="text-xs">{l.owner}</td>
                <td><Badge tone={l.status.toLowerCase() as "hot" | "warm" | "cold" | "new"}>{l.status}</Badge></td>
                <td className="space-x-2"><button onClick={() => toast(`Comment added on ${l.id}`)} className="rounded-md border border-border px-3 py-1 text-xs font-semibold">+ Note</button><button onClick={() => toast.success(`${l.id} reassigned`)} className="rounded-md bg-mid-blue px-3 py-1 text-xs font-semibold text-white">Reassign</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Section>
    </>
  );
}

function Reassignment() {
  const [from, setFrom] = useState("Priya Sharma");
  const [to, setTo] = useState("Karan Joshi");
  const [lead, setLead] = useState(leads[0].id);
  return (
    <>
      <PageHead title="Reassignment" sub="Move a lead from one rep to another in one step." />
      <Section title="Bulk Reassign">
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="text-xs uppercase tracking-wider text-muted-foreground">Lead</label><select value={lead} onChange={(e) => setLead(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm">{leads.map((l) => <option key={l.id} value={l.id}>{l.id} — {l.name}</option>)}</select></div>
          <div><label className="text-xs uppercase tracking-wider text-muted-foreground">From</label><select value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm">{teamMembers.map((m) => <option key={m.id}>{m.name}</option>)}</select></div>
          <div><label className="text-xs uppercase tracking-wider text-muted-foreground">To</label><select value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm">{teamMembers.map((m) => <option key={m.id}>{m.name}</option>)}</select></div>
        </div>
        <button onClick={() => toast.success(`${lead} moved from ${from} → ${to}`)} className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">Reassign now</button>
      </Section>
    </>
  );
}

function Activity() {
  return (
    <>
      <PageHead title="Activity Monitor" sub="Every touchpoint by your team, live." />
      <Section title="Today's stream">
        {[...activities, ...activities].map((a, i) => (
          <div key={i} className="border-b border-border py-3 last:border-0">
            <div className="flex items-center justify-between text-xs"><span className="font-semibold text-navy">{a.user}</span><span className="font-mono text-muted-foreground">{a.ts}</span></div>
            <div className="mt-1 text-sm">{a.action}</div>
            <div className="text-xs text-muted-foreground">{a.outcome}</div>
          </div>
        ))}
      </Section>
    </>
  );
}

function Performance() {
  return (
    <>
      <PageHead title="Performance" sub="Rep-level achievement vs targets." />
      <Section title="MTD Target Achievement">
        <div className="space-y-4">
          {teamMembers.map((m) => (
            <div key={m.id}>
              <div className="flex items-center justify-between text-sm"><span className="font-semibold text-navy">{m.name}</span><span className="font-mono text-xs text-muted-foreground">{m.achieved}% of {m.target}</span></div>
              <div className="mt-2 h-2 w-full rounded-full bg-secondary"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${m.achieved}%` }} /></div>
              <div className="mt-1 text-xs text-muted-foreground">{m.closedMTD} closed · {m.conversion}% conversion</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function Calendar() {
  const slots = [
    { day: "Today", time: "4:30 PM", rep: "Priya S.", prop: "Skyline Residences" },
    { day: "Today", time: "6:00 PM", rep: "Karan J.", prop: "Green Acres Villa" },
    { day: "Tomorrow", time: "11:00 AM", rep: "Priya S.", prop: "Marina Heights" },
    { day: "Sat", time: "2:00 PM", rep: "Anita R.", prop: "Heritage Bungalow" },
    { day: "Sat", time: "4:00 PM", rep: "Karan J.", prop: "Urban Studio" },
  ];
  return (
    <>
      <PageHead title="Visit Calendar" sub="Site visits scheduled across the team." />
      <Section title="Upcoming">
        {slots.map((s, i) => (
          <div key={i} className="flex items-center justify-between border-b border-border py-3 last:border-0">
            <div><div className="font-semibold text-navy">{s.prop}</div><div className="text-xs text-muted-foreground">{s.rep}</div></div>
            <div className="text-right"><div className="font-display text-sm font-bold text-accent">{s.day}</div><div className="text-xs text-muted-foreground">{s.time}</div></div>
          </div>
        ))}
      </Section>
    </>
  );
}

function Escalations() {
  const items = [
    { id: "E-12", lead: "L-1031", note: "Stuck 6 days — no follow-up by Karan J.", level: "Medium" as const },
    { id: "E-13", lead: "L-1024", note: "Negotiation stalled, client unresponsive", level: "High" as const },
    { id: "E-14", lead: "L-1042", note: "Repeat site-visit no-show", level: "Low" as const },
  ];
  return (
    <>
      <PageHead title="Escalations" sub="Risks worth your attention." />
      <Section title="Open Escalations">
        {items.map((e) => (
          <div key={e.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
            <div><div className="font-semibold text-navy">{e.lead}</div><div className="text-xs text-muted-foreground">{e.note}</div></div>
            <div className="flex items-center gap-2"><Badge tone={e.level === "High" ? "hot" : e.level === "Medium" ? "warm" : "cold"}>{e.level}</Badge><button onClick={() => toast.success(`Escalated ${e.lead} to Admin`)} className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white">Escalate</button></div>
          </div>
        ))}
      </Section>
    </>
  );
}