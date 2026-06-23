"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHead } from "./shared";

type Level = "Low" | "Medium" | "High";

function SlaTimer({ hours }: { hours: number }) {
  const color = hours >= 24 ? "text-red-600" : hours >= 12 ? "text-amber-600" : "text-emerald-600";
  return (
    <div className={`flex items-center gap-1 font-mono text-xs font-semibold ${color}`}>
      <Clock size={11} /> {hours}h
    </div>
  );
}

const STATUS_TONE: Record<string, "success" | "warm" | "hot" | "cold" | "new"> = {
  open: "warm",
  escalated: "hot",
  resolved: "success",
};

export function EscalationsTab() {
  const [showRaise, setShowRaise] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [level, setLevel] = useState<Level>("Medium");
  const [note, setNote] = useState("");

  const escQ = trpc.supervisor.escalations.list.useQuery();
  const items = escQ.data ?? [];

  const leadsQ = trpc.leads.list.useQuery({ limit: 100 }, { enabled: showRaise });
  const leads = (leadsQ.data?.items ?? []) as Array<{ id: string; name: string }>;

  const refetch = () => escQ.refetch();

  const create = trpc.supervisor.escalations.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowRaise(false);
      setLeadId("");
      setLevel("Medium");
      setNote("");
      toast.success("Escalation raised");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const resolve = trpc.supervisor.escalations.resolve.useMutation({
    onSuccess: () => { refetch(); toast.success("Escalation resolved"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const escalate = trpc.supervisor.escalations.escalateToAdmin.useMutation({
    onSuccess: () => { refetch(); toast.success("Escalated to Admin"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  return (
    <>
      <PageHead title="Escalations" sub="Risks worth your attention." />
      <Section
        title="Open Escalations"
        action={
          <button
            onClick={() => setShowRaise(true)}
            className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
          >
            + Raise Escalation
          </button>
        }
      >
        {escQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading escalations…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No escalations — all clear.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table w-full text-sm">
              <thead>
                <tr>
                  <th className="py-2 text-left">Lead</th>
                  <th className="text-left">Note</th>
                  <th className="text-left">Assigned To</th>
                  <th className="text-left">SLA Timer</th>
                  <th className="text-left">Severity</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id}>
                    <td className="py-3 font-semibold text-navy">{e.leadName}</td>
                    <td className="max-w-[220px] text-xs text-muted-foreground">{e.note}</td>
                    <td className="text-xs">{e.assignedTo}</td>
                    <td><SlaTimer hours={e.ageHours} /></td>
                    <td>
                      <Badge tone={e.level === "High" ? "hot" : e.level === "Medium" ? "warm" : "cold"}>
                        {e.level}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={STATUS_TONE[e.status] ?? "new"}>{e.status}</Badge>
                    </td>
                    <td className="space-x-2 whitespace-nowrap">
                      {e.status === "resolved" ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <>
                          {e.status !== "escalated" && (
                            <button
                              onClick={() => escalate.mutate({ id: e.id })}
                              disabled={escalate.isPending}
                              className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
                            >
                              Escalate to Admin
                            </button>
                          )}
                          <button
                            onClick={() => resolve.mutate({ id: e.id })}
                            disabled={resolve.isPending}
                            className="rounded-md border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary transition disabled:opacity-50"
                          >
                            Resolve
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {showRaise && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          onClick={() => setShowRaise(false)}
        >
          <div
            className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 className="font-display text-xl font-bold text-navy">Raise Escalation</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Flag an at-risk lead for follow-up.
            </p>
            <div className="mt-5 space-y-3">
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={leadsQ.isLoading ? "Loading leads…" : "Select a lead"} />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
              <textarea
                placeholder="What's the risk?"
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowRaise(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-navy hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => create.mutate({ leadId, note, level })}
                disabled={create.isPending || !leadId || note.trim().length === 0}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {create.isPending ? "Raising…" : "Raise →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
