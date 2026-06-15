"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Phone, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { Head, type DbLead, type OutcomeTone } from "./shared";

type CallStatus = "idle" | "connected" | "no_answer" | "callback";

const callStatusConfig: Record<
  Exclude<CallStatus, "idle">,
  { label: string; tone: OutcomeTone; icon: React.ReactNode }
> = {
  connected: { label: "Connected", tone: "success", icon: <CheckCircle2 size={12} /> },
  no_answer: { label: "No Answer", tone: "cold", icon: <XCircle size={12} /> },
  callback: { label: "Callback Scheduled", tone: "warm", icon: <Clock size={12} /> },
};

interface RecentCall {
  name: string;
  phone: string;
  status: Exclude<CallStatus, "idle">;
  duration: string;
  ts: string;
}

export function CallTab() {
  const [callStatuses, setCallStatuses] = useState<Record<string, CallStatus>>({});
  const [durations, setDurations] = useState<Record<string, string>>({});
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);

  const leadsQ = trpc.leads.list.useQuery({ status: "Hot", limit: 10 });
  const dialQueue = (leadsQ.data?.items ?? []) as DbLead[];

  function dial(l: DbLead) {
    toast.success(`Dialing ${l.phone}…`);
    setCallStatuses((prev) => ({ ...prev, [l.id]: "connected" }));
    setDurations((prev) => ({ ...prev, [l.id]: "" }));
  }

  function recordOutcome(l: DbLead, status: Exclude<CallStatus, "idle">) {
    setCallStatuses((prev) => ({ ...prev, [l.id]: status }));
    const dur = durations[l.id] || "0m 0s";
    setRecentCalls((prev) => [
      { name: l.name, phone: l.phone, status, duration: dur, ts: new Date().toLocaleTimeString() },
      ...prev.slice(0, 9),
    ]);
    toast.success(`Outcome recorded: ${callStatusConfig[status].label}`);
  }

  return (
    <>
      <Head t="Click-to-Call" s="One-tap dial via our PSTN gateway." />
      <Section title="Quick dial">
        <div className="grid gap-3 sm:grid-cols-2">
          {dialQueue.slice(0, 5).map((l) => {
            const status = callStatuses[l.id] ?? "idle";
            const cfg = status !== "idle" ? callStatusConfig[status] : null;
            return (
              <div key={l.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-navy">{l.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{l.phone}</div>
                  </div>
                  <button
                    onClick={() => dial(l)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Phone size={12} /> Dial
                  </button>
                </div>
                {status !== "idle" && (
                  <div className="space-y-2">
                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      {cfg && (
                        <Badge tone={cfg.tone}>
                          <span className="flex items-center gap-1">
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </Badge>
                      )}
                    </div>
                    {/* Duration input */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">
                        Duration:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2m 30s"
                        value={durations[l.id] ?? ""}
                        onChange={(e) =>
                          setDurations((prev) => ({ ...prev, [l.id]: e.target.value }))
                        }
                        className="rounded border border-border bg-background px-2 py-1 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    {/* Outcome buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {(["connected", "no_answer", "callback"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => recordOutcome(l, s)}
                          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold border transition-colors ${status === s ? "bg-accent text-white border-accent" : "border-border text-muted-foreground hover:bg-muted"}`}
                        >
                          {callStatusConfig[s].icon}
                          {callStatusConfig[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {recentCalls.length > 0 && (
        <Section title="Recent Calls">
          <div className="divide-y divide-border">
            {recentCalls.map((c, i) => {
              const cfg = callStatusConfig[c.status];
              return (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="font-semibold text-navy text-sm">{c.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{c.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{c.duration}</span>
                    <Badge tone={cfg.tone}>{cfg.label}</Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">{c.ts}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </>
  );
}
