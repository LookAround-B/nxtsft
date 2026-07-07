"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { PageHead } from "./PageHead";

function SlaTimer({ hours }: { hours: number }) {
  const color = hours >= 24 ? "text-red-600" : hours >= 12 ? "text-amber-600" : "text-emerald-600";
  return (
    <div className={`flex items-center gap-1 font-mono text-xs font-semibold ${color}`}>
      <Clock size={11} /> {hours}h
    </div>
  );
}

export function EscalationsTab() {
  const [view, setView] = useState<"escalated" | "resolved">("escalated");
  const utils = trpc.useUtils();

  const escQ = trpc.admin.escalations.list.useQuery({ status: view });
  const items = escQ.data ?? [];

  const resolve = trpc.admin.escalations.resolve.useMutation({
    onSuccess: () => {
      escQ.refetch();
      utils.admin.badgeCounts.invalidate();
      toast.success("Escalation resolved");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  return (
    <>
      <PageHead
        title="Escalations"
        subtitle="Risks supervisors escalated for admin attention."
      />
      <Section
        title={view === "escalated" ? "Escalated to Admin" : "Resolved Escalations"}
        action={
          <div className="flex rounded-lg border border-border bg-secondary p-0.5">
            {(["escalated", "resolved"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition
                  ${view === v ? "bg-white text-navy shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                {v}
              </button>
            ))}
          </div>
        }
      >
        {escQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading escalations…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {view === "escalated" ? "No escalations — all clear." : "No resolved escalations yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table w-full text-sm">
              <thead>
                <tr>
                  <th className="py-2 text-left">Lead</th>
                  <th className="text-left">Note</th>
                  <th className="text-left">Assigned To</th>
                  <th className="text-left">Raised By</th>
                  <th className="text-left">SLA Timer</th>
                  <th className="text-left">Severity</th>
                  {view === "escalated" && <th className="text-left">Action</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id}>
                    <td className="py-3 font-semibold text-navy">{e.leadName}</td>
                    <td className="max-w-[220px] text-xs text-muted-foreground">{e.note}</td>
                    <td className="text-xs">{e.assignedTo}</td>
                    <td className="text-xs">{e.raisedBy}</td>
                    <td><SlaTimer hours={e.ageHours} /></td>
                    <td>
                      <Badge tone={e.level === "High" ? "hot" : e.level === "Medium" ? "warm" : "cold"}>
                        {e.level}
                      </Badge>
                    </td>
                    {view === "escalated" && (
                      <td className="whitespace-nowrap">
                        <button
                          onClick={() => resolve.mutate({ id: e.id })}
                          disabled={resolve.isPending}
                          className="rounded-md border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary transition disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
