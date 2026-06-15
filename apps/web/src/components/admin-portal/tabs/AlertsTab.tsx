"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BellRing, Mail, Phone, UserCheck, ChevronDown } from "lucide-react";
import { StatCard, Section } from "@/components/portal/PortalShell";
import { getLeads, assignLead, updateLeadStatus, type Lead } from "@/lib/leads";
import { PageHead } from "./PageHead";

const TEAM_MEMBERS = ["Priya Sharma", "Karan Joshi", "Anita Rao", "Devansh Patel"];

const ACTION_COLORS: Record<string, string> = {
  "Schedule Visit": "bg-blue-100 text-blue-700",
  "Request Callback": "bg-amber-100 text-amber-700",
  "Unlock Contact": "bg-emerald-100 text-emerald-700",
  WhatsApp: "bg-green-100 text-green-700",
  "Get Price": "bg-purple-100 text-purple-700",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-rose-100 text-rose-700",
  contacted: "bg-amber-100 text-amber-700",
  closed: "bg-emerald-100 text-emerald-700",
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function AlertsTab() {
  const [liveLeads, setLiveLeads] = useState<Lead[]>([]);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "contacted" | "closed">("all");

  /* Poll localStorage every 5 s so multiple tabs stay in sync */
  useEffect(() => {
    const load = () => setLiveLeads(getLeads());
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const refresh = () => setLiveLeads(getLeads());

  const handleAssign = (leadId: string, member: string) => {
    assignLead(leadId, member);
    refresh();
    setAssignOpen(null);
    toast.success(`Lead assigned to ${member}`);
  };

  const handleStatus = (leadId: string, status: Lead["status"]) => {
    updateLeadStatus(leadId, status);
    refresh();
    toast.success(`Marked as ${status}`);
  };

  const newCount = liveLeads.filter((l) => l.status === "new").length;
  const shown = filter === "all" ? liveLeads : liveLeads.filter((l) => l.status === filter);

  return (
    <>
      <PageHead
        title="User Click Alerts"
        subtitle="Real-time lead notifications from property page interactions."
      />

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Leads" value={String(liveLeads.length)} sub="all time" />
        <StatCard label="New" value={String(newCount)} sub="need action" accent="text-rose-500" />
        <StatCard
          label="Contacted"
          value={String(liveLeads.filter((l) => l.status === "contacted").length)}
          sub="in progress"
          accent="text-amber-500"
        />
        <StatCard
          label="Closed"
          value={String(liveLeads.filter((l) => l.status === "closed").length)}
          sub="converted"
          accent="text-emerald-600"
        />
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {(["all", "new", "contacted", "closed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition-all
              ${filter === f ? "border-transparent bg-navy text-white" : "border-border bg-white text-muted-foreground hover:border-accent/50"}`}
          >
            {f === "all"
              ? `All (${liveLeads.length})`
              : `${f} (${liveLeads.filter((l) => l.status === f).length})`}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 py-16 text-center">
          <BellRing className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-semibold text-muted-foreground">No leads yet</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            When a registered user clicks Schedule Visit, Request Callback or Unlock Contact on any
            property, it appears here instantly.
          </p>
        </div>
      ) : (
        <Section title={`${shown.length} Lead${shown.length !== 1 ? "s" : ""}`}>
          {shown.map((lead) => (
            <div
              key={lead.id}
              className="flex flex-col gap-3 border-b border-border py-5 last:border-0 sm:flex-row sm:items-start sm:justify-between"
            >
              {/* Left: user info + property */}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{lead.id}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ACTION_COLORS[lead.action] ?? "bg-secondary text-navy"}`}
                  >
                    {lead.action}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[lead.status]}`}
                  >
                    {lead.status}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {timeAgo(lead.timestamp)}
                  </span>
                </div>

                {/* User details */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <span className="font-semibold text-navy">{lead.userName}</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Mail size={11} /> {lead.userEmail}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Phone size={11} /> {lead.userPhone}
                  </span>
                </div>

                {/* Property */}
                <div className="text-xs text-muted-foreground">
                  Property:{" "}
                  <Link
                    href={`/properties/${lead.propertyId}`}
                    className="font-semibold text-accent hover:underline"
                  >
                    {lead.propertyName}
                  </Link>
                  <span className="ml-1.5 text-muted-foreground/60">{lead.propertyCity}</span>
                </div>

                {lead.assignedTo && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <UserCheck size={12} />
                    Assigned to <strong>{lead.assignedTo}</strong>
                  </div>
                )}
              </div>

              {/* Right: action buttons */}
              <div className="flex flex-wrap gap-2">
                {/* Assign dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setAssignOpen(assignOpen === lead.id ? null : lead.id)}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-secondary"
                  >
                    <UserCheck size={12} />
                    {lead.assignedTo ? "Reassign" : "Assign Team"}
                    <ChevronDown size={11} />
                  </button>
                  {assignOpen === lead.id && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-white shadow-xl">
                      {TEAM_MEMBERS.map((m) => (
                        <button
                          key={m}
                          onClick={() => handleAssign(lead.id, m)}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-secondary"
                        >
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/10 text-[9px] font-bold text-accent">
                            {m
                              .split(" ")
                              .map((s) => s[0])
                              .join("")}
                          </span>
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status buttons */}
                {lead.status === "new" && (
                  <button
                    onClick={() => handleStatus(lead.id, "contacted")}
                    className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    Mark Contacted
                  </button>
                )}
                {lead.status !== "closed" && (
                  <button
                    onClick={() => handleStatus(lead.id, "closed")}
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Close Lead
                  </button>
                )}
              </div>
            </div>
          ))}
        </Section>
      )}
    </>
  );
}
