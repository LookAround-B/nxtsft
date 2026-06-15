"use client";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { PageHead } from "./shared";

const escalations = [
  {
    id: "E-12",
    lead: "L-1031",
    note: "Stuck 6 days — no follow-up by Karan J.",
    level: "Medium" as const,
    createdHoursAgo: 18,
    assignedTo: "Karan Joshi",
  },
  {
    id: "E-13",
    lead: "L-1024",
    note: "Negotiation stalled, client unresponsive",
    level: "High" as const,
    createdHoursAgo: 9,
    assignedTo: "Priya Sharma",
  },
  {
    id: "E-14",
    lead: "L-1042",
    note: "Repeat site-visit no-show",
    level: "Low" as const,
    createdHoursAgo: 3,
    assignedTo: "Anita Rao",
  },
];

function SlaTimer({ hours }: { hours: number }) {
  const color = hours >= 24 ? "text-red-600" : hours >= 12 ? "text-amber-600" : "text-emerald-600";
  return (
    <div className={`flex items-center gap-1 font-mono text-xs font-semibold ${color}`}>
      <Clock size={11} /> {hours}h
    </div>
  );
}

export function EscalationsTab() {
  return (
    <>
      <PageHead title="Escalations" sub="Risks worth your attention." />
      <Section title="Open Escalations">
        <div className="overflow-x-auto">
          <table className="portal-table w-full text-sm">
            <thead>
              <tr>
                <th className="py-2 text-left">ID</th>
                <th className="text-left">Lead</th>
                <th className="text-left">Note</th>
                <th className="text-left">Assigned To</th>
                <th className="text-left">SLA Timer</th>
                <th className="text-left">Severity</th>
                <th className="text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {escalations.map((e) => (
                <tr key={e.id}>
                  <td className="py-3 font-mono text-xs text-muted-foreground">{e.id}</td>
                  <td className="font-semibold text-navy">{e.lead}</td>
                  <td className="max-w-[220px] text-xs text-muted-foreground">{e.note}</td>
                  <td className="text-xs">{e.assignedTo}</td>
                  <td>
                    <SlaTimer hours={e.createdHoursAgo} />
                  </td>
                  <td>
                    <Badge
                      tone={e.level === "High" ? "hot" : e.level === "Medium" ? "warm" : "cold"}
                    >
                      {e.level}
                    </Badge>
                  </td>
                  <td className="space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => toast.success(`${e.lead} escalated to Admin`)}
                      className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:opacity-90 transition"
                    >
                      Escalate to Admin
                    </button>
                    <button
                      onClick={() => toast(`Marking ${e.id} resolved…`)}
                      className="rounded-md border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary transition"
                    >
                      Resolve
                    </button>
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
