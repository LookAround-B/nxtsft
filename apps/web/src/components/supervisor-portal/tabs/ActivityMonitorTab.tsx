"use client";
import { toast } from "sonner";
import {
  Download,
  Clock,
  Phone,
  PhoneCall,
  PhoneMissed,
  PhoneIncoming,
} from "lucide-react";
import { Activity as ActivityIcon } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { activities, propertyViews } from "@/data/static";
import { downloadCSV } from "@/lib/download-csv";
import { PageHead } from "./shared";

const callLog = [
  { caller: "Priya S.", lead: "Rohan Mehta", duration: "4m 12s", outcome: "Connected" as const, ts: "10:42" },
  { caller: "Karan J.", lead: "Aisha Khan", duration: "0m 00s", outcome: "No Answer" as const, ts: "10:30" },
  { caller: "Anita R.", lead: "Neha Reddy", duration: "2m 55s", outcome: "Callback" as const, ts: "09:58" },
  { caller: "Priya S.", lead: "Suresh Iyer", duration: "6m 40s", outcome: "Connected" as const, ts: "09:45" },
  { caller: "Devansh P.", lead: "Vikram Singh", duration: "1m 10s", outcome: "Callback" as const, ts: "09:20" },
  { caller: "Karan J.", lead: "Kavya Nair", duration: "3m 28s", outcome: "Connected" as const, ts: "09:05" },
];

const outcomeIcon = {
  Connected: <PhoneCall size={13} className="text-emerald-600" />,
  "No Answer": <PhoneMissed size={13} className="text-red-500" />,
  Callback: <PhoneIncoming size={13} className="text-amber-500" />,
};

const outcomeBadge: Record<string, string> = {
  Connected: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "No Answer": "bg-red-50 text-red-600 border border-red-200",
  Callback: "bg-amber-50 text-amber-700 border border-amber-200",
};

export function ActivityMonitorTab() {
  const fmtDur = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);
  const recentViews = [...propertyViews].sort((a, b) => b.ts.localeCompare(a.ts));

  function handleExport() {
    const headers = ["Time", "Caller", "Lead", "Duration", "Outcome"];
    const rows = callLog.map((c) => [c.ts, c.caller, c.lead, c.duration, c.outcome]);
    downloadCSV("call-log.csv", headers, rows);
    toast.success("Call Log CSV downloaded");
  }

  return (
    <>
      <PageHead title="Activity Monitor" sub="Every touchpoint by your team and users, live." />

      {/* Response Time metric card */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Clock size={12} /> Avg Response Time
          </div>
          <div className="mt-2 font-display text-3xl font-black text-navy">2.4h</div>
          <div className="mt-1.5 text-xs font-medium text-emerald-600">-0.3h vs yesterday</div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Phone size={12} /> Calls Made Today
          </div>
          <div className="mt-2 font-display text-3xl font-black text-navy">{callLog.length}</div>
          <div className="mt-1.5 text-xs font-medium text-emerald-600">
            {callLog.filter((c) => c.outcome === "Connected").length} connected
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <ActivityIcon size={12} /> Events Today
          </div>
          <div className="mt-2 font-display text-3xl font-black text-navy">
            {activities.length * 2}
          </div>
          <div className="mt-1.5 text-xs font-medium text-muted-foreground">across all reps</div>
        </div>
      </div>

      <Section title="Today's Team Stream">
        {[...activities, ...activities].map((a, i) => (
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

      {/* Today's Call Log */}
      <Section
        title="Today's Call Log"
        action={
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary transition"
          >
            <Download size={12} /> Export CSV
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="portal-table w-full text-sm">
            <thead>
              <tr>
                <th className="py-2 text-left">Time</th>
                <th className="text-left">Caller</th>
                <th className="text-left">Lead</th>
                <th className="text-left">Duration</th>
                <th className="text-left">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {callLog.map((c, i) => (
                <tr key={i}>
                  <td className="py-2.5 font-mono text-xs text-muted-foreground">{c.ts}</td>
                  <td className="text-sm font-semibold text-navy">{c.caller}</td>
                  <td className="text-sm">{c.lead}</td>
                  <td className="font-mono text-xs">{c.duration}</td>
                  <td>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${outcomeBadge[c.outcome]}`}
                    >
                      {outcomeIcon[c.outcome]} {c.outcome}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Property View Feed"
        action={
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
            {recentViews.length} views
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Property</th>
                <th>City</th>
                <th>Time</th>
                <th>Duration</th>
                <th>Unlocked</th>
              </tr>
            </thead>
            <tbody>
              {recentViews.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="font-semibold text-navy">{v.userName}</div>
                    <div className="text-[10px] text-muted-foreground">{v.userEmail}</div>
                  </td>
                  <td>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">
                      {v.userRole}
                    </span>
                  </td>
                  <td className="max-w-[180px] truncate text-sm font-medium text-navy">
                    {v.propertyTitle.split("—")[0].trim()}
                  </td>
                  <td className="text-xs text-muted-foreground">{v.city}</td>
                  <td className="font-mono text-xs text-muted-foreground">{v.ts}</td>
                  <td className="font-mono text-xs">{fmtDur(v.durationSec)}</td>
                  <td>
                    <Badge tone={v.contactUnlocked ? "success" : "cold"}>
                      {v.contactUnlocked ? "Yes" : "No"}
                    </Badge>
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
