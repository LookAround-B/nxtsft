'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  LayoutDashboard, Users, Building2, Target, Kanban,
  BellRing, Megaphone, Building, BarChart2, Wallet, ReceiptText,
  CheckCircle, XCircle, Eye,
} from 'lucide-react';
import { PortalShell, StatCard, Section, Badge } from '@/components/portal/PortalShell';
import { useActiveHash } from '@/lib/use-active-hash';
import { leads, teamMembers, properties, pipeline, activities, subscriptions, unlockedContacts, disputes as disputeData, propertyViews } from '@/data/static';

// ─── CSV helper ────────────────────────────────────────────────────────────────
const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: filename,
  });
  a.click();
};

const nav = [
  { label: 'Operations',      to: '/admin-portal',               icon: <LayoutDashboard size={14} /> },
  { label: 'Team Management', to: '/admin-portal#team',          icon: <Users size={14} /> },
  { label: 'Listings',        to: '/admin-portal#listings',      icon: <Building2 size={14} /> },
  { label: 'Lead Management', to: '/admin-portal#leads',         icon: <Target size={14} /> },
  { label: 'CRM Pipeline',    to: '/admin-portal#crm',           icon: <Kanban size={14} /> },
  { label: 'Subscriptions',   to: '/admin-portal#subscriptions', icon: <ReceiptText size={14} /> },
  { label: 'Property Views',  to: '/admin-portal#views',         icon: <Eye size={14} /> },
  { label: 'Click Alerts',    to: '/admin-portal#alerts',        icon: <BellRing size={14} /> },
  { label: 'Marketing',       to: '/admin-portal#marketing',     icon: <Megaphone size={14} /> },
  { label: 'Developers',      to: '/admin-portal#dev',           icon: <Building size={14} /> },
  { label: 'Reports',         to: '/admin-portal#reports',       icon: <BarChart2 size={14} /> },
  { label: 'Commissions',     to: '/admin-portal#commissions',   icon: <Wallet size={14} /> },
];

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  city: string;
  status: 'Active' | 'Invited';
  phone: string;
  joined: string;
  achieved: number;
};

const JOINED_DATES: Record<string, string> = {
  'U-21': 'Jan 2022', 'U-22': 'Mar 2021', 'U-23': 'Jul 2023', 'U-24': 'Nov 2022',
};
const PHONES: Record<string, string> = {
  'U-21': '+91 98765 11001', 'U-22': '+91 98765 11002', 'U-23': '+91 98765 11003', 'U-24': '+91 98765 11004',
};

const seedRoster: Member[] = teamMembers.map((m) => ({
  id: m.id,
  name: m.name,
  email: `${m.name.split(' ')[0].toLowerCase()}@nestiqo.in`,
  role: m.role,
  city: m.city,
  status: 'Active',
  phone: PHONES[m.id] ?? '+91 99999 00000',
  joined: JOINED_DATES[m.id] ?? 'Jan 2024',
  achieved: m.achieved,
}));

export default function AdminPortal() {
  const hash = useActiveHash();
  return (
    <PortalShell brand="Nestiqo Control" role="Admin" accent="red" user={{ name: 'Meera Iyer', initials: 'MI' }} nav={nav} basePath="/admin-portal">
      {renderTab(hash)}
    </PortalShell>
  );
}

function renderTab(hash: string) {
  switch (hash) {
    case 'team':          return <TeamTab />;
    case 'listings':      return <ListingsTab />;
    case 'leads':         return <LeadsTab />;
    case 'crm':           return <CRMTab />;
    case 'subscriptions': return <SubscriptionsTab />;
    case 'views':         return <ViewsTab />;
    case 'alerts':        return <AlertsTab />;
    case 'marketing':     return <MarketingTab />;
    case 'dev':           return <DevTab />;
    case 'reports':       return <ReportsTab />;
    case 'commissions':   return <CommissionsTab />;
    default:              return <OperationsTab />;
  }
}

function PageHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl font-bold text-navy">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

// ─── Activity border colours by user type ───────────────────────────────────
const activityBorderColor = (user: string) => {
  if (user === 'System') return 'border-l-amber-500';
  if (user.startsWith('Priya')) return 'border-l-emerald-500';
  if (user.startsWith('Karan')) return 'border-l-blue-500';
  if (user.startsWith('Anita')) return 'border-l-purple-500';
  if (user.startsWith('Devansh')) return 'border-l-rose-500';
  return 'border-l-accent';
};

