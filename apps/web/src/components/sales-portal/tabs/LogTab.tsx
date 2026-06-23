"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Plus } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { downloadCSV } from "@/lib/download-csv";
import { trpc } from "@/lib/trpc";
import { Head, type OutcomeTone } from "./shared";

const outcomeTone: Record<string, OutcomeTone> = {
  Positive: "success",
  Neutral: "new",
  Negative: "cold",
};

function classifyOutcome(outcome: string): "Positive" | "Neutral" | "Negative" {
  const lower = outcome.toLowerCase();
  if (lower.includes("interest") || lower.includes("confirm") || lower.includes("paid") || lower.includes("scheduled"))
    return "Positive";
  if (lower.includes("no answer") || lower.includes("callback") || lower.includes("busy") || lower.includes("declined"))
    return "Negative";
  return "Neutral";
}

const EMOJI: Record<string, string> = { call: "📞", visit: "🏠", note: "📝" };
const TYPE_LABELS = ["All", "call", "visit", "note"] as const;
type TypeFilter = (typeof TYPE_LABELS)[number];

export function LogTab() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "call" as "call" | "visit" | "note", action: "", outcome: "" });

  const activitiesQ = trpc.leads.myActivities.useQuery({ limit: 50 });
  const logMutation = trpc.leads.logActivity.useMutation({
    onSuccess: () => {
      toast.success("Activity logged");
      activitiesQ.refetch();
      setShowForm(false);
      setForm({ type: "call", action: "", outcome: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const all = activitiesQ.data?.items ?? [];
  const filtered = typeFilter === "All" ? all : all.filter((a) => a.type === typeFilter);

  const grouped: Record<string, typeof filtered> = {};
  filtered.forEach((a) => {
    const date = a.ts.slice(0, 10);
    (grouped[date] ||= []).push(a);
  });

  function handleExport() {
    const headers = ["Date", "Type", "Action", "Outcome", "Sentiment"];
    const rows = filtered.map((a) => [a.ts, a.type, a.action, a.outcome, classifyOutcome(a.outcome)]);
    downloadCSV("activity-log.csv", headers, rows);
    toast.success("CSV downloaded");
  }

  return (
    <>
      <Head t="Activity Log" s="Everything you've logged." />

      {showForm && (
        <div className="mb-4 rounded-2xl border border-border bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-navy">Log New Activity</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}
                className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
              >
                <option value="call">Call</option>
                <option value="visit">Visit</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action</label>
              <input
                value={form.action}
                onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
                placeholder="e.g. Called Rohan Mehta"
                className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Outcome</label>
              <input
                value={form.outcome}
                onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
                placeholder="e.g. Site visit scheduled Sat 11am"
                className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted">Cancel</button>
            <button
              onClick={() => {
                if (!form.action.trim() || !form.outcome.trim()) return toast.error("Fill in action and outcome");
                logMutation.mutate(form);
              }}
              disabled={logMutation.isPending}
              className="px-3 py-1.5 text-xs rounded-lg bg-accent text-white font-semibold disabled:opacity-60"
            >
              {logMutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      <Section
        title="Log"
        action={
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
              {TYPE_LABELS.map((f) => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`px-3 py-1.5 transition-colors ${typeFilter === f ? "bg-accent text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  {f === "All" ? "All" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
                </button>
              ))}
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              <Download size={12} /> Export
            </button>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              <Plus size={12} /> Log
            </button>
          </div>
        }
      >
        {activitiesQ.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : !filtered.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No activities yet. Click <strong>+ Log</strong> to record a call, visit or note.
          </p>
        ) : (
          Object.entries(grouped).map(([date, entries]) => (
            <div key={date} className="mb-4 last:mb-0">
              <div className="mb-2 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground border-b border-border pb-1">
                {date}
              </div>
              {entries.map((a) => {
                const sentiment = classifyOutcome(a.outcome);
                const tone = outcomeTone[sentiment] ?? "new";
                return (
                  <div key={a.id} className="border-b border-border py-3 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{EMOJI[a.type] ?? "📝"}</span>
                        <span className="font-semibold text-navy text-sm">{a.action}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge tone={tone}>{sentiment}</Badge>
                        <span className="font-mono text-xs text-muted-foreground">{a.ts.slice(11, 16)}</span>
                      </div>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground pl-7">{a.outcome}</div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </Section>
    </>
  );
}
