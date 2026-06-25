"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Phone, CheckCircle2, XCircle, Clock, MessageSquare, Flame, Thermometer, Snowflake } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { Head, latestNote, type DbLead, type OutcomeTone } from "./shared";

type LeadCategory = "Hot" | "Warm" | "Cold";
type CallStatus = "idle" | "connected" | "no_answer" | "callback";

const CATEGORIES: { key: LeadCategory; label: string; Icon: React.ElementType; active: string; inactive: string }[] = [
  {
    key: "Hot",
    label: "Hot",
    Icon: Flame,
    active: "bg-accent text-white border-accent shadow-sm",
    inactive: "border-accent/30 text-accent bg-accent/8 hover:bg-accent/15",
  },
  {
    key: "Warm",
    label: "Warm",
    Icon: Thermometer,
    active: "bg-amber-500 text-white border-amber-500 shadow-sm",
    inactive: "border-amber-300 text-amber-600 bg-amber-50 hover:bg-amber-100",
  },
  {
    key: "Cold",
    label: "Cold",
    Icon: Snowflake,
    active: "bg-blue-500 text-white border-blue-500 shadow-sm",
    inactive: "border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100",
  },
];

const OUTCOME_CONFIG: Record<
  Exclude<CallStatus, "idle">,
  { label: string; tone: OutcomeTone; icon: React.ReactNode }
> = {
  connected: { label: "Connected",          tone: "success", icon: <CheckCircle2 size={12} /> },
  no_answer: { label: "No Answer",          tone: "cold",    icon: <XCircle size={12} /> },
  callback:  { label: "Callback Scheduled", tone: "warm",    icon: <Clock size={12} /> },
};

interface RecentCall {
  name: string;
  phone: string;
  status: Exclude<CallStatus, "idle">;
  duration: string;
  ts: string;
}

export function CallTab() {
  const [category, setCategory]       = useState<LeadCategory>("Hot");
  const [callStatuses, setCallStatuses] = useState<Record<string, CallStatus>>({});
  const [durations, setDurations]       = useState<Record<string, string>>({});
  const [recentCalls, setRecentCalls]   = useState<RecentCall[]>([]);
  const [noteDrafts, setNoteDrafts]     = useState<Record<string, string>>({});

  const utils    = trpc.useUtils();
  const leadsQ   = trpc.leads.list.useQuery({ status: category, limit: 10 });
  const dialQueue = (leadsQ.data?.items ?? []) as DbLead[];

  const addNote = trpc.leads.addNote.useMutation({
    onSuccess: () => utils.leads.list.invalidate(),
  });

  function saveNote(l: DbLead) {
    const note = noteDrafts[l.id]?.trim();
    if (!note) return;
    addNote.mutate(
      { id: l.id, note },
      {
        onSuccess: () => {
          setNoteDrafts((prev) => ({ ...prev, [l.id]: "" }));
          toast.success("Comment added");
        },
      },
    );
  }

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
    toast.success(`Outcome recorded: ${OUTCOME_CONFIG[status].label}`);
  }

  const activeCat = CATEGORIES.find((c) => c.key === category)!;

  return (
    <>
      <Head t="Click-to-Call" s="One-tap dial via our PSTN gateway." />

      {/* ── Category filter buttons ─────────────────────────────── */}
      <div className="mb-4 flex items-center gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold transition-all duration-150 ${
              category === cat.key ? cat.active : cat.inactive
            }`}
          >
            <cat.Icon size={14} />
            {cat.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {leadsQ.isLoading ? "Loading…" : `${dialQueue.length} lead${dialQueue.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Quick dial grid ─────────────────────────────────────── */}
      <Section title={`Quick Dial — ${activeCat.label} Leads`}>
        {dialQueue.length === 0 && !leadsQ.isLoading ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center">
            <activeCat.Icon size={28} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-navy">No {category} leads assigned</p>
            <p className="mt-1 text-xs text-muted-foreground">Check back later or switch category.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {dialQueue.slice(0, 6).map((l) => {
              const status = callStatuses[l.id] ?? "idle";
              const cfg    = status !== "idle" ? OUTCOME_CONFIG[status] : null;
              const comment = latestNote(l.notes);

              return (
                <div
                  key={l.id}
                  className={`rounded-xl border p-4 space-y-3 transition-all ${
                    category === "Hot"
                      ? "border-accent/20 bg-accent/3"
                      : category === "Warm"
                      ? "border-amber-200 bg-amber-50/40"
                      : "border-blue-100 bg-blue-50/40"
                  }`}
                >
                  {/* Lead info row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-navy truncate">{l.name}</span>
                        {/* Category dot */}
                        <span className={`h-2 w-2 shrink-0 rounded-full ${
                          category === "Hot" ? "bg-accent" :
                          category === "Warm" ? "bg-amber-400" : "bg-blue-400"
                        }`} />
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">{l.phone}</div>
                      {l.city && (
                        <div className="text-[11px] text-muted-foreground">{l.city}</div>
                      )}
                    </div>
                    <button
                      onClick={() => dial(l)}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-90 ${
                        category === "Hot" ? "bg-accent" :
                        category === "Warm" ? "bg-amber-500" : "bg-blue-500"
                      }`}
                    >
                      <Phone size={12} /> Dial
                    </button>
                  </div>

                  {/* Latest comment ── always shown if exists */}
                  {comment && (
                    <div className="flex items-start gap-2 rounded-lg border border-border bg-white px-3 py-2">
                      <MessageSquare size={12} className="mt-0.5 shrink-0 text-muted-foreground/50" />
                      <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                        {comment}
                      </p>
                    </div>
                  )}

                  {/* Add comment ── appends to lead notes, flows to reports */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment…"
                      value={noteDrafts[l.id] ?? ""}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({ ...prev, [l.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveNote(l);
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <button
                      onClick={() => saveNote(l)}
                      disabled={!noteDrafts[l.id]?.trim() || addNote.isPending}
                      className="shrink-0 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>

                  {/* Post-dial controls */}
                  {status !== "idle" && (
                    <div className="space-y-2">
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
                      <div className="flex flex-wrap gap-1.5">
                        {(["connected", "no_answer", "callback"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => recordOutcome(l, s)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
                              status === s
                                ? "bg-accent text-white border-accent"
                                : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {OUTCOME_CONFIG[s].icon}
                            {OUTCOME_CONFIG[s].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── Recent calls log ────────────────────────────────────── */}
      {recentCalls.length > 0 && (
        <Section title="Recent Calls">
          <div className="divide-y divide-border">
            {recentCalls.map((c, i) => {
              const cfg = OUTCOME_CONFIG[c.status];
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