// ─── Funnel bar component ────────────────────────────────────────────────────
function FunnelBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = Math.round((count / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-semibold text-navy">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-secondary h-4">
        <div className={`h-4 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-xs font-bold text-navy">{count}</span>
    </div>
  );
}

function OperationsTab() {
  return (
    <>
      <PageHead title="Operations Overview" subtitle="Pulse of all Nestiqo ops — refreshed every 30 seconds." />

      {/* 8-card stat grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Pipeline Value"     value="₹84.2 Cr"  sub="+9.1% wk" />
        <StatCard label="Open Leads"         value="412"        sub="+18 today" />
        <StatCard label="Pending Approvals"  value="27"         sub="6 urgent"           accent="text-amber-600" />
        <StatCard label="Click Alerts (24h)" value="14"         sub="3 thresholds hit"   accent="text-accent" />
        <StatCard label="Total Properties"   value="186"        sub="Across all cities" />
        <StatCard label="Conversions MTD"    value="23"         sub="+4 vs last mo"      accent="text-emerald-600" />
        <StatCard label="Avg Deal Size"      value="₹52 L"      sub="Up ₹3L vs last mo" />
        <StatCard label="Team Size"          value="18"         sub="4 cities active" />
      </div>

      {/* Funnel section */}
      <Section title="Conversion Funnel — This Month">
        <div className="space-y-3 py-1">
          <FunnelBar label="Leads"     count={412} max={412} color="bg-blue-500" />
          <FunnelBar label="Qualified" count={198} max={412} color="bg-violet-500" />
          <FunnelBar label="Site Visit" count={87} max={412} color="bg-amber-500" />
          <FunnelBar label="Closed"    count={23}  max={412} color="bg-emerald-500" />
        </div>
        <div className="mt-3 flex gap-6 text-[11px] text-muted-foreground">
          <span>Qualified rate: <strong className="text-navy">48%</strong></span>
          <span>Visit rate: <strong className="text-navy">44%</strong></span>
          <span>Close rate: <strong className="text-navy">26%</strong></span>
          <span>Overall: <strong className="text-emerald-600">5.6%</strong></span>
        </div>
      </Section>

      {/* Activity stream with coloured left border */}
      <Section title="Live Activity Stream">
        {activities.map((a, i) => (
          <div
            key={i}
            className={`border-b border-border py-3 last:border-0 pl-3 border-l-4 ${activityBorderColor(a.user)}`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-navy">{a.user}</span>
              <span className="font-mono text-muted-foreground">{a.ts}</span>
            </div>
            <div className="mt-1 text-sm">{a.action}</div>
            <div className="text-xs text-muted-foreground">{a.outcome}</div>
          </div>
        ))}
      </Section>

      <Section title="Quick Actions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Approve listing',    hash: 'listings' },
            { label: 'Invite team member', hash: 'team' },
            { label: 'View click alerts',  hash: 'alerts' },
            { label: 'Run weekly report',  hash: 'reports' },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => { window.location.hash = a.hash; }}
              className="rounded-lg border border-border bg-secondary/40 p-4 text-left text-sm font-semibold text-navy transition hover:border-accent hover:bg-white"
            >
              {a.label} →
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}

// ─── Performance bar ─────────────────────────────────────────────────────────
function PerfBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 overflow-hidden rounded-full bg-secondary h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
    </div>
  );
}

function TeamTab() {
  const [roster, setRoster] = useState<Member[]>(seedRoster);
  const [showInvite, setShowInvite] = useState(false);
  return (
    <>
      <PageHead title="Team Management" subtitle={`${roster.length} members across 4 cities`} />
      <Section
        title="Active Roster"
        action={
          <button onClick={() => setShowInvite(true)} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
            + Invite Member
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>City</th>
                <th>Joined</th>
                <th>Target %</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roster.map((m) => (
                <tr key={m.id}>
                  <td className="font-mono text-xs">{m.id}</td>
                  <td className="font-semibold text-navy">{m.name}</td>
                  <td className="text-xs text-muted-foreground">{m.email}</td>
                  <td className="font-mono text-xs text-muted-foreground">{m.phone}</td>
                  <td className="text-xs">{m.role}</td>
                  <td className="text-xs">{m.city}</td>
                  <td className="text-xs text-muted-foreground">{m.joined}</td>
                  <td><PerfBar pct={m.achieved} /></td>
                  <td><Badge tone={m.status === 'Active' ? 'success' : 'new'}>{m.status}</Badge></td>
                  <td className="text-right">
                    <button
                      onClick={() => { setRoster((r) => r.filter((x) => x.id !== m.id)); toast.success(`${m.name} removed from team`); }}
                      className="text-xs font-semibold text-accent"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvite={(m) => { setRoster((r) => [m, ...r]); setShowInvite(false); toast.success(`Invite sent to ${m.email}`); }}
        />
      )}
    </>
  );
}

function ListingsTab() {
  const [items, setItems] = useState(
    properties.map((p) => ({
      id: p.id,
      title: p.title,
      image: p.image,
      builder: p.builder,
      city: p.city,
      priceLabel: p.priceLabel,
      bhk: p.bhk,
      status: 'Pending' as 'Pending' | 'Approved' | 'Rejected',
    }))
  );
  const counts = {
    pending: items.filter((i) => i.status === 'Pending').length,
    approved: items.filter((i) => i.status === 'Approved').length,
    rejected: items.filter((i) => i.status === 'Rejected').length,
  };
  return (
    <>
      <PageHead title="Listings Approvals" subtitle="Moderate property submissions before they go live." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending"  value={String(counts.pending)}  sub="Awaiting review"     accent="text-amber-600" />
        <StatCard label="Approved" value={String(counts.approved)} sub="Live on site" />
        <StatCard label="Rejected" value={String(counts.rejected)} sub="Needs re-submission"  accent="text-accent" />
      </div>
      <Section title="All Submissions">
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <div key={it.id} className="flex gap-3 rounded-lg border border-border p-3">
              <img src={it.image} alt="" className="h-20 w-28 rounded-lg object-cover" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-navy">{it.title}</div>
                <div className="text-xs text-muted-foreground">{it.builder}</div>
                {/* New fields */}
                <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-navy">{it.city}</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-navy">{it.priceLabel}</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-semibold text-navy">{it.bhk}</span>
                </div>
                <div className="mt-2">
                  <Badge tone={it.status === 'Approved' ? 'success' : it.status === 'Rejected' ? 'hot' : 'warm'}>{it.status}</Badge>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => { setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, status: 'Approved' } : x)); toast.success(`Approved ${it.title}`); }}
                    className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, status: 'Rejected' } : x)); toast.error(`Rejected ${it.title}`); }}
                    className="rounded-md border border-border px-3 py-1 text-xs font-semibold"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function LeadsTab() {
  const [filter, setFilter] = useState<string>('All');
  const filtered = filter === 'All' ? leads : leads.filter((l) => l.status === filter);
  return (
    <>
      <PageHead title="Lead Management" subtitle="All leads across cities and reps." />
      <Section title="Filter by status">
        <div className="flex flex-wrap gap-2">
          {['All', 'Hot', 'Warm', 'Cold', 'New'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === s ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-white'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th>
                <th>Lead</th>
                <th>Interest</th>
                <th>Budget</th>
                <th>Source</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Value</th>
                <th>Last Activity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td className="font-mono text-xs">{l.id}</td>
                  <td>
                    <div className="font-semibold text-navy">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.phone}</div>
                  </td>
                  <td className="text-xs">{l.interest}</td>
                  <td className="font-mono text-xs">₹{(l.value / 100000).toFixed(1)}L</td>
                  <td>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-navy">{l.source}</span>
                  </td>
                  <td className="text-xs">{l.owner}</td>
                  <td><Badge tone={l.status.toLowerCase() as 'hot' | 'warm' | 'cold' | 'new'}>{l.status}</Badge></td>
                  <td className="font-mono text-xs">₹{(l.value / 100000).toFixed(1)}L</td>
                  <td className="text-xs text-muted-foreground">{l.lastActivity}</td>
                  <td className="text-right">
                    <button onClick={() => toast.success(`Assigning ${l.name}…`)} className="text-xs font-semibold text-accent">Assign →</button>
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

// ─── CRM enrichment lookup ─────────────────────────────────────────────────
const leadMeta: Record<string, { name: string; city: string; value: string }> = {
  'L-1042': { name: 'Rohan Mehta',  city: 'Mumbai',    value: '₹3.25 Cr' },
  'L-1043': { name: 'Aisha Khan',   city: 'Bengaluru', value: '₹4.10 Cr' },
  'L-1044': { name: 'Vikram Singh', city: 'Pune',      value: '₹35K/mo'  },
  'L-1045': { name: 'Neha Reddy',   city: 'Hyderabad', value: '₹1.75L/mo' },
  'L-1046': { name: 'Suresh Iyer',  city: 'Delhi',     value: '₹6.80 Cr' },
  'L-1047': { name: 'Kavya Nair',   city: 'Mumbai',    value: '₹2.85 Cr' },
  'L-1051': { name: 'Amit Verma',   city: 'Pune',      value: '₹42L'     },
  'L-1055': { name: 'Riya Desai',   city: 'Mumbai',    value: '₹1.9 Cr'  },
  'L-1058': { name: 'Dev Kumar',    city: 'Chennai',   value: '₹68L'     },
  'L-1062': { name: 'Meena Pillai', city: 'Delhi',     value: '₹3.5 Cr'  },
  'L-1031': { name: 'Tarun Seth',   city: 'Bengaluru', value: '₹2.1 Cr'  },
  'L-1037': { name: 'Preethi R.',   city: 'Hyderabad', value: '₹1.4 Cr'  },
  'L-1024': { name: 'Harish Nair',  city: 'Mumbai',    value: '₹5.2 Cr'  },
  'L-1019': { name: 'Sonia Kapoor', city: 'Delhi',     value: '₹62L'     },
  'L-1011': { name: 'Raj Malhotra', city: 'Pune',      value: '₹88L'     },
};

const colAccent: Record<string, string> = {
  New: 'border-t-sky-400',
  Contacted: 'border-t-blue-500',
  Qualified: 'border-t-violet-500',
  'Site Visit': 'border-t-amber-500',
  Negotiation: 'border-t-orange-500',
  Closed: 'border-t-emerald-500',
};

function CRMTab() {
  return (
    <>
      <PageHead title="CRM Pipeline" subtitle="Drag-style kanban across the full funnel." />
      <Section title="Pipeline — All Teams" action={<Badge tone="new">Real-time</Badge>}>
        <div className="grid gap-3 md:grid-cols-6">
          {Object.entries(pipeline).map(([col, items]) => (
            <div key={col} className={`rounded-lg bg-secondary/60 p-3 border-t-4 ${colAccent[col] ?? 'border-t-border'}`}>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-navy">{col}</span>
                <span className="rounded-full bg-white px-1.5 text-[10px] font-bold text-mid-blue">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((id) => {
                  const meta = leadMeta[id];
                  return (
                    <button
                      key={id}
                      onClick={() => toast(`Opened lead ${id}`)}
                      className="block w-full rounded-md bg-white p-2.5 text-left text-xs shadow-sm hover:shadow-md"
                    >
                      <div className="font-mono text-[10px] text-muted-foreground">{id}</div>
                      {meta ? (
                        <>
                          <div className="mt-0.5 font-semibold text-navy leading-tight">{meta.name}</div>
                          <div className="mt-0.5 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{meta.city}</span>
                            <span className="font-mono text-[10px] font-bold text-accent">{meta.value}</span>
                          </div>
                        </>
                      ) : (
                        <div className="mt-0.5 font-semibold text-navy">Lead #{id.slice(-2)}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function AlertsTab() {
  const alerts = [
    { id: 'A-501', prop: 'Skyline Residences', trigger: '50 clicks / 24h', action: 'Notified Priya Sharma' },
    { id: 'A-502', prop: 'Marina Heights', trigger: 'Saved by 12 users', action: 'Auto-boosted to homepage' },
    { id: 'A-503', prop: 'Green Acres Villa', trigger: 'Price-drop watcher hit', action: 'Email blast queued' },
  ];
  return (
    <>
      <PageHead title="Click & Behaviour Alerts" subtitle="Trigger-based intelligence on listing engagement." />
      <Section title="Active Alerts">
        {alerts.map((a) => (
          <div key={a.id} className="flex items-start justify-between border-b border-border py-4 last:border-0">
            <div>
              <div className="font-mono text-[10px] text-muted-foreground">{a.id}</div>
              <div className="font-semibold text-navy">{a.prop}</div>
              <div className="text-xs text-muted-foreground">{a.trigger} · {a.action}</div>
            </div>
            <button onClick={() => toast.success(`Acknowledged ${a.id}`)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">
              Acknowledge
            </button>
          </div>
        ))}
      </Section>
    </>
  );
}

type Campaign = {
  id: string;
  name: string;
  budget: string;
  budgetNum: number;
  clicks: number;
  leads: number;
  cpl: string;
  roi: string;
  status: 'Active' | 'Paused';
};

function MarketingTab() {
  const [dateRange] = useState({ from: '2026-05-01', to: '2026-05-31' });
  const campaigns: Campaign[] = [
    { id: 'C-21', name: 'Bandra Premium — Google',   budget: '₹2.4L',  budgetNum: 240000, clicks: 4820, leads: 64, cpl: '₹3,750', roi: '3.2x', status: 'Active'  },
    { id: 'C-22', name: 'Whitefield Villa — Meta',   budget: '₹1.8L',  budgetNum: 180000, clicks: 3210, leads: 41, cpl: '₹4,390', roi: '2.6x', status: 'Active'  },
    { id: 'C-23', name: 'Pune Rentals — WhatsApp',   budget: '₹60K',   budgetNum:  60000, clicks: 1240, leads: 28, cpl: '₹2,140', roi: '4.1x', status: 'Paused'  },
  ];
  const [statuses, setStatuses] = useState<Record<string, 'Active' | 'Paused'>>(
    Object.fromEntries(campaigns.map((c) => [c.id, c.status]))
  );
  const toggleStatus = (id: string) => {
    setStatuses((prev) => {
      const next = prev[id] === 'Active' ? 'Paused' : 'Active';
      toast(next === 'Paused' ? `Pausing ${id}…` : `Resuming ${id}…`);
      return { ...prev, [id]: next };
    });
  };
  return (
    <>
      <PageHead title="Marketing" subtitle="Campaigns, attribution and creative library." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Spend MTD"        value="₹4.8 L"  sub="+12% vs last mo" />
        <StatCard label="Leads Generated"  value="133"      sub="+18 today" />
        <StatCard label="Avg CPL"          value="₹3,621"   sub="-8% vs last mo" />
      </div>

      {/* Date range display */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Date Range</span>
        <div className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-mono text-navy">
          <span>{dateRange.from}</span>
          <span className="text-muted-foreground">→</span>
          <span>{dateRange.to}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">(static preview)</span>
      </div>

      <Section title="Active Campaigns">
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th>
                <th>Name</th>
                <th>Budget</th>
                <th>Clicks</th>
                <th>Leads</th>
                <th>CPL</th>
                <th>ROI</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs">{c.id}</td>
                  <td className="font-semibold text-navy">{c.name}</td>
                  <td className="font-mono text-xs">{c.budget}</td>
                  <td>{c.clicks.toLocaleString()}</td>
                  <td>{c.leads}</td>
                  <td className="font-mono text-xs text-accent">{c.cpl}</td>
                  <td className="font-mono text-xs font-semibold text-emerald-600">{c.roi}</td>
                  <td>
                    <Badge tone={statuses[c.id] === 'Active' ? 'success' : 'cold'}>
                      {statuses[c.id]}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <button onClick={() => toggleStatus(c.id)} className="text-xs font-semibold text-accent">
                      {statuses[c.id] === 'Active' ? 'Pause' : 'Resume'}
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

function DevTab() {
  const builders = Array.from(new Set(properties.map((p) => p.builder))).map((b, i) => ({
    name: b,
    count: properties.filter((p) => p.builder === b).length,
    partnered: i % 2 === 0,
  }));
  return (
    <>
      <PageHead title="Developer Partners" subtitle="Builder accounts, inventory and white-label settings." />
      <Section title="Partnered Builders">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {builders.map((b) => (
            <div key={b.name} className="rounded-lg border border-border p-4">
              <div className="font-display text-lg font-bold text-navy">{b.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{b.count} active listings</div>
              <div className="mt-3">
                <Badge tone={b.partnered ? 'success' : 'new'}>{b.partnered ? 'Partnered' : 'Pending MOU'}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

// ─── Report data for CSV export ───────────────────────────────────────────────
const reportExports: Record<string, { headers: string[]; rows: (string | number)[][] }> = {
  'Weekly Sales Recap': {
    headers: ['Rep', 'City', 'Leads Open', 'Closed MTD', 'Revenue (L)'],
    rows: teamMembers.map((m) => [m.name, m.city, m.leadsOpen, m.closedMTD, (m.closedMTD * 0.62).toFixed(2)]),
  },
  'Lead Source Attribution': {
    headers: ['Lead ID', 'Name', 'Source', 'Status', 'Value (L)'],
    rows: leads.map((l) => [l.id, l.name, l.source, l.status, (l.value / 100000).toFixed(1)]),
  },
  'City Performance Heatmap': {
    headers: ['City', 'Leads', 'Properties', 'Open Pipeline'],
    rows: [
      ['Mumbai',    3, 2, '₹61.75 Cr'],
      ['Bengaluru', 1, 1, '₹41.00 Cr'],
      ['Pune',      1, 1, '₹35K/mo'  ],
      ['Hyderabad', 1, 1, '₹1.75L/mo'],
      ['Delhi',     1, 1, '₹68.00 Cr'],
    ],
  },
  'Rep Productivity': {
    headers: ['Rep', 'Role', 'City', 'Leads Open', 'Closed MTD', 'Target %'],
    rows: teamMembers.map((m) => [m.name, m.role, m.city, m.leadsOpen, m.closedMTD, m.achieved]),
  },
};

function ReportsTab() {
  const reports = [
    { name: 'Weekly Sales Recap',       last: 'Mon 9:00 AM',   schedule: 'Every Monday' },
    { name: 'Lead Source Attribution',  last: '1st of month',  schedule: 'Monthly'      },
    { name: 'City Performance Heatmap', last: 'Yesterday',     schedule: 'Daily'        },
    { name: 'Rep Productivity',         last: 'Mon 9:00 AM',   schedule: 'Weekly'       },
  ];
  return (
    <>
      <PageHead title="Reports" subtitle="Scheduled & on-demand exports." />
      <Section title="Saved Reports">
        {reports.map((r) => {
          const exp = reportExports[r.name];
          return (
            <div key={r.name} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <div>
                <div className="font-semibold text-navy">{r.name}</div>
                <div className="text-xs text-muted-foreground">Last run {r.last} · {r.schedule}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (exp) {
                      downloadCSV(`${r.name.toLowerCase().replace(/\s+/g, '-')}.csv`, exp.headers, exp.rows);
                    } else {
                      toast.success(`${r.name} downloaded`);
                    }
                  }}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => toast.success(`Running ${r.name}…`)}
                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                >
                  Run now
                </button>
              </div>
            </div>
          );
        })}
      </Section>
    </>
  );
}

// ─── Masked bank account helper ───────────────────────────────────────────────
const maskedBank: Record<string, string> = {
  'U-21': 'HDFC ****4821', 'U-22': 'ICICI ****7293', 'U-23': 'SBI ****0065', 'U-24': 'Axis ****3312',
};
const paymentMethod: Record<string, string> = {
  'U-21': 'NEFT', 'U-22': 'IMPS', 'U-23': 'NEFT', 'U-24': 'UPI',
};

function CommissionsTab() {
  const totalEarned = teamMembers.reduce((s, m) => s + m.closedMTD * 0.62, 0);
  const totalPending = teamMembers.reduce((s, m) => s + m.closedMTD * 0.18, 0);
  return (
    <>
      <PageHead title="Commissions" subtitle="Team payouts and ledger." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Payable This Cycle" value="₹6.42 L"   sub="Clears 5th" />
        <StatCard label="On Hold"            value="₹84,000"   sub="Pending KYC"       accent="text-amber-600" />
        <StatCard label="YTD Paid"           value="₹38.2 L"   sub="+₹4.1L vs LY" />
      </div>
      <Section title="By Rep">
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">Rep</th>
                <th>Closed MTD</th>
                <th>Earned</th>
                <th>Pending</th>
                <th>Payment Method</th>
                <th>Bank Account</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((m) => (
                <tr key={m.id}>
                  <td className="font-semibold text-navy">{m.name}</td>
                  <td>{m.closedMTD}</td>
                  <td className="font-mono text-xs">₹{(m.closedMTD * 0.62).toFixed(2)} L</td>
                  <td className="font-mono text-xs text-amber-600">₹{(m.closedMTD * 0.18).toFixed(2)} L</td>
                  <td className="text-xs">{paymentMethod[m.id] ?? 'NEFT'}</td>
                  <td className="font-mono text-xs text-muted-foreground">{maskedBank[m.id] ?? '****0000'}</td>
                  <td className="text-right">
                    <button
                      onClick={() => toast.success(`Released ₹${(m.closedMTD * 0.18).toFixed(2)}L to ${m.name}`)}
                      className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Release
                    </button>
                  </td>
                </tr>
              ))}
              {/* Total summary row */}
              <tr className="border-t-2 border-navy bg-secondary/40 font-bold">
                <td className="font-bold text-navy">Total</td>
                <td>{teamMembers.reduce((s, m) => s + m.closedMTD, 0)}</td>
                <td className="font-mono text-xs font-bold text-navy">₹{totalEarned.toFixed(2)} L</td>
                <td className="font-mono text-xs font-bold text-amber-600">₹{totalPending.toFixed(2)} L</td>
                <td colSpan={3}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (m: Member) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Sales Rep');
  const [city, setCity] = useState('Mumbai');
  const [phone, setPhone] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onInvite({
      id: `U-${Math.floor(Math.random() * 900 + 100)}`,
      name: name.trim(),
      email: email.trim(),
      role,
      city,
      status: 'Invited',
      phone: phone.trim() || '+91 99999 00000',
      joined: 'Jun 2026',
      achieved: 0,
    });
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">Invite to Nestiqo</div>
        <h3 className="font-display text-xl font-bold text-navy">Add a new team member</h3>
        <p className="mt-1 text-xs text-muted-foreground">They'll receive an email invite with a one-time sign-in link.</p>
        <div className="mt-5 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="e.g. Aisha Khan"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Work email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="aisha@nestiqo.in"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="+91 98765 00000"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Admin</option>
                <option>Supervisor</option>
                <option>Sales Rep</option>
                <option>Marketing</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">City</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Mumbai</option>
                <option>Bengaluru</option>
                <option>Pune</option>
                <option>Delhi</option>
                <option>Hyderabad</option>
                <option>Chennai</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-secondary">
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow hover:opacity-95">
            Send invite →
          </button>
        </div>
      </form>
    </div>
  );
}

function SubscriptionsTab() {
  const [unlocks, setUnlocks] = useState(unlockedContacts.map((u) => ({ ...u })));
  const [disputeList, setDisputeList] = useState(disputeData.map((d) => ({ ...d })));

  const totalRevenue = subscriptions.reduce((s, sub) => s + sub.amount, 0);
  const activeCount = subscriptions.filter((s) => s.status === 'Active').length;
  const totalUnlocks = unlocks.length;
  const closedDeals = unlocks.filter((u) => u.closed).length;

  const toggleClosed = (id: string) => {
    setUnlocks((prev) => prev.map((u) => (u.id === id ? { ...u, closed: !u.closed } : u)));
    toast.success('Closure status updated');
  };

  const resolveDispute = (id: string) => {
    setDisputeList((prev) =>
      prev.map((d) => d.id === id ? { ...d, status: 'Resolved' as const, refundIssued: true } : d)
    );
    toast.success(`Dispute ${id} resolved and refund issued`);
  };

  return (
    <>
      <PageHead title="Subscriptions" subtitle="All plan purchases, unlocks, and closure tracking." />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Revenue"      value={`₹${totalRevenue.toLocaleString()}`} sub={`${subscriptions.length} purchases`} />
        <StatCard label="Active Plans"       value={String(activeCount)} sub={`${subscriptions.length - activeCount} exhausted`} />
        <StatCard label="Contacts Unlocked"  value={String(totalUnlocks)} sub="Across all users" />
        <StatCard label="Deals Closed"       value={String(closedDeals)} sub={`${totalUnlocks - closedDeals} in progress`} accent="text-emerald-600" />
      </div>

      <Section title="Plan Purchases">
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>ID</th><th>User</th><th>Contact</th><th>Plan</th>
                <th>Amount</th><th>Credits</th><th>Remaining</th><th>Date</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td className="font-mono text-xs">{sub.id}</td>
                  <td className="font-semibold text-navy">{sub.user}</td>
                  <td>
                    <div className="text-xs text-muted-foreground">{sub.email}</div>
                    <div className="font-mono text-xs">{sub.phone}</div>
                  </td>
                  <td>
                    <Badge tone={sub.plan === 'Premium' ? 'new' : sub.plan === 'Basic' ? 'success' : 'warm'}>
                      {sub.plan}
                    </Badge>
                  </td>
                  <td className="font-mono text-sm font-semibold text-navy">₹{sub.amount}</td>
                  <td className="text-center">{sub.creditsTotal}</td>
                  <td
                    className="text-center font-semibold"
                    style={{ color: sub.creditsLeft === 0 ? 'var(--color-accent)' : 'inherit' }}
                  >
                    {sub.creditsLeft}
                  </td>
                  <td className="text-xs text-muted-foreground">{sub.date}</td>
                  <td>
                    <Badge tone={sub.status === 'Active' ? 'success' : 'cold'}>{sub.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Contact Unlock Records">
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>ID</th><th>User</th><th>Property</th><th>Owner / Phone</th>
                <th>Unlocked At</th><th>Closure</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {unlocks.map((u) => (
                <tr key={u.id}>
                  <td className="font-mono text-xs">{u.id}</td>
                  <td className="font-semibold text-navy">{u.user}</td>
                  <td className="max-w-[180px]">
                    <div className="truncate text-sm font-medium text-navy">{u.property}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{u.subId}</div>
                  </td>
                  <td>
                    <div className="text-xs font-semibold text-navy">{u.owner}</div>
                    <div className="font-mono text-xs text-muted-foreground">{u.phone}</div>
                  </td>
                  <td className="font-mono text-xs text-muted-foreground">{u.unlockedAt}</td>
                  <td>
                    <Badge tone={u.closed ? 'success' : 'warm'}>{u.closed ? 'Closed' : 'In Progress'}</Badge>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleClosed(u.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                    >
                      {u.closed
                        ? <><XCircle size={12} /> Reopen</>
                        : <><CheckCircle size={12} /> Mark closed</>
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Dispute Log"
        action={
          <Badge tone="hot">
            {disputeList.filter((d) => d.status === 'Pending').length} pending
          </Badge>
        }
      >
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>ID</th><th>User</th><th>Property</th><th>Reason</th>
                <th>Date</th><th>Status</th><th>Refund</th><th></th>
              </tr>
            </thead>
            <tbody>
              {disputeList.map((d) => (
                <tr key={d.id}>
                  <td className="font-mono text-xs">{d.id}</td>
                  <td className="font-semibold text-navy">{d.user}</td>
                  <td className="max-w-[180px]">
                    <div className="truncate text-sm font-medium text-navy">{d.property}</div>
                  </td>
                  <td className="max-w-[200px] text-xs text-muted-foreground">{d.reason}</td>
                  <td className="font-mono text-xs text-muted-foreground">{d.date}</td>
                  <td>
                    <Badge tone={d.status === 'Resolved' ? 'success' : 'hot'}>{d.status}</Badge>
                  </td>
                  <td>
                    <Badge tone={d.refundIssued ? 'success' : 'warm'}>{d.refundIssued ? 'Issued' : 'Pending'}</Badge>
                  </td>
                  <td>
                    {d.status === 'Pending' && (
                      <button
                        onClick={() => resolveDispute(d.id)}
                        className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white"
                      >
                        Resolve &amp; Refund
                      </button>
                    )}
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

function ViewsTab() {
  const [filter, setFilter] = useState('');
  const views = [...propertyViews].sort((a, b) => b.ts.localeCompare(a.ts));
  const filtered = filter
    ? views.filter(
        (v) =>
          v.userName.toLowerCase().includes(filter.toLowerCase()) ||
          v.propertyTitle.toLowerCase().includes(filter.toLowerCase()) ||
          v.city.toLowerCase().includes(filter.toLowerCase())
      )
    : views;

  const fmtDur = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);
  const uniqueUsers = new Set(views.map((v) => v.userEmail)).size;
  const unlockCount = views.filter((v) => v.contactUnlocked).length;
  const unlockRate = Math.round((unlockCount / views.length) * 100);

  const viewsPerProp: Record<string, { title: string; count: number }> = {};
  for (const v of views) {
    if (!viewsPerProp[v.propertyId])
      viewsPerProp[v.propertyId] = { title: v.propertyTitle.split('—')[0].trim(), count: 0 };
    viewsPerProp[v.propertyId].count++;
  }
  const topProps = Object.entries(viewsPerProp).sort(([, a], [, b]) => b.count - a.count);

  const handleDownloadCSV = () => {
    downloadCSV(
      'property-views.csv',
      ['ID', 'User', 'Email', 'Property', 'City', 'Viewed At', 'Duration (s)', 'Unlocked', 'Lead ID'],
      views.map((v) => [
        v.id, v.userName, v.userEmail,
        v.propertyTitle.split('—')[0].trim(),
        v.city, v.ts, v.durationSec,
        v.contactUnlocked ? 'Yes' : 'No',
        v.leadId ?? '',
      ])
    );
  };

  return (
    <>
      <PageHead title="Property Views" subtitle="Who checked which property — full view analytics." />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Views"     value={String(views.length)}                        sub="Last 30 days" />
        <StatCard label="Unique Visitors" value={String(uniqueUsers)}                         sub="Registered users" />
        <StatCard label="Unlock Rate"     value={`${unlockRate}%`}                            sub="Views → contact unlocked" accent="text-emerald-600" />
        <StatCard label="Leads Linked"    value={String(views.filter((v) => v.leadId).length)} sub="Views tied to a lead" />
      </div>

      <Section title="Views by Property">
        <div className="space-y-3">
          {topProps.map(([pid, { title, count }]) => {
            const pct = Math.round((count / views.length) * 100);
            return (
              <div key={pid} className="flex items-center gap-3">
                <Link href={`/properties/${pid}`} className="w-52 shrink-0 truncate text-xs font-semibold text-navy hover:text-accent">
                  {title}
                </Link>
                <div className="flex-1 overflow-hidden rounded-full bg-secondary h-3">
                  <div className="h-3 rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-xs font-bold text-navy">{count}</span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="All View Records"
        action={
          <div className="flex items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search user or property…"
              className="rounded-md border border-border bg-white px-3 py-1.5 text-xs outline-none focus:border-accent"
            />
            <button
              onClick={handleDownloadCSV}
              className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-accent"
            >
              Download CSV
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>User</th><th>Property</th><th>City</th>
                <th>Viewed At</th><th>Duration</th><th>Unlocked</th><th>Lead</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="font-semibold text-navy">{v.userName}</div>
                    <div className="text-[10px] text-muted-foreground">{v.userEmail}</div>
                  </td>
                  <td className="max-w-[200px]">
                    <Link href={`/properties/${v.propertyId}`} className="block truncate text-sm font-medium text-navy hover:text-accent">
                      {v.propertyTitle.split('—')[0].trim()}
                    </Link>
                  </td>
                  <td className="text-xs text-muted-foreground">{v.city}</td>
                  <td className="font-mono text-xs text-muted-foreground">{v.ts}</td>
                  <td className="font-mono text-xs">{fmtDur(v.durationSec)}</td>
                  <td>
                    <Badge tone={v.contactUnlocked ? 'success' : 'cold'}>
                      {v.contactUnlocked ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="font-mono text-xs text-muted-foreground">{v.leadId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
