'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Target, FileText, ClipboardList, Phone,
  Building, Wallet, LayoutGrid, Download,
  MapPin, CheckCircle2, XCircle, Clock, Calendar,
} from 'lucide-react';
import { PortalShell, StatCard, Section, Badge } from '@/components/portal/PortalShell';
import { useActiveHash } from '@/lib/use-active-hash';
import { leads, activities, properties, propertyViews } from '@/data/static';

const nav = [
  { label: 'My Leads',      to: '/sales-portal',            icon: <Target size={14} /> },
  { label: 'Lead Details',  to: '/sales-portal#detail',     icon: <FileText size={14} /> },
  { label: 'Activity Log',  to: '/sales-portal#log',        icon: <ClipboardList size={14} /> },
  { label: 'Click-to-Call', to: '/sales-portal#call',       icon: <Phone size={14} /> },
  { label: 'Site Visits',   to: '/sales-portal#visits',     icon: <Building size={14} /> },
  { label: 'My Commission', to: '/sales-portal#commission', icon: <Wallet size={14} /> },
  { label: 'Listings',      to: '/sales-portal#listings',   icon: <LayoutGrid size={14} /> },
];

// ─── CSV helper ──────────────────────────────────────────────────────────────
function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SalesPortal() {
  const h = useActiveHash();
  return (
    <PortalShell brand="NxtSft.com Field" role="Sales Rep" accent="amber" user={{ name: 'Priya Sharma', initials: 'PS' }} nav={nav} basePath="/sales-portal">
      {renderTab(h)}
    </PortalShell>
  );
}

const Head = ({ t, s }: { t: string; s?: string }) => (
  <div className="mb-6">
    <h2 className="font-display text-2xl font-bold text-navy">{t}</h2>
    {s && <p className="mt-1 text-sm text-muted-foreground">{s}</p>}
  </div>
);

function renderTab(h: string) {
  switch (h) {
    case 'detail':     return <Detail />;
    case 'log':        return <Log />;
    case 'call':       return <Call />;
    case 'visits':     return <Visits />;
    case 'commission': return <Commission />;
    case 'listings':   return <Listings />;
    default:           return <MyLeads />;
  }
}

// ─── Augmented static data ────────────────────────────────────────────────────
const leadMeta: Record<string, { budgetRange: string; source: 'WhatsApp' | 'Organic' | 'Referral'; daysInPipeline: number }> = {
  default: { budgetRange: '₹40L–₹60L', source: 'Organic', daysInPipeline: 12 },
};
function getMeta(id: string) {
  return leadMeta[id] ?? leadMeta['default'];
}

const sourceTone: Record<string, 'hot' | 'warm' | 'cold' | 'new' | 'success'> = {
  WhatsApp: 'hot',
  Organic: 'new',
  Referral: 'warm',
};

