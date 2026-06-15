"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Section } from "@/components/portal/PortalShell";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { leads, teamMembers } from "@/data/static";
import { PageHead } from "./shared";

const repLoadMap: Record<string, number> = {
  "Priya Sharma": 14,
  "Karan Joshi": 19,
  "Anita Rao": 9,
  "Devansh Patel": 11,
};

const REASSIGN_REASONS = ["Overloaded", "OOO", "Skill Match", "Territory"];

function LoadBar({ name, load }: { name: string; load: number }) {
  const max = 25;
  const pct = Math.min(100, Math.round((load / max) * 100));
  const color = pct > 75 ? "bg-red-400" : pct > 50 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="rounded-xl border border-border bg-slate-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-navy">{name}</span>
        <span className="font-mono text-xs text-muted-foreground">{load} open leads</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">{pct}% capacity</div>
    </div>
  );
}

export function ReassignmentTab() {
  const [from, setFrom] = useState("Priya Sharma");
  const [to, setTo] = useState("Karan Joshi");
  const [lead, setLead] = useState(leads[0].id);
  const [reason, setReason] = useState(REASSIGN_REASONS[0]);

  return (
    <>
      <PageHead title="Reassignment" sub="Move a lead from one rep to another in one step." />

      {/* Preview panel */}
      <Section title="Rep Load Preview">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              From
            </div>
            <LoadBar name={from} load={repLoadMap[from] ?? 0} />
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              To
            </div>
            <LoadBar name={to} load={repLoadMap[to] ?? 0} />
          </div>
        </div>
      </Section>

      <Section title="Bulk Reassign">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Lead</label>
            <Select value={lead} onValueChange={setLead}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.id} — {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">From</label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">To</label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASSIGN_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <button
          onClick={() => toast.success(`${lead} moved from ${from} → ${to} (${reason})`)}
          className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 transition"
        >
          Reassign now
        </button>
      </Section>
    </>
  );
}
