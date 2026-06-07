'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  LayoutDashboard, Target, ArrowLeftRight,
  TrendingUp, AlertTriangle, Phone, Clock,
  Download, ChevronDown, ChevronUp, MapPin,
  CheckCircle2, XCircle, PhoneCall, PhoneMissed,
  PhoneIncoming, Trophy, BarChart2, Users,
} from 'lucide-react';
import { Activity as ActivityIcon, Calendar as CalendarIcon } from 'lucide-react';
import { PortalShell, StatCard, Section, Badge } from '@/components/portal/PortalShell';
import { useActiveHash } from '@/lib/use-active-hash';
import { leads, teamMembers, activities, propertyViews } from '@/data/static';

/* ─── helpers ──────────────────────────────────────────────── */

function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseDuration(s: string): number {
  // e.g. "2h ago" -> 2*60, "30m ago" -> 30, "1d ago" -> 1440, "5h ago" -> 300
  if (s.includes('d')) return parseInt(s) * 1440;
  if (s.includes('h')) return parseInt(s) * 60;
  if (s.includes('m')) return parseInt(s);
  return 0;
}

function daysSinceLabel(lastActivity: string): string {
  const mins = parseDuration(lastActivity);
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

/* ─── nav ───────────────────────────────────────────────────── */

const nav = [
  { label: 'Team Dashboard',   to: '/supervisor-portal',             icon: <LayoutDashboard size={14} /> },
  { label: 'Team Leads',       to: '/supervisor-portal#leads',       icon: <Target size={14} /> },
  { label: 'Reassignment',     to: '/supervisor-portal#reassign',    icon: <ArrowLeftRight size={14} /> },
  { label: 'Activity Monitor', to: '/supervisor-portal#activity',    icon: <ActivityIcon size={14} /> },
  { label: 'Performance',      to: '/supervisor-portal#performance', icon: <TrendingUp size={14} /> },
  { label: 'Visit Calendar',   to: '/supervisor-portal#calendar',    icon: <CalendarIcon size={14} /> },
  { label: 'Escalations',      to: '/supervisor-portal#escalations', icon: <AlertTriangle size={14} /> },
];

export default function SupervisorPortal() {
  const hash = useActiveHash();
  return (
    <PortalShell brand="NxtSft.com Desk" role="Supervisor" accent="green" user={{ name: 'Rahul Verma', initials: 'RV' }} nav={nav} basePath="/supervisor-portal">
      {renderTab(hash)}
    </PortalShell>
  );
}

function renderTab(h: string) {
  switch (h) {
    case 'leads': return <TeamLeads />;
    case 'reassign': return <Reassignment />;
    case 'activity': return <ActivityMonitor />;
    case 'performance': return <Performance />;
    case 'calendar': return <VisitCalendar />;
    case 'escalations': return <Escalations />;
    default: return <Dashboard />;
  }
}

function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl font-bold text-navy">{title}</h2>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ─── daily targets data ────────────────────────────────────── */

const dailyTargets = [
  { rep: 'Priya Sharma',  calls: 8,  callTarget: 12, visits: 2, visitTarget: 3 },
  { rep: 'Karan Joshi',   calls: 11, callTarget: 12, visits: 3, visitTarget: 3 },
  { rep: 'Anita Rao',     calls: 5,  callTarget: 12, visits: 1, visitTarget: 3 },
  { rep: 'Devansh Patel', calls: 7,  callTarget: 12, visits: 2, visitTarget: 3 },
];

const repCallsToday: Record<string, number> = {
  'Priya Sharma': 8,
  'Karan Joshi': 11,
  'Anita Rao': 5,
  'Devansh Patel': 7,
};

const repStatus: Record<string, 'green' | 'amber'> = {
  'Priya Sharma': 'green',
  'Karan Joshi': 'green',
  'Anita Rao': 'amber',
  'Devansh Patel': 'green',
};

/* ══════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════ */

function Dashboard() {
  const team = teamMembers.slice(0, 4);
  return (
    <>
      <PageHead title="Team Dashboard" sub="West Region — 4 reps live now." />

      {/* 6 stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Team Open Leads" value={String(team.reduce((s, m) => s + m.leadsOpen, 0))} sub="+4 today" />
        <StatCard label="Closed MTD" value={String(team.reduce((s, m) => s + m.closedMTD, 0))} sub="+2 yesterday" />
        <StatCard label="Avg Conversion" value={`${Math.round(team.reduce((s, m) => s + m.conversion, 0) / team.length)}%`} sub="+1.2 pts" />
        <StatCard label="Site Visits This Wk" value="22" sub="6 scheduled today" />
        <StatCard label="Avg Response Time" value="2.4h" sub="-0.3h vs yesterday" />
        <StatCard label="Overdue Leads" value="5" sub="Needs attention" accent="text-red-500" />
      </div>

      {/* Team members */}
      <Section title="Team Members — Live Status">
        {team.map((m) => (
          <div key={m.id} className="border-b border-border py-4 last:border-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Status dot */}
                <div className="relative">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-mid-blue text-white font-semibold text-sm">
                    {m.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${repStatus[m.name] === 'green' ? 'bg-emerald-500' : 'bg-amber-400'}`}
                  />
                </div>
                <div>
                  <div className="font-semibold text-navy">{m.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.city} · {m.leadsOpen} open · {m.closedMTD} closed
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Calls today */}
                <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone size={11} />
                  <span>{repCallsToday[m.name] ?? 0} calls today</span>
                </div>
                <Badge tone="success">Online</Badge>
                <button
                  onClick={() => toast(`Opening ${m.name}'s profile…`)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
                >
                  View
                </button>
              </div>
            </div>
            {/* Conversion bar */}
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr]">
              <div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Target</span>
                  <span className="font-mono">{m.achieved}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary">
                  <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${m.achieved}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Conversion</span>
                  <span className="font-mono">{m.conversion}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary">
                  <div className="h-1.5 rounded-full bg-mid-blue transition-all" style={{ width: `${m.conversion}%` }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </Section>

      {/* Daily Targets */}
      <Section title="Daily Targets — Today">
        <div className="space-y-5">
          {dailyTargets.map((dt) => (
            <div key={dt.rep}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-navy">{dt.rep}</span>
                <span className="text-[10px] text-muted-foreground">
                  {dt.calls}/{dt.callTarget} calls · {dt.visits}/{dt.visitTarget} visits
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                    <Phone size={9} /> Calls
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(100, (dt.calls / dt.callTarget) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                    <MapPin size={9} /> Visits
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-mid-blue transition-all"
                      style={{ width: `${Math.min(100, (dt.visits / dt.visitTarget) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   TEAM LEADS
══════════════════════════════════════════════════════════════ */

const budgetMap: Record<string, string> = {
  'L-1042': '₹3.0–3.5 Cr',
  'L-1043': '₹4.0–4.5 Cr',
  'L-1044': '₹30–40k/mo',
  'L-1045': '₹1.5–2L/mo',
  'L-1046': '₹6–7 Cr',
  'L-1047': '₹2.5–3 Cr',
};

const rowBg: Record<string, string> = {
  Hot: 'bg-red-50',
  Warm: 'bg-amber-50',
  Cold: 'bg-blue-50',
  New: 'bg-white',
};

function TeamLeads() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  function handleExport() {
    const headers = ['ID', 'Name', 'Interest', 'Budget', 'Source', 'Owner', 'Status', 'Days Since Contact'];
    const rows = leads.map((l) => [
      l.id, l.name, l.interest, budgetMap[l.id] ?? '', l.source, l.owner, l.status, daysSinceLabel(l.lastActivity),
    ]);
    exportCSV('team-leads.csv', headers, rows);
    toast.success('Team Leads CSV downloaded');
  }

  return (
    <>
      <PageHead title="Team Leads" sub="Every lead across the team — comment or reassign." />
      <Section
        title="All Leads"
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
                <th className="py-2 text-left">Lead</th>
                <th className="text-left">Interest</th>
                <th className="text-left">Budget</th>
                <th className="text-left">Source</th>
                <th className="text-left">Owner</th>
                <th className="text-left">Status</th>
                <th className="text-left">Last Contact</th>
                <th className="text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <>
                  <tr key={l.id} className={`${rowBg[l.status] ?? 'bg-white'} transition-colors`}>
                    <td className="py-3">
                      <div className="font-semibold text-navy">{l.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{l.id}</div>
                    </td>
                    <td className="text-xs">{l.interest}</td>
                    <td className="text-xs font-medium">{budgetMap[l.id] ?? '—'}</td>
                    <td className="text-xs">{l.source}</td>
                    <td className="text-xs">{l.owner}</td>
                    <td>
                      <Badge tone={l.status.toLowerCase() as 'hot' | 'warm' | 'cold' | 'new'}>{l.status}</Badge>
                    </td>
                    <td className="text-xs font-mono text-muted-foreground">{daysSinceLabel(l.lastActivity)}</td>
                    <td className="space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setExpandedRow(expandedRow === l.id ? null : l.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary transition"
                      >
                        + Add Note {expandedRow === l.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                      <button
                        onClick={() => toast.success(`${l.id} reassigned`)}
                        className="rounded-md bg-mid-blue px-3 py-1 text-xs font-semibold text-white hover:opacity-90 transition"
                      >
                        Reassign
                      </button>
                    </td>
                  </tr>
                  {expandedRow === l.id && (
                    <tr key={`${l.id}-note`} className="bg-slate-50">
                      <td colSpan={8} className="px-4 pb-4 pt-2">
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={notes[l.id] ?? ''}
                            onChange={(e) => setNotes((prev) => ({ ...prev, [l.id]: e.target.value }))}
                            placeholder={`Add a note for ${l.name}…`}
                            rows={3}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                toast.success(`Note saved for ${l.name}`);
                                setExpandedRow(null);
                              }}
                              className="rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
                            >
                              Save Note
                            </button>
                            <button
                              onClick={() => setExpandedRow(null)}
                              className="rounded-md border border-border px-4 py-1.5 text-xs font-semibold hover:bg-secondary transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   REASSIGNMENT
══════════════════════════════════════════════════════════════ */

const repLoadMap: Record<string, number> = {
  'Priya Sharma': 14,
  'Karan Joshi': 19,
  'Anita Rao': 9,
  'Devansh Patel': 11,
};

const REASSIGN_REASONS = ['Overloaded', 'OOO', 'Skill Match', 'Territory'];

function LoadBar({ name, load }: { name: string; load: number }) {
  const max = 25;
  const pct = Math.min(100, Math.round((load / max) * 100));
  const color = pct > 75 ? 'bg-red-400' : pct > 50 ? 'bg-amber-400' : 'bg-emerald-500';
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

function Reassignment() {
  const [from, setFrom] = useState('Priya Sharma');
  const [to, setTo] = useState('Karan Joshi');
  const [lead, setLead] = useState(leads[0].id);
  const [reason, setReason] = useState(REASSIGN_REASONS[0]);

  return (
    <>
      <PageHead title="Reassignment" sub="Move a lead from one rep to another in one step." />

      {/* Preview panel */}
      <Section title="Rep Load Preview">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">From</div>
            <LoadBar name={from} load={repLoadMap[from] ?? 0} />
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">To</div>
            <LoadBar name={to} load={repLoadMap[to] ?? 0} />
          </div>
        </div>
      </Section>

      <Section title="Bulk Reassign">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Lead</label>
            <select
              value={lead}
              onChange={(e) => setLead(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            >
              {leads.map((l) => <option key={l.id} value={l.id}>{l.id} — {l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">From</label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            >
              {teamMembers.map((m) => <option key={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">To</label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            >
              {teamMembers.map((m) => <option key={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            >
              {REASSIGN_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
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

/* ══════════════════════════════════════════════════════════════
   ACTIVITY MONITOR
══════════════════════════════════════════════════════════════ */

const callLog = [
  { caller: 'Priya S.',   lead: 'Rohan Mehta',  duration: '4m 12s', outcome: 'Connected' as const,  ts: '10:42' },
  { caller: 'Karan J.',   lead: 'Aisha Khan',   duration: '0m 00s', outcome: 'No Answer' as const,  ts: '10:30' },
  { caller: 'Anita R.',   lead: 'Neha Reddy',   duration: '2m 55s', outcome: 'Callback' as const,   ts: '09:58' },
  { caller: 'Priya S.',   lead: 'Suresh Iyer',  duration: '6m 40s', outcome: 'Connected' as const,  ts: '09:45' },
  { caller: 'Devansh P.', lead: 'Vikram Singh', duration: '1m 10s', outcome: 'Callback' as const,   ts: '09:20' },
  { caller: 'Karan J.',   lead: 'Kavya Nair',   duration: '3m 28s', outcome: 'Connected' as const,  ts: '09:05' },
];

const outcomeIcon = {
  Connected: <PhoneCall size={13} className="text-emerald-600" />,
  'No Answer': <PhoneMissed size={13} className="text-red-500" />,
  Callback: <PhoneIncoming size={13} className="text-amber-500" />,
};

const outcomeBadge: Record<string, string> = {
  Connected: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'No Answer': 'bg-red-50 text-red-600 border border-red-200',
  Callback: 'bg-amber-50 text-amber-700 border border-amber-200',
};

function ActivityMonitor() {
  const fmtDur = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  const recentViews = [...propertyViews].sort((a, b) => b.ts.localeCompare(a.ts));

  function handleExport() {
    const headers = ['Time', 'Caller', 'Lead', 'Duration', 'Outcome'];
    const rows = callLog.map((c) => [c.ts, c.caller, c.lead, c.duration, c.outcome]);
    exportCSV('call-log.csv', headers, rows);
    toast.success('Call Log CSV downloaded');
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
            {callLog.filter((c) => c.outcome === 'Connected').length} connected
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <ActivityIcon size={12} /> Events Today
          </div>
          <div className="mt-2 font-display text-3xl font-black text-navy">{activities.length * 2}</div>
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
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${outcomeBadge[c.outcome]}`}>
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
        action={<span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">{recentViews.length} views</span>}
      >
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr><th>User</th><th>Role</th><th>Property</th><th>City</th><th>Time</th><th>Duration</th><th>Unlocked</th></tr>
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
                    {v.propertyTitle.split('—')[0].trim()}
                  </td>
                  <td className="text-xs text-muted-foreground">{v.city}</td>
                  <td className="font-mono text-xs text-muted-foreground">{v.ts}</td>
                  <td className="font-mono text-xs">{fmtDur(v.durationSec)}</td>
                  <td>
                    <Badge tone={v.contactUnlocked ? 'success' : 'cold'}>
                      {v.contactUnlocked ? 'Yes' : 'No'}
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

/* ══════════════════════════════════════════════════════════════
   PERFORMANCE
══════════════════════════════════════════════════════════════ */

// Weekly trend data (last 4 weeks): closed deals per week
const weeklyTrend: Record<string, number[]> = {
  'Priya Sharma':  [1, 2, 1, 4],
  'Karan Joshi':   [2, 2, 3, 6],
  'Anita Rao':     [0, 1, 1, 2],
  'Devansh Patel': [1, 1, 2, 3],
};

const monthlyTarget = 8;

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-6">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-3 rounded-sm bg-emerald-400 transition-all"
          style={{ height: `${Math.round((v / max) * 100)}%`, minHeight: 2 }}
          title={`Wk ${i + 1}: ${v}`}
        />
      ))}
    </div>
  );
}

function Performance() {
  const sorted = [...teamMembers].sort((a, b) => b.closedMTD - a.closedMTD);

  return (
    <>
      <PageHead title="Performance" sub="Rep-level achievement vs targets." />

      {/* Leaderboard */}
      <Section title="Leaderboard — Closed MTD">
        <div className="space-y-3">
          {sorted.map((m, idx) => {
            const gap = Math.max(0, monthlyTarget - m.closedMTD);
            return (
              <div key={m.id} className="flex items-center gap-4 rounded-xl border border-border bg-slate-50 px-4 py-3">
                {/* Rank */}
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display text-sm font-black
                  ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-slate-300 text-navy' : idx === 2 ? 'bg-orange-300 text-white' : 'bg-secondary text-muted-foreground'}`}>
                  {idx === 0 ? <Trophy size={14} /> : idx + 1}
                </div>
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy text-sm">{m.name}</div>
                  <div className="text-[10px] text-muted-foreground">{m.city} · {m.conversion}% conversion</div>
                </div>
                {/* Sparkline */}
                <div className="hidden sm:block">
                  <div className="text-[9px] text-muted-foreground mb-1 text-center">4wk trend</div>
                  <Sparkline values={weeklyTrend[m.name] ?? [0, 0, 0, 0]} />
                </div>
                {/* Closed & gap */}
                <div className="text-right flex-shrink-0">
                  <div className="font-display text-xl font-black text-navy">{m.closedMTD}</div>
                  <div className="text-[10px] text-muted-foreground">closed</div>
                </div>
                <div className={`flex-shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${gap === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {gap === 0 ? 'Target hit!' : `-${gap} to go`}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Detailed progress */}
      <Section title="MTD Target Achievement">
        <div className="overflow-x-auto">
          <table className="portal-table w-full text-sm">
            <thead>
              <tr>
                <th className="py-2 text-left">Rep</th>
                <th className="text-left">Closed</th>
                <th className="text-left">Conversion</th>
                <th className="text-left">Achievement</th>
                <th className="text-left">Target Gap</th>
                <th className="text-left">4-Week Trend</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((m) => {
                const gap = Math.max(0, monthlyTarget - m.closedMTD);
                return (
                  <tr key={m.id}>
                    <td className="py-3">
                      <div className="font-semibold text-navy">{m.name}</div>
                      <div className="text-[10px] text-muted-foreground">{m.city}</div>
                    </td>
                    <td className="font-display text-lg font-black text-navy">{m.closedMTD}</td>
                    <td className="text-xs">{m.conversion}%</td>
                    <td className="w-36">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-secondary">
                          <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${m.achieved}%` }} />
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground w-10 text-right">{m.achieved}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${gap === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {gap === 0 ? 'Done' : `${gap} more`}
                      </span>
                    </td>
                    <td>
                      <Sparkline values={weeklyTrend[m.name] ?? [0, 0, 0, 0]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   VISIT CALENDAR
══════════════════════════════════════════════════════════════ */

type VisitStatus = 'Confirmed' | 'Pending' | 'Cancelled';

const visits: { day: string; dayShort: string; time: string; hour: number; rep: string; prop: string; status: VisitStatus }[] = [
  { day: 'Monday',    dayShort: 'Mon', time: '10:00 AM', hour: 10, rep: 'Priya S.',   prop: 'Skyline Residences',   status: 'Confirmed' },
  { day: 'Monday',    dayShort: 'Mon', time: '4:30 PM',  hour: 16, rep: 'Karan J.',   prop: 'Green Acres Villa',    status: 'Confirmed' },
  { day: 'Tuesday',   dayShort: 'Tue', time: '11:00 AM', hour: 11, rep: 'Priya S.',   prop: 'Marina Heights',       status: 'Pending'   },
  { day: 'Wednesday', dayShort: 'Wed', time: '2:00 PM',  hour: 14, rep: 'Anita R.',   prop: 'Heritage Bungalow',    status: 'Confirmed' },
  { day: 'Thursday',  dayShort: 'Thu', time: '3:30 PM',  hour: 15, rep: 'Karan J.',   prop: 'Urban Studio',         status: 'Cancelled' },
  { day: 'Friday',    dayShort: 'Fri', time: '10:00 AM', hour: 10, rep: 'Devansh P.', prop: 'Tech Park Office',     status: 'Pending'   },
  { day: 'Saturday',  dayShort: 'Sat', time: '12:00 PM', hour: 12, rep: 'Priya S.',   prop: 'Skyline Residences',   status: 'Confirmed' },
  { day: 'Saturday',  dayShort: 'Sat', time: '4:00 PM',  hour: 16, rep: 'Anita R.',   prop: 'Green Acres Villa',    status: 'Pending'   },
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const statusVisitStyle: Record<VisitStatus, string> = {
  Confirmed: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  Pending:   'bg-amber-100 border-amber-300 text-amber-800',
  Cancelled: 'bg-red-100 border-red-300 text-red-700 line-through opacity-60',
};

const statusDot: Record<VisitStatus, string> = {
  Confirmed: 'bg-emerald-500',
  Pending:   'bg-amber-400',
  Cancelled: 'bg-red-400',
};

function VisitCalendar() {
  return (
    <>
      <PageHead title="Visit Calendar" sub="Site visits scheduled across the team — week view." />

      {/* Week grid */}
      <Section title="Week Grid — Mon to Sat · 9AM–7PM">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header row */}
            <div className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-border pb-2 mb-1">
              <div />
              {days.map((d) => (
                <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{d}</div>
              ))}
            </div>
            {/* Time rows */}
            {hours.map((h) => (
              <div key={h} className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-border/50 min-h-[44px]">
                <div className="flex items-start pt-1 pr-2 text-right">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`}
                  </span>
                </div>
                {days.map((d) => {
                  const cell = visits.find((v) => v.dayShort === d && v.hour === h);
                  return (
                    <div key={d} className="border-l border-border/30 p-0.5">
                      {cell && (
                        <div className={`rounded border px-1.5 py-1 text-[10px] leading-tight ${statusVisitStyle[cell.status]}`}>
                          <div className="font-bold truncate">{cell.prop.split(' ')[0]}</div>
                          <div className="opacity-80">{cell.rep}</div>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDot[cell.status]}`} />
                            <span className="opacity-70">{cell.status}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* List view */}
      <Section title="All Scheduled Visits">
        {visits.map((v, i) => (
          <div key={i} className="flex items-center justify-between border-b border-border py-3 last:border-0">
            <div>
              <div className="font-semibold text-navy">{v.prop}</div>
              <div className="text-xs text-muted-foreground">{v.rep} · {v.day}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-display text-sm font-bold text-accent">{v.day}</div>
                <div className="text-xs text-muted-foreground">{v.time}</div>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${statusVisitStyle[v.status]}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot[v.status]}`} />
                {v.status}
              </span>
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   ESCALATIONS
══════════════════════════════════════════════════════════════ */

const escalations = [
  { id: 'E-12', lead: 'L-1031', note: 'Stuck 6 days — no follow-up by Karan J.', level: 'Medium' as const, createdHoursAgo: 18, assignedTo: 'Karan Joshi' },
  { id: 'E-13', lead: 'L-1024', note: 'Negotiation stalled, client unresponsive',  level: 'High'   as const, createdHoursAgo: 9,  assignedTo: 'Priya Sharma' },
  { id: 'E-14', lead: 'L-1042', note: 'Repeat site-visit no-show',                 level: 'Low'    as const, createdHoursAgo: 3,  assignedTo: 'Anita Rao'   },
];

function SlaTimer({ hours }: { hours: number }) {
  const color = hours >= 24 ? 'text-red-600' : hours >= 12 ? 'text-amber-600' : 'text-emerald-600';
  return (
    <div className={`flex items-center gap-1 font-mono text-xs font-semibold ${color}`}>
      <Clock size={11} /> {hours}h
    </div>
  );
}

function Escalations() {
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
                  <td><SlaTimer hours={e.createdHoursAgo} /></td>
                  <td>
                    <Badge tone={e.level === 'High' ? 'hot' : e.level === 'Medium' ? 'warm' : 'cold'}>
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