// ─── My Leads ─────────────────────────────────────────────────────────────────
function MyLeads() {
  const [filter, setFilter] = useState<'All' | 'Hot' | 'Warm' | 'Cold'>('All');
  const mine = leads.slice(0, 4);
  const filtered = filter === 'All' ? mine : mine.filter((l) => l.status.toLowerCase() === filter.toLowerCase());

  function handleExport() {
    const headers = ['ID', 'Name', 'Phone', 'City', 'Interest', 'Budget', 'Status', 'Source', 'Days In Pipeline', 'Last Activity'];
    const rows = filtered.map((l) => {
      const m = getMeta(l.id);
      return [l.id, l.name, l.phone, l.city, l.interest, `₹${(l.value / 100000).toFixed(1)}L`, l.status, m.source, String(m.daysInPipeline), l.lastActivity];
    });
    downloadCSV('my-leads.csv', headers, rows);
    toast.success('CSV downloaded');
  }

  return (
    <>
      <Head t="My Leads" s="Your active queue — call, WhatsApp or annotate." />

      {/* 6 stat cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="My Open Leads" value="14" sub="+2 today" />
        <StatCard label="Closed MTD" value="4" sub="+1 this wk" />
        <StatCard label="Visits This Wk" value="6" sub="2 tomorrow" />
        <StatCard label="Commission MTD" value="₹2.18 L" sub="+₹48K pending" accent="text-accent" />
        <StatCard label="Hot Leads" value="6" sub="Needs action" accent="text-accent" />
        <StatCard label="Avg Deal Size" value="₹48 L" sub="MTD average" />
      </div>

      <Section
        title="Assigned to you"
        action={
          <div className="flex items-center gap-3">
            {/* Quick filter tabs */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
              {(['All', 'Hot', 'Warm', 'Cold'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 transition-colors ${filter === f ? 'bg-accent text-white' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              <Download size={12} /> Export
            </button>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No leads match this filter.</p>
        ) : (
          filtered.map((l) => {
            const m = getMeta(l.id);
            return (
              <div key={l.id} className="border-b border-border py-4 last:border-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-navy">{l.name}</span>
                      <Badge tone={l.status.toLowerCase() as 'hot' | 'warm' | 'cold' | 'new'}>{l.status}</Badge>
                      <Badge tone={sourceTone[m.source] ?? 'new'}>{m.source}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{l.interest} · {l.city} · Budget: {m.budgetRange}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground flex items-center gap-2">
                      <span>{l.id} · {l.lastActivity}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">{m.daysInPipeline}d in pipeline</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toast.success(`Calling ${l.name}`)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <Phone size={12} /> Call
                    </button>
                    <button
                      onClick={() => toast.success(`WhatsApp opened for ${l.name}`)}
                      className="rounded-md bg-mid-blue px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => toast('Note saved')}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
                    >
                      + Note
                    </button>
                    <button
                      onClick={() => toast.success(`Visit scheduled for ${l.name}`)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <Calendar size={12} /> Schedule Visit
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </Section>
    </>
  );
}

// ─── Lead Detail ──────────────────────────────────────────────────────────────
function Detail() {
  const l = leads[0];
  const leadViews = propertyViews.filter((v) => v.leadId === l.id);
  const fmtDur = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  const [nextAction, setNextAction] = useState('Call');
  const [nextDate, setNextDate] = useState('');

  const activityIcons: Record<string, string> = {
    call: '📞',
    visit: '🏠',
    note: '📝',
    whatsapp: '💬',
  };
  function getIcon(action: string) {
    const key = Object.keys(activityIcons).find((k) => action.toLowerCase().includes(k));
    return key ? activityIcons[key] : '📋';
  }

  return (
    <>
      <Head t={`Lead Detail — ${l.name}`} s={`${l.id} · ${l.interest}`} />

      <Section title="Profile">
        <div className="grid gap-4 md:grid-cols-2">
          <Field k="Name" v={l.name} />
          <Field k="Phone" v={l.phone} />
          <Field k="City" v={l.city} />
          <Field k="Source" v={l.source} />
          <Field k="Budget Range" v={getMeta(l.id).budgetRange} />
          <Field k="Property Type Preferred" v={l.interest} />
          <Field k="Timeline" v="6 months" />
          <Field k="Last Contacted" v={l.lastActivity} />
        </div>
      </Section>

      {/* Next Action */}
      <Section title="Next Action">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Action Type</label>
            <select
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {['Call', 'WhatsApp', 'Site Visit', 'Send Brochure'].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Scheduled Date</label>
            <input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            onClick={() => toast.success(`Action logged: ${nextAction}${nextDate ? ` on ${nextDate}` : ''}`)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Log Action
          </button>
        </div>
      </Section>

      <Section title={`Properties Viewed by ${l.name}`} action={<span className="text-xs font-semibold text-muted-foreground">{leadViews.length} properties</span>}>
        {leadViews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No property views linked to this lead yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {leadViews.map((v) => {
              const prop = properties.find((p) => p.id === v.propertyId);
              return (
                <div key={v.id} className="flex items-center gap-4 py-3">
                  {prop && <img src={prop.image} alt="" className="h-12 w-16 flex-shrink-0 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-navy truncate">{v.propertyTitle}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{v.city} · {fmtDur(v.durationSec)} spent · {v.ts}</div>
                  </div>
                  {v.contactUnlocked && <Badge tone="success">Contact Unlocked</Badge>}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Timeline">
        <div className="relative pl-6">
          <div className="absolute left-2 top-0 h-full w-px bg-border" />
          {activities.slice(0, 4).map((a, i) => (
            <div key={i} className="relative mb-4 last:mb-0">
              <div className="absolute -left-4 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-xs">
                {getIcon(a.action)}
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="font-semibold text-navy text-sm">{a.action}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{a.outcome} · {a.ts}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

const Field = ({ k, v }: { k: string; v: string }) => (
  <div className="rounded-lg border border-border p-3">
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
    <div className="mt-1 font-semibold text-navy">{v}</div>
  </div>
);

// ─── Activity Log ─────────────────────────────────────────────────────────────
type OutcomeTone = 'hot' | 'warm' | 'cold' | 'new' | 'success';
const outcomeTone: Record<string, OutcomeTone> = {
  Positive: 'success',
  Neutral: 'new',
  Negative: 'cold',
};

function classifyOutcome(outcome: string): 'Positive' | 'Neutral' | 'Negative' {
  const lower = outcome.toLowerCase();
  if (lower.includes('interest') || lower.includes('confirm') || lower.includes('paid')) return 'Positive';
  if (lower.includes('no answer') || lower.includes('callback') || lower.includes('busy')) return 'Negative';
  return 'Neutral';
}

function classifyType(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes('call')) return 'Calls';
  if (lower.includes('visit')) return 'Visits';
  return 'Notes';
}

function Log() {
  const [typeFilter, setTypeFilter] = useState<'All' | 'Calls' | 'Visits' | 'Notes'>('All');
  const allLogs = [...activities, ...activities];

  const filtered = typeFilter === 'All' ? allLogs : allLogs.filter((a) => classifyType(a.action) === typeFilter);

  // Group by date (use first 10 chars of ts as date key)
  const grouped: Record<string, typeof allLogs> = {};
  filtered.forEach((a) => {
    const date = a.ts.slice(0, 10) || 'Today';
    (grouped[date] ||= []).push(a);
  });

  function handleExport() {
    const headers = ['Date', 'Action', 'Outcome', 'Type', 'Outcome Sentiment'];
    const rows = filtered.map((a) => [a.ts, a.action, a.outcome, classifyType(a.action), classifyOutcome(a.outcome)]);
    downloadCSV('activity-log.csv', headers, rows);
    toast.success('CSV downloaded');
  }

  return (
    <>
      <Head t="Activity Log" s="Everything you've done today." />
      <Section
        title="Log"
        action={
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
              {(['All', 'Calls', 'Visits', 'Notes'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`px-3 py-1.5 transition-colors ${typeFilter === f ? 'bg-accent text-white' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              <Download size={12} /> Export
            </button>
          </div>
        }
      >
        {Object.entries(grouped).map(([date, entries]) => (
          <div key={date} className="mb-4 last:mb-0">
            <div className="mb-2 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground border-b border-border pb-1">{date}</div>
            {entries.map((a, i) => {
              const sentiment = classifyOutcome(a.outcome);
              const tone = outcomeTone[sentiment] ?? 'new';
              return (
                <div key={i} className="border-b border-border py-3 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{classifyType(a.action) === 'Calls' ? '📞' : classifyType(a.action) === 'Visits' ? '🏠' : '📝'}</span>
                      <span className="font-semibold text-navy text-sm">{a.action}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge tone={tone}>{sentiment}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">{a.ts}</span>
                    </div>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground pl-7">{a.outcome}</div>
                </div>
              );
            })}
          </div>
        ))}
      </Section>
    </>
  );
}

// ─── Click-to-Call ────────────────────────────────────────────────────────────
type CallStatus = 'idle' | 'connected' | 'no_answer' | 'callback';

const callStatusConfig: Record<Exclude<CallStatus, 'idle'>, { label: string; tone: OutcomeTone; icon: React.ReactNode }> = {
  connected:  { label: 'Connected',           tone: 'success', icon: <CheckCircle2 size={12} /> },
  no_answer:  { label: 'No Answer',           tone: 'cold',    icon: <XCircle size={12} /> },
  callback:   { label: 'Callback Scheduled',  tone: 'warm',    icon: <Clock size={12} /> },
};

interface RecentCall { name: string; phone: string; status: Exclude<CallStatus, 'idle'>; duration: string; ts: string }

function Call() {
  const [callStatuses, setCallStatuses] = useState<Record<string, CallStatus>>({});
  const [durations, setDurations] = useState<Record<string, string>>({});
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);

  function dial(l: (typeof leads)[0]) {
    toast.success(`Dialing ${l.phone}…`);
    setCallStatuses((prev) => ({ ...prev, [l.id]: 'connected' }));
    setDurations((prev) => ({ ...prev, [l.id]: '' }));
  }

  function recordOutcome(l: (typeof leads)[0], status: Exclude<CallStatus, 'idle'>) {
    setCallStatuses((prev) => ({ ...prev, [l.id]: status }));
    const dur = durations[l.id] || '0m 0s';
    setRecentCalls((prev) => [{ name: l.name, phone: l.phone, status, duration: dur, ts: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
    toast.success(`Outcome recorded: ${callStatusConfig[status].label}`);
  }

  return (
    <>
      <Head t="Click-to-Call" s="One-tap dial via our PSTN gateway." />
      <Section title="Quick dial">
        <div className="grid gap-3 sm:grid-cols-2">
          {leads.slice(0, 5).map((l) => {
            const status = callStatuses[l.id] ?? 'idle';
            const cfg = status !== 'idle' ? callStatusConfig[status] : null;
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
                {status !== 'idle' && (
                  <div className="space-y-2">
                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      {cfg && <Badge tone={cfg.tone}><span className="flex items-center gap-1">{cfg.icon}{cfg.label}</span></Badge>}
                    </div>
                    {/* Duration input */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">Duration:</label>
                      <input
                        type="text"
                        placeholder="e.g. 2m 30s"
                        value={durations[l.id] ?? ''}
                        onChange={(e) => setDurations((prev) => ({ ...prev, [l.id]: e.target.value }))}
                        className="rounded border border-border bg-background px-2 py-1 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    {/* Outcome buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {(['connected', 'no_answer', 'callback'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => recordOutcome(l, s)}
                          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold border transition-colors ${status === s ? 'bg-accent text-white border-accent' : 'border-border text-muted-foreground hover:bg-muted'}`}
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

// ─── Site Visits ──────────────────────────────────────────────────────────────
type VisitStatus = 'Confirmed' | 'Pending' | 'Cancelled';
const visitStatusTone: Record<VisitStatus, OutcomeTone> = {
  Confirmed: 'success',
  Pending: 'warm',
  Cancelled: 'cold',
};

function Visits() {
  const initialSlots: Array<{ day: string; time: string; lead: string; prop: string; addr: string; status: VisitStatus }> = [
    { day: 'Today',    time: '4:30 PM',  lead: 'Rohan Mehta',  prop: 'Skyline Residences',  addr: 'Bandra West, Mumbai',       status: 'Confirmed' },
    { day: 'Tomorrow', time: '11:00 AM', lead: 'Aisha Khan',   prop: 'Green Acres Villa',   addr: 'Whitefield, Bengaluru',     status: 'Pending' },
    { day: 'Sat',      time: '2:00 PM',  lead: 'Suresh Iyer',  prop: 'Heritage Bungalow',   addr: 'Greater Kailash, Delhi',    status: 'Confirmed' },
  ];

  const [slots, setSlots] = useState(initialSlots);

  function cancelVisit(i: number) {
    setSlots((prev) => prev.map((s, idx) => idx === i ? { ...s, status: 'Cancelled' } : s));
    toast.success('Visit cancelled');
  }

  function rescheduleVisit(lead: string) {
    toast.success(`Reschedule request sent for ${lead}`);
  }

  return (
    <>
      <Head t="Site Visits" s="Your scheduled tours." />
      <Section title="Upcoming">
        {slots.map((v, i) => (
          <div key={i} className="border-b border-border py-4 last:border-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-navy">{v.prop} — {v.lead}</span>
                  <Badge tone={visitStatusTone[v.status]}>{v.status}</Badge>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin size={10} /> {v.addr}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-right">
                  <div className="font-display text-sm font-bold text-accent">{v.day}</div>
                  <div className="text-xs text-muted-foreground">{v.time}</div>
                </div>
                <button
                  onClick={() => toast.success(`Map link opened for ${v.prop}`)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
                >
                  <MapPin size={11} /> Map
                </button>
                <button
                  onClick={() => rescheduleVisit(v.lead)}
                  disabled={v.status === 'Cancelled'}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => cancelVisit(i)}
                  disabled={v.status === 'Cancelled'}
                  className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}

// ─── Commission ───────────────────────────────────────────────────────────────
function Commission() {
  const rows: [string, string, string][] = [
    ['L-1019 Closed', '₹62L deal', '₹1.24L'],
    ['L-1011 Closed', '₹38L deal', '₹76K'],
    ['L-1007 Closed', '₹45L deal', '₹90K'],
  ];

  const ytdEarned = 14.4;
  const ytdTarget = 20;
  const progressPct = Math.min(100, Math.round((ytdEarned / ytdTarget) * 100));
  const pendingKYC = true;

  return (
    <>
      <Head t="My Commission" s="Payouts & history." />

      {pendingKYC && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <span>⚠️</span>
          <span>Pending KYC — complete your KYC to receive payouts without delay.</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending Payout" value="₹1.24 L" sub="Clears 5th" accent="text-accent" />
        <StatCard label="Earned MTD" value="₹2.18 L" sub="+₹48K wk" />
        <StatCard label="YTD" value="₹14.4 L" sub="+₹3.1L vs LY" />
      </div>

      {/* YTD progress bar */}
      <Section title="YTD Target Achievement">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>₹{ytdEarned}L earned</span>
            <span>{progressPct}% of ₹{ytdTarget}L target</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">₹{(ytdTarget - ytdEarned).toFixed(1)}L remaining to hit annual target</div>
        </div>
      </Section>

      <Section title="Recent payouts">
        {rows.map(([t, d, c]) => (
          <div key={t} className="flex items-center justify-between border-b border-border py-3 last:border-0">
            <div>
              <div className="font-semibold text-navy">{t}</div>
              <div className="text-xs text-muted-foreground">{d}</div>
            </div>
            <span className="font-mono text-sm font-bold text-accent">{c}</span>
          </div>
        ))}
      </Section>

      <Section title="Payment Details">
        <div className="grid gap-4 md:grid-cols-2">
          <Field k="Payment Method" v="NEFT to HDFC ****4521" />
          <Field k="Expected Payout Date" v="5th July 2026" />
        </div>
      </Section>
    </>
  );
}

// ─── Listings ─────────────────────────────────────────────────────────────────
function Listings() {
  return (
    <>
      <Head t="Assigned Listings" s="Properties tagged to you." />
      <Section title="Inventory">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-lg border border-border">
              <img src={p.image} alt="" className="h-32 w-full object-cover" />
              <div className="p-3">
                <div className="text-xs text-muted-foreground">{p.locality}</div>
                <div className="font-semibold text-navy">{p.title}</div>
                <div className="mt-1 font-display text-base font-bold text-accent">{p.priceLabel}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
