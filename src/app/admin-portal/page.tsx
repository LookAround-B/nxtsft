'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  LayoutDashboard, Users, Building2, Target, Kanban,
  BellRing, Megaphone, Building, BarChart2, Wallet, ReceiptText,
  CheckCircle, XCircle,
} from 'lucide-react';
import { PortalShell, StatCard, Section, Badge } from '@/components/portal/PortalShell';
import { useActiveHash } from '@/lib/use-active-hash';
import { leads, teamMembers, properties, pipeline, activities, subscriptions, unlockedContacts, disputes as disputeData } from '@/data/static';

const nav = [
  { label: 'Operations',      to: '/admin-portal',               icon: <LayoutDashboard size={14} /> },
  { label: 'Team Management', to: '/admin-portal#team',          icon: <Users size={14} /> },
  { label: 'Listings',        to: '/admin-portal#listings',      icon: <Building2 size={14} /> },
  { label: 'Lead Management', to: '/admin-portal#leads',         icon: <Target size={14} /> },
  { label: 'CRM Pipeline',    to: '/admin-portal#crm',           icon: <Kanban size={14} /> },
  { label: 'Subscriptions',   to: '/admin-portal#subscriptions', icon: <ReceiptText size={14} /> },
  { label: 'Click Alerts',    to: '/admin-portal#alerts',        icon: <BellRing size={14} /> },
  { label: 'Marketing',       to: '/admin-portal#marketing',     icon: <Megaphone size={14} /> },
  { label: 'Developers',      to: '/admin-portal#dev',           icon: <Building size={14} /> },
  { label: 'Reports',         to: '/admin-portal#reports',       icon: <BarChart2 size={14} /> },
  { label: 'Commissions',     to: '/admin-portal#commissions',   icon: <Wallet size={14} /> },
];

type Member = { id: string; name: string; email: string; role: string; city: string; status: 'Active' | 'Invited' };

const seedRoster: Member[] = teamMembers.map((m) => ({
  id: m.id, name: m.name, email: `${m.name.split(' ')[0].toLowerCase()}@nestit.in`, role: m.role, city: m.city, status: 'Active',
}));

export default function AdminPortal() {
  const hash = useActiveHash();
  return (
    <PortalShell brand="NestIt Control" role="Admin" accent="red" user={{ name: 'Meera Iyer', initials: 'MI' }} nav={nav} basePath="/admin-portal">
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

function OperationsTab() {
  return (
    <>
      <PageHead title="Operations Overview" subtitle="Pulse of all NestIt ops — refreshed every 30 seconds." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Pipeline Value" value="₹84.2 Cr" sub="+9.1% wk" />
        <StatCard label="Open Leads" value="412" sub="+18 today" />
        <StatCard label="Pending Approvals" value="27" sub="6 urgent" accent="text-amber-600" />
        <StatCard label="Click Alerts (24h)" value="14" sub="3 thresholds hit" accent="text-accent" />
      </div>
      <Section title="Live Activity Stream">
        {activities.map((a, i) => (
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

function TeamTab() {
  const [roster, setRoster] = useState<Member[]>(seedRoster);
  const [showInvite, setShowInvite] = useState(false);
  return (
    <>
      <PageHead title="Team Management" subtitle={`${roster.length} members across 4 cities`} />
      <Section title="Active Roster" action={<button onClick={() => setShowInvite(true)} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">+ Invite Member</button>}>
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr><th className="py-2">ID</th><th>Name</th><th>Email</th><th>Role</th><th>City</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {roster.map((m) => (
                <tr key={m.id}>
                  <td className="font-mono text-xs">{m.id}</td>
                  <td className="font-semibold text-navy">{m.name}</td>
                  <td className="text-xs text-muted-foreground">{m.email}</td>
                  <td className="text-xs">{m.role}</td>
                  <td className="text-xs">{m.city}</td>
                  <td><Badge tone={m.status === 'Active' ? 'success' : 'new'}>{m.status}</Badge></td>
                  <td className="text-right">
                    <button onClick={() => { setRoster((r) => r.filter((x) => x.id !== m.id)); toast.success(`${m.name} removed from team`); }} className="text-xs font-semibold text-accent">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvite={(m) => { setRoster((r) => [m, ...r]); setShowInvite(false); toast.success(`Invite sent to ${m.email}`); }} />}
    </>
  );
}

function ListingsTab() {
  const [items, setItems] = useState(properties.map((p) => ({ id: p.id, title: p.title, image: p.image, builder: p.builder, status: 'Pending' as 'Pending' | 'Approved' | 'Rejected' })));
  const counts = { pending: items.filter((i) => i.status === 'Pending').length, approved: items.filter((i) => i.status === 'Approved').length, rejected: items.filter((i) => i.status === 'Rejected').length };
  return (
    <>
      <PageHead title="Listings Approvals" subtitle="Moderate property submissions before they go live." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending" value={String(counts.pending)} sub="Awaiting review" accent="text-amber-600" />
        <StatCard label="Approved" value={String(counts.approved)} sub="Live on site" />
        <StatCard label="Rejected" value={String(counts.rejected)} sub="Needs re-submission" accent="text-accent" />
      </div>
      <Section title="All Submissions">
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <div key={it.id} className="flex gap-3 rounded-lg border border-border p-3">
              <img src={it.image} alt="" className="h-20 w-28 rounded-lg object-cover" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-navy">{it.title}</div>
                <div className="text-xs text-muted-foreground">{it.builder}</div>
                <div className="mt-2"><Badge tone={it.status === 'Approved' ? 'success' : it.status === 'Rejected' ? 'hot' : 'warm'}>{it.status}</Badge></div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => { setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, status: 'Approved' } : x)); toast.success(`Approved ${it.title}`); }} className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">Approve</button>
                  <button onClick={() => { setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, status: 'Rejected' } : x)); toast.error(`Rejected ${it.title}`); }} className="rounded-md border border-border px-3 py-1 text-xs font-semibold">Reject</button>
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
            <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === s ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-white'}`}>{s}</button>
          ))}
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr><th className="py-2">ID</th><th>Lead</th><th>Interest</th><th>Owner</th><th>Status</th><th>Value</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td className="font-mono text-xs">{l.id}</td>
                  <td><div className="font-semibold text-navy">{l.name}</div><div className="text-xs text-muted-foreground">{l.phone}</div></td>
                  <td className="text-xs">{l.interest}</td>
                  <td className="text-xs">{l.owner}</td>
                  <td><Badge tone={l.status.toLowerCase() as 'hot' | 'warm' | 'cold' | 'new'}>{l.status}</Badge></td>
                  <td className="font-mono text-xs">₹{(l.value / 100000).toFixed(1)}L</td>
                  <td className="text-right"><button onClick={() => toast.success(`Assigning ${l.name}…`)} className="text-xs font-semibold text-accent">Assign →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

function CRMTab() {
  return (
    <>
      <PageHead title="CRM Pipeline" subtitle="Drag-style kanban across the full funnel." />
      <Section title="Pipeline — All Teams" action={<Badge tone="new">Real-time</Badge>}>
        <div className="grid gap-3 md:grid-cols-6">
          {Object.entries(pipeline).map(([col, items]) => (
            <div key={col} className="rounded-lg bg-secondary/60 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-navy">{col}</span>
                <span className="rounded-full bg-white px-1.5 text-[10px] font-bold text-mid-blue">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((id) => (
                  <button key={id} onClick={() => toast(`Opened lead ${id}`)} className="block w-full rounded-md bg-white p-2.5 text-left text-xs shadow-sm hover:shadow-md">
                    <div className="font-mono text-[10px] text-muted-foreground">{id}</div>
                    <div className="mt-0.5 font-semibold text-navy">Lead #{id.slice(-2)}</div>
                  </button>
                ))}
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
            <button onClick={() => toast.success(`Acknowledged ${a.id}`)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">Acknowledge</button>
          </div>
        ))}
      </Section>
    </>
  );
}

function MarketingTab() {
  const campaigns = [
    { id: 'C-21', name: 'Bandra Premium — Google', budget: '₹2.4L', clicks: 4820, leads: 64, cpl: '₹3,750' },
    { id: 'C-22', name: 'Whitefield Villa — Meta', budget: '₹1.8L', clicks: 3210, leads: 41, cpl: '₹4,390' },
    { id: 'C-23', name: 'Pune Rentals — WhatsApp', budget: '₹60K', clicks: 1240, leads: 28, cpl: '₹2,140' },
  ];
  return (
    <>
      <PageHead title="Marketing" subtitle="Campaigns, attribution and creative library." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Spend MTD" value="₹4.8 L" sub="+12% vs last mo" />
        <StatCard label="Leads Generated" value="133" sub="+18 today" />
        <StatCard label="Avg CPL" value="₹3,621" sub="-8% vs last mo" />
      </div>
      <Section title="Active Campaigns">
        <div className="overflow-x-auto"><table className="portal-table">
          <thead><tr><th className="py-2">ID</th><th>Name</th><th>Budget</th><th>Clicks</th><th>Leads</th><th>CPL</th><th></th></tr></thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td className="font-mono text-xs">{c.id}</td>
                <td className="font-semibold text-navy">{c.name}</td>
                <td className="font-mono text-xs">{c.budget}</td>
                <td>{c.clicks.toLocaleString()}</td>
                <td>{c.leads}</td>
                <td className="font-mono text-xs text-accent">{c.cpl}</td>
                <td className="text-right"><button onClick={() => toast(`Pausing ${c.name}…`)} className="text-xs font-semibold text-accent">Pause</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Section>
    </>
  );
}

function DevTab() {
  const builders = Array.from(new Set(properties.map((p) => p.builder))).map((b, i) => ({ name: b, count: properties.filter((p) => p.builder === b).length, partnered: i % 2 === 0 }));
  return (
    <>
      <PageHead title="Developer Partners" subtitle="Builder accounts, inventory and white-label settings." />
      <Section title="Partnered Builders">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {builders.map((b) => (
            <div key={b.name} className="rounded-lg border border-border p-4">
              <div className="font-display text-lg font-bold text-navy">{b.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{b.count} active listings</div>
              <div className="mt-3"><Badge tone={b.partnered ? 'success' : 'new'}>{b.partnered ? 'Partnered' : 'Pending MOU'}</Badge></div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function ReportsTab() {
  const reports = [
    { name: 'Weekly Sales Recap', last: 'Mon 9:00 AM', schedule: 'Every Monday' },
    { name: 'Lead Source Attribution', last: '1st of month', schedule: 'Monthly' },
    { name: 'City Performance Heatmap', last: 'Yesterday', schedule: 'Daily' },
    { name: 'Rep Productivity', last: 'Mon 9:00 AM', schedule: 'Weekly' },
  ];
  return (
    <>
      <PageHead title="Reports" subtitle="Scheduled & on-demand exports." />
      <Section title="Saved Reports">
        {reports.map((r) => (
          <div key={r.name} className="flex items-center justify-between border-b border-border py-3 last:border-0">
            <div>
              <div className="font-semibold text-navy">{r.name}</div>
              <div className="text-xs text-muted-foreground">Last run {r.last} · {r.schedule}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toast.success(`${r.name} downloaded`)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">Download CSV</button>
              <button onClick={() => toast.success(`Running ${r.name}…`)} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">Run now</button>
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}

function CommissionsTab() {
  return (
    <>
      <PageHead title="Commissions" subtitle="Team payouts and ledger." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Payable This Cycle" value="₹6.42 L" sub="Clears 5th" />
        <StatCard label="On Hold" value="₹84,000" sub="Pending KYC" accent="text-amber-600" />
        <StatCard label="YTD Paid" value="₹38.2 L" sub="+₹4.1L vs LY" />
      </div>
      <Section title="By Rep">
        <div className="overflow-x-auto"><table className="portal-table">
          <thead><tr><th className="py-2">Rep</th><th>Closed MTD</th><th>Earned</th><th>Pending</th><th></th></tr></thead>
          <tbody>
            {teamMembers.map((m) => (
              <tr key={m.id}>
                <td className="font-semibold text-navy">{m.name}</td>
                <td>{m.closedMTD}</td>
                <td className="font-mono text-xs">₹{(m.closedMTD * 0.62).toFixed(2)} L</td>
                <td className="font-mono text-xs text-amber-600">₹{(m.closedMTD * 0.18).toFixed(2)} L</td>
                <td className="text-right"><button onClick={() => toast.success(`Released ₹${(m.closedMTD * 0.18).toFixed(2)}L to ${m.name}`)} className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">Release</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Section>
    </>
  );
}

function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (m: Member) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Sales Rep');
  const [city, setCity] = useState('Mumbai');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onInvite({ id: `U-${Math.floor(Math.random() * 900 + 100)}`, name: name.trim(), email: email.trim(), role, city, status: 'Invited' });
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">Invite to NestIt</div>
        <h3 className="font-display text-xl font-bold text-navy">Add a new team member</h3>
        <p className="mt-1 text-xs text-muted-foreground">They'll receive an email invite with a one-time sign-in link.</p>
        <div className="mt-5 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="e.g. Aisha Khan" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Work email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="aisha@nestit.in" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Admin</option><option>Supervisor</option><option>Sales Rep</option><option>Marketing</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">City</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Mumbai</option><option>Bengaluru</option><option>Pune</option><option>Delhi</option><option>Hyderabad</option><option>Chennai</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-secondary">Cancel</button>
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow hover:opacity-95">Send invite →</button>
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
    setDisputeList((prev) => prev.map((d) => d.id === id ? { ...d, status: 'Resolved' as const, refundIssued: true } : d));
    toast.success(`Dispute ${id} resolved and refund issued`);
  };

  return (
    <>
      <PageHead title="Subscriptions" subtitle="All plan purchases, unlocks, and closure tracking." />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} sub={`${subscriptions.length} purchases`} />
        <StatCard label="Active Plans" value={String(activeCount)} sub={`${subscriptions.length - activeCount} exhausted`} />
        <StatCard label="Contacts Unlocked" value={String(totalUnlocks)} sub="Across all users" />
        <StatCard label="Deals Closed" value={String(closedDeals)} sub={`${totalUnlocks - closedDeals} in progress`} accent="text-emerald-600" />
      </div>

      {/* Subscription purchases */}
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
                  <td className="text-center font-semibold" style={{ color: sub.creditsLeft === 0 ? 'var(--color-accent)' : 'inherit' }}>
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

      {/* Unlock records */}
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

      {/* Dispute log */}
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
