'use client';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  LayoutDashboard, Users, Settings2, BarChart3, ClipboardList,
  Cpu, Bell, FileText, Shield, CreditCard, Users2, PackageOpen,
  Plus, Pencil, Trash2, Check, X as XIcon,
} from 'lucide-react';
import { PortalShell, StatCard, Section, Badge } from '@/components/portal/PortalShell';
import { useActiveHash } from '@/lib/use-active-hash';
import { kpis, leads, activities, properties, teamMembers, propertyViews, seekerPlans, ownerRentalPlans, ownerSellPlans } from '@/data/static';

/* ─── CSV download helper ─────────────────────────────────── */
const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: filename,
  });
  a.click();
};

/* ─── Nav ─────────────────────────────────────────────────── */
const nav = [
  { label: 'Command Dashboard', to: '/sa-portal',              icon: <LayoutDashboard size={14} /> },
  { label: 'User Management',   to: '/sa-portal#users',        icon: <Users size={14} /> },
  { label: 'All Teams',         to: '/sa-portal#teams',        icon: <Users2 size={14} /> },
  { label: 'Platform Config',   to: '/sa-portal#config',       icon: <Settings2 size={14} /> },
  { label: 'Global Analytics',  to: '/sa-portal#analytics',    icon: <BarChart3 size={14} /> },
  { label: 'Audit Trail',       to: '/sa-portal#audit',        icon: <ClipboardList size={14} /> },
  { label: 'AI Model Control',  to: '/sa-portal#ai',           icon: <Cpu size={14} /> },
  { label: 'Notifications',     to: '/sa-portal#notify',       icon: <Bell size={14} /> },
  { label: 'Content CMS',       to: '/sa-portal#cms',          icon: <FileText size={14} /> },
  { label: 'Security Console',  to: '/sa-portal#sec',          icon: <Shield size={14} /> },
  { label: 'Billing & Revenue', to: '/sa-portal#bill',         icon: <CreditCard size={14} /> },
  { label: 'Role Permissions',  to: '/sa-portal#permissions',  icon: <Shield size={14} /> },
  { label: 'Plans Manager',     to: '/sa-portal#plans',        icon: <PackageOpen size={14} /> },
  { label: 'Reports',           to: '/sa-portal#reports',      icon: <FileText size={14} /> },
];

/* ─── Root page ───────────────────────────────────────────── */
export default function SAPortal() {
  const hash = useActiveHash();
  return (
    <PortalShell brand="NxtSft.com Command" role="Super Admin" accent="gold" user={{ name: 'Aarav Khanna', initials: 'AK' }} nav={nav} basePath="/sa-portal">
      {renderTab(hash)}
    </PortalShell>
  );
}

function renderTab(hash: string) {
  switch (hash) {
    case 'users':       return <UsersTab />;
    case 'teams':       return <TeamsTab />;
    case 'config':      return <ConfigTab />;
    case 'analytics':   return <AnalyticsTab />;
    case 'audit':       return <AuditTab />;
    case 'ai':          return <AITab />;
    case 'notify':      return <NotifyTab />;
    case 'cms':         return <CMSTab />;
    case 'sec':         return <SecurityTab />;
    case 'bill':        return <BillingTab />;
    case 'permissions': return <PermissionsTab />;
    case 'plans':       return <PlansManagerTab />;
    case 'reports':     return <ReportsTab />;
    default:            return <Dashboard />;
  }
}

/* ─── Shared primitives ───────────────────────────────────── */
function TabHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-bold text-navy">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle?: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-block h-6 w-11 rounded-full transition focus:outline-none ${on ? 'bg-accent' : 'bg-secondary'}`}
      type="button"
      aria-pressed={on}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-5' : 'left-0.5'}`} />
    </button>
  );
}

/* ─── allUsers — used by UsersTab, TeamsTab, Reports ──────── */
const allUsers: Array<{
  id: string; name: string; email: string; role: string; portal: string;
  city: string; status: 'Active' | 'Invited' | 'Suspended'; last: string;
}> = [
  ...teamMembers.map((m) => ({
    id: m.id, name: m.name,
    email: `${m.name.toLowerCase().replace(/\s+/, '.')}@nxtsft.com`,
    role: m.role, portal: 'Sales Portal', city: m.city,
    status: 'Active' as const, last: '2h ago',
  })),
  { id: 'U-25', name: 'Aarav Khanna',    email: 'aarav.khanna@nxtsft.com',    role: 'Super Admin', portal: 'Command',      city: 'Mumbai',    status: 'Active',    last: 'now' },
  { id: 'U-26', name: 'Meera Iyer',      email: 'meera.iyer@nxtsft.com',      role: 'Admin',       portal: 'Admin Portal', city: 'Bengaluru', status: 'Active',    last: '12m ago' },
  { id: 'U-27', name: 'Rohit Nair',      email: 'rohit.nair@nxtsft.com',      role: 'Supervisor',  portal: 'Supervisor',   city: 'Hyderabad', status: 'Suspended', last: '4d ago' },
  { id: 'U-28', name: 'Sneha Pillai',    email: 'sneha.pillai@nxtsft.com',    role: 'Sales Rep',   portal: 'Sales Portal', city: 'Chennai',   status: 'Invited',   last: '—' },
  { id: 'U-29', name: 'Rahul Verma',     email: 'rahul.verma@nxtsft.com',     role: 'Admin',       portal: 'Admin Portal', city: 'Delhi',     status: 'Active',    last: '1h ago' },
  { id: 'U-30', name: 'Pooja Desai',     email: 'pooja.desai@nxtsft.com',     role: 'Sales Rep',   portal: 'Sales Portal', city: 'Pune',      status: 'Active',    last: '3h ago' },
  { id: 'U-31', name: 'Arjun Shah',      email: 'arjun.shah@nxtsft.com',      role: 'Supervisor',  portal: 'Supervisor',   city: 'Mumbai',    status: 'Active',    last: '45m ago' },
  { id: 'U-32', name: 'Nisha Kapoor',    email: 'nisha.kapoor@nxtsft.com',    role: 'Sales Rep',   portal: 'Sales Portal', city: 'Bengaluru', status: 'Active',    last: '6h ago' },
  { id: 'U-33', name: 'Vivek Malhotra',  email: 'vivek.malhotra@nxtsft.com',  role: 'Sales Rep',   portal: 'Sales Portal', city: 'Hyderabad', status: 'Invited',   last: '—' },
  { id: 'U-34', name: 'Preeti Singh',    email: 'preeti.singh@nxtsft.com',    role: 'Admin',       portal: 'Admin Portal', city: 'Chennai',   status: 'Active',    last: '2d ago' },
  { id: 'U-35', name: 'Manish Tiwari',   email: 'manish.tiwari@nxtsft.com',   role: 'Supervisor',  portal: 'Supervisor',   city: 'Pune',      status: 'Suspended', last: '1w ago' },
];

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════ */
function Dashboard() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Listings" value={kpis.totalListings.toLocaleString()} sub="↑ +8.2% wk" />
        <StatCard label="Active Leads"   value={kpis.activeLeads.toLocaleString()}   sub="↑ +12.4% wk" />
        <StatCard label="Revenue YTD"    value={`₹${kpis.revenueCr}Cr`}              sub="↑ +24% YoY" />
        <StatCard label="DAU"            value={kpis.dau.toLocaleString()}            sub="↑ +3.1%" />
        <StatCard label="MAU"            value={`${(kpis.mau / 1000).toFixed(0)}K`}  sub="↑ +9.6%" />
        <StatCard label="Conv. Rate"     value={`${kpis.conversion}%`}               sub="↑ +0.4 pts" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Revenue & Lead Funnel — Last 12 weeks" action={<Badge tone="success">Live</Badge>}>
            <div className="flex h-64 items-end gap-1.5">
              {Array.from({ length: 12 }).map((_, i) => {
                const hPx = 40 + ((i * 37) % 130);
                const h2Px = 20 + ((i * 53) % 90);
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-col-reverse gap-0.5">
                      <div className="w-full rounded-sm bg-gold" style={{ height: `${h2Px}px` }} />
                      <div className="w-full rounded-sm bg-accent" style={{ height: `${hPx}px` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">W{i + 1}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-accent" /> Revenue</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-gold" /> Qualified Leads</span>
            </div>
          </Section>
        </div>
        <Section title="System Health">
          {[['API p50', '84ms', 'ok'], ['DB Replication', '1.2s lag', 'ok'], ['AI Model Drift', '0.4%', 'ok'], ['Failed Logins (24h)', '12', 'warn']].map(([l, v, s]) => (
            <div key={l} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <span className="text-sm">{l}</span>
              <span className={`font-mono text-sm font-bold ${s === 'warn' ? 'text-amber-600' : 'text-emerald-600'}`}>{v}</span>
            </div>
          ))}
        </Section>
      </div>

      <Section
        title="Recent Property Views"
        action={
          <div className="flex items-center gap-2">
            <Badge tone="success">{propertyViews.length} views</Badge>
            <button
              onClick={() => downloadCSV('property-views.csv', ['ID','User','Email','Property','City','Duration','Unlocked'], propertyViews.map((v) => [v.id, v.userName, v.userEmail, v.propertyTitle, v.city, v.durationSec, v.contactUnlocked ? 'Yes' : 'No']))}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Export CSV →
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr><th>User</th><th>Property</th><th>City</th><th>Viewed At</th><th>Duration</th><th>Unlocked</th></tr>
            </thead>
            <tbody>
              {[...propertyViews].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 8).map((v) => (
                <tr key={v.id}>
                  <td className="font-semibold text-navy">{v.userName}</td>
                  <td className="max-w-[180px] truncate text-sm text-navy">{v.propertyTitle.split('—')[0].trim()}</td>
                  <td className="text-xs text-muted-foreground">{v.city}</td>
                  <td className="font-mono text-xs text-muted-foreground">{v.ts}</td>
                  <td className="font-mono text-xs">{v.durationSec < 60 ? `${v.durationSec}s` : `${Math.floor(v.durationSec / 60)}m ${v.durationSec % 60}s`}</td>
                  <td><Badge tone={v.contactUnlocked ? 'success' : 'cold'}>{v.contactUnlocked ? 'Yes' : 'No'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Recent Audit Trail"
        action={
          <button
            onClick={() => toast.success('Audit PDF generated and downloading…')}
            className="text-xs font-semibold text-accent hover:underline"
          >
            Export PDF →
          </button>
        }
      >
        <table className="portal-table">
          <thead>
            <tr><th className="py-2">Time</th><th>User</th><th>Action</th><th>Outcome</th></tr>
          </thead>
          <tbody>
            {activities.map((a, i) => (
              <tr key={i}>
                <td className="font-mono text-xs">{a.ts}</td>
                <td className="font-semibold text-navy">{a.user}</td>
                <td>{a.action}</td>
                <td className="text-muted-foreground">{a.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Top Performing Listings">
          {properties.slice(0, 4).map((p) => (
            <div key={p.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
              <img src={p.image} alt="" className="h-12 w-16 rounded object-cover" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-navy">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.locality} · {p.priceLabel}</div>
              </div>
              <Badge tone="hot">{p.matchScore}%</Badge>
            </div>
          ))}
        </Section>
        <Section title="Latest Leads">
          {leads.slice(0, 4).map((l) => (
            <div key={l.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <div>
                <div className="text-sm font-semibold text-navy">{l.name}</div>
                <div className="text-xs text-muted-foreground">{l.interest} · {l.city}</div>
              </div>
              <Badge tone={l.status.toLowerCase() as 'hot' | 'warm' | 'cold' | 'new'}>{l.status}</Badge>
            </div>
          ))}
        </Section>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   USER MANAGEMENT TAB
═══════════════════════════════════════════════════════════ */
function UsersTab() {
  const [showInvite, setShowInvite] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggleCheck = (id: string) =>
    setChecked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setChecked(checked.size === allUsers.length ? new Set() : new Set(allUsers.map((u) => u.id)));

  return (
    <>
      <TabHeader
        title="User Management"
        subtitle="Roles, permissions and lifecycle for the whole platform."
        action={
          <div className="flex items-center gap-2">
            {checked.size > 0 && (
              <button
                onClick={() => { toast.success(`${checked.size} users actioned`); setChecked(new Set()); }}
                className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition"
              >
                Bulk Action ({checked.size})
              </button>
            )}
            <button
              onClick={() => downloadCSV('users.csv', ['ID','Name','Email','Role','City','Status'], allUsers.map((u) => [u.id, u.name, u.email, u.role, u.city, u.status]))}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Export CSV →
            </button>
            <button onClick={() => setShowInvite(true)} className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition">
              + Invite User
            </button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Users"  value="184"  sub="↑ +6 this wk" />
        <StatCard label="Admins"       value="12"   />
        <StatCard label="Sales Reps"   value="64"   sub="↑ +2 this wk" />
        <StatCard label="Suspended"    value="3"    accent="text-amber-600" />
      </div>
      <Section title="Directory">
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="w-8">
                  <input type="checkbox" checked={checked.size === allUsers.length} onChange={toggleAll} className="rounded" />
                </th>
                <th className="py-2">ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>City</th>
                <th>Last Login</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <input type="checkbox" checked={checked.has(u.id)} onChange={() => toggleCheck(u.id)} className="rounded" />
                  </td>
                  <td className="font-mono text-xs">{u.id}</td>
                  <td className="font-semibold text-navy">{u.name}</td>
                  <td className="text-xs text-muted-foreground">{u.email}</td>
                  <td className="text-xs">{u.role}</td>
                  <td className="text-xs">{u.city}</td>
                  <td className="text-xs text-muted-foreground">{u.last}</td>
                  <td><Badge tone={u.status === 'Active' ? 'success' : u.status === 'Suspended' ? 'warm' : 'new'}>{u.status}</Badge></td>
                  <td className="text-right">
                    <button onClick={() => toast(`Managing ${u.name} (${u.role})…`)} className="text-xs font-semibold text-accent hover:underline">
                      Manage →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {showInvite && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setShowInvite(false)}>
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">NxtSft.com Platform</div>
            <h3 className="font-display text-xl font-bold text-navy">Invite a user</h3>
            <p className="mt-1 text-xs text-muted-foreground">They'll receive an email with a one-time sign-in link.</p>
            <div className="mt-5 space-y-3">
              <input placeholder="Full name" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
              <input type="email" placeholder="Work email" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
              <select className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
                <option>Admin</option><option>Supervisor</option><option>Sales Rep</option>
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowInvite(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-navy hover:bg-secondary">Cancel</button>
              <button onClick={() => { setShowInvite(false); toast.success('Invite sent successfully!'); }} className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-navy-deep hover:opacity-90">Send invite →</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ALL TEAMS TAB
═══════════════════════════════════════════════════════════ */
function TeamsTab() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = allUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase()),
  );

  const total     = allUsers.length;
  const active    = allUsers.filter((u) => u.status === 'Active').length;
  const invited   = allUsers.filter((u) => u.status === 'Invited').length;
  const suspended = allUsers.filter((u) => u.status === 'Suspended').length;

  return (
    <>
      <TabHeader
        title="All Teams"
        subtitle="Comprehensive staff directory across all portals."
        action={
          <button onClick={() => setShowAdd(true)} className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition">
            + Add Member
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Staff"  value={String(total)}     sub="across all portals" />
        <StatCard label="Active"       value={String(active)}    sub="↑ currently online" />
        <StatCard label="Invited"      value={String(invited)}   sub="pending acceptance" />
        <StatCard label="Suspended"    value={String(suspended)} accent="text-amber-600" />
      </div>

      <Section
        title="Staff Directory"
        action={
          <div className="flex items-center gap-3">
            <input
              placeholder="Search name or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              onClick={() => downloadCSV('team-directory.csv', ['ID','Name','Email','Role','Portal','City','Last Active','Status'], allUsers.map((u) => [u.id, u.name, u.email, u.role, u.portal, u.city, u.last, u.status]))}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Export CSV →
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Portal</th>
                <th>City</th>
                <th>Last Active</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="font-mono text-xs">{u.id}</td>
                  <td className="font-semibold text-navy">{u.name}</td>
                  <td className="text-xs text-muted-foreground">{u.email}</td>
                  <td className="text-xs">{u.role}</td>
                  <td className="text-xs text-muted-foreground">{u.portal}</td>
                  <td className="text-xs">{u.city}</td>
                  <td className="text-xs text-muted-foreground">{u.last}</td>
                  <td><Badge tone={u.status === 'Active' ? 'success' : u.status === 'Suspended' ? 'warm' : 'new'}>{u.status}</Badge></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toast(`Editing ${u.name}…`)} className="text-xs font-semibold text-accent hover:underline">Edit</button>
                      <button onClick={() => toast.success(`${u.name} suspended`)} className="text-xs font-semibold text-amber-600 hover:underline">Suspend</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {showAdd && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setShowAdd(false)}>
          <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">NxtSft.com Command</div>
            <h3 className="font-display text-xl font-bold text-navy">Add Team Member</h3>
            <p className="mt-1 text-xs text-muted-foreground">Assign portal access and role for the new member.</p>
            <div className="mt-5 space-y-3">
              <input placeholder="Full name" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
              <input type="email" placeholder="Work email" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
              <select className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
                <option>Sales Rep</option><option>Supervisor</option><option>Admin</option>
              </select>
              <select className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
                <option>Sales Portal</option><option>Supervisor Portal</option><option>Admin Portal</option>
              </select>
              <input placeholder="City" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-navy hover:bg-secondary">Cancel</button>
              <button onClick={() => { setShowAdd(false); toast.success('Member added and invite sent!'); }} className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-navy-deep hover:opacity-90">Add Member →</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   PLATFORM CONFIG TAB
═══════════════════════════════════════════════════════════ */
function ConfigTab() {
  const flags: Array<[string, boolean, string]> = [
    ['AI Property Match v3', true, 'Production'],
    ['WhatsApp Lead Capture', true, 'Production'],
    ['Bulk Listing Import', false, 'Beta'],
    ['Mortgage Calculator v2', true, 'Production'],
    ['Builder Co-marketing', false, 'Internal'],
    ['End-user Chat Widget', true, 'Production'],
  ];
  const integrations: Array<[string, string]> = [
    ['Twilio SMS', 'Connected'], ['SendGrid Email', 'Connected'], ['Razorpay Payments', 'Connected'],
    ['Google Maps', 'Connected'], ['MagicBricks Sync', 'Disconnected'], ['99acres Sync', 'Connected'],
  ];
  return (
    <>
      <TabHeader title="Platform Configuration" subtitle="Feature flags, regions, and integration toggles." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Feature Flags">
          {flags.map(([name, on, env]) => (
            <div key={name} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <div>
                <div className="text-sm font-semibold text-navy">{name}</div>
                <div className="text-xs text-muted-foreground">{env}</div>
              </div>
              <Toggle on={on} onToggle={() => toast(`Toggled: ${name}`)} />
            </div>
          ))}
        </Section>
        <Section title="Integrations">
          {integrations.map(([n, s]) => (
            <div key={n} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <span className="text-sm font-semibold text-navy">{n}</span>
              <Badge tone={s === 'Connected' ? 'success' : 'warm'}>{s}</Badge>
            </div>
          ))}
        </Section>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANALYTICS TAB — ENHANCED
═══════════════════════════════════════════════════════════ */
function AnalyticsTab() {
  const cities: Array<[string, number]> = [['Mumbai', 38], ['Bengaluru', 27], ['Pune', 14], ['Delhi', 11], ['Hyderabad', 7], ['Chennai', 3]];
  const channels: Array<[string, number]> = [['Organic', 62], ['Direct', 48], ['Paid', 36], ['Referral', 22], ['Social', 18], ['Email', 12]];
  const userGrowth = [820, 910, 1050, 980, 1120, 1280, 1400, 1350, 1500, 1680, 1820, 2040];
  const funnel: Array<[string, number, number]> = [
    ['Visits',      58420, 100],
    ['Leads',        4120,  7],
    ['Site Visits',   842,  1.4],
    ['Closed',        187,  0.3],
  ];

  return (
    <>
      <TabHeader title="Global Analytics" subtitle="Cross-portal traffic, conversion and geography." action={<Badge tone="success">Realtime</Badge>} />
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Sessions / day" value="58,420"  sub="↑ +11% wk" />
        <StatCard label="Avg. Session"   value="4m 12s"  sub="↑ +0:18" />
        <StatCard label="Bounce"         value="32%"     sub="↓ −2.1 pts" />
        <StatCard label="Lead → Visit"   value="14.8%"   sub="↑ +0.6 pts" />
        <StatCard label="New Users / wk" value="42"      sub="↑ +8%" />
        <StatCard label="Avg Rev / Listing" value="₹1.4L" sub="↑ +₹12K" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Revenue by City">
          {cities.map(([c, p]) => (
            <div key={c} className="border-b border-border py-3 last:border-0">
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-semibold text-navy">{c}</span>
                <span className="font-mono text-xs">{p}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div className="h-2 rounded-full bg-mid-blue transition-all" style={{ width: `${p}%` }} />
              </div>
            </div>
          ))}
        </Section>
        <Section title="Channel Mix">
          <div className="flex h-48 items-end gap-2">
            {channels.map(([l, v]) => (
              <div key={l} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-sm bg-gold" style={{ height: `${Math.max(8, v * 3)}px` }} />
                <span className="text-[10px] text-muted-foreground">{l}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="User Growth — Last 12 months">
          <div className="flex h-48 items-end gap-1.5">
            {userGrowth.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-sm bg-accent/80" style={{ height: `${(v / 2040) * 160}px` }} />
                <span className="text-[9px] text-muted-foreground">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-right">Peak: 2,040 new users in Dec</p>
        </Section>

        <Section title="Conversion Funnel">
          {funnel.map(([label, count, pct]) => (
            <div key={label} className="border-b border-border py-3 last:border-0">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-navy">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{count.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground">{pct}%</span>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-secondary">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-accent to-gold transition-all"
                  style={{ width: `${Math.min(100, pct === 100 ? 100 : pct * 10)}%` }}
                />
              </div>
            </div>
          ))}
          <p className="mt-3 text-xs text-muted-foreground">Funnel: Visits → Leads → Site Visits → Closed</p>
        </Section>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   AUDIT TRAIL TAB
═══════════════════════════════════════════════════════════ */
function AuditTab() {
  const rows = [
    ...activities.map((a, i) => ({ ...a, ip: `10.0.${i}.${(i * 7) % 250}`, severity: 'info' as const })),
    ...activities.map((a, i) => ({ ...a, ts: a.ts.replace('10', '08'), ip: `192.168.${i}.${(i * 13) % 200}`, severity: i % 3 === 0 ? 'warn' as const : 'info' as const })),
  ];
  return (
    <>
      <TabHeader
        title="Audit Trail"
        subtitle="Every privileged action across the platform."
        action={
          <button
            onClick={() => downloadCSV('audit-trail.csv', ['Time','User','Action','Outcome','IP','Severity'], rows.map((r) => [r.ts, r.user, r.action, r.outcome, r.ip, r.severity]))}
            className="text-xs font-semibold text-accent hover:underline"
          >
            Export CSV →
          </button>
        }
      />
      <Section title="Last 24 hours">
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr><th className="py-2">Time</th><th>User</th><th>Action</th><th>Outcome</th><th>IP</th><th>Severity</th></tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs">{a.ts}</td>
                  <td className="font-semibold text-navy">{a.user}</td>
                  <td className="text-sm">{a.action}</td>
                  <td className="text-xs text-muted-foreground">{a.outcome}</td>
                  <td className="font-mono text-xs">{a.ip}</td>
                  <td>
                    <Badge tone={a.severity === 'warn' ? 'warm' : 'success'}>{a.severity}</Badge>
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

/* ═══════════════════════════════════════════════════════════
   AI MODEL CONTROL TAB
═══════════════════════════════════════════════════════════ */
function AITab() {
  const models: Array<[string, string, string, string, boolean]> = [
    ['nxtsft-match-v3',    'Property Match',   '0.4%', '94.2%', true],
    ['nxtsft-price-v2',    'Price Estimator',  '1.1%', '88.6%', true],
    ['nxtsft-lead-score',  'Lead Scoring',     '0.8%', '91.0%', true],
    ['nxtsft-recommend',   'Recommendations',  '2.3%', '82.4%', false],
  ];
  return (
    <>
      <TabHeader
        title="AI Model Control"
        subtitle="Production model versions, drift and rollout."
        action={
          <button onClick={() => toast.success('Model deployment pipeline triggered')} className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition">
            + Deploy Model
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Models Live"      value="3"      sub="1 in canary" />
        <StatCard label="Inference / hr"   value="184k"   sub="↑ +6% vs avg" />
        <StatCard label="p95 Latency"      value="142ms"  sub="↓ −8ms wk" />
      </div>
      <Section title="Production Models">
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr><th className="py-2">Model</th><th>Purpose</th><th>Drift</th><th>Accuracy</th><th>Status</th></tr>
            </thead>
            <tbody>
              {models.map(([id, p, d, a, live]) => (
                <tr key={id}>
                  <td className="font-mono text-xs">{id}</td>
                  <td className="text-sm font-semibold text-navy">{p}</td>
                  <td className="font-mono text-xs">{d}</td>
                  <td className="font-mono text-xs">{a}</td>
                  <td><Badge tone={live ? 'success' : 'warm'}>{live ? 'Live' : 'Canary'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   NOTIFICATIONS TAB
═══════════════════════════════════════════════════════════ */
function NotifyTab() {
  const items: Array<[string, string, string, 'warn' | 'ok']> = [
    ['System',  'AI model drift exceeded 2%',         '5m ago',  'warn'],
    ['Billing', 'Razorpay payout ₹4.2L succeeded',    '1h ago',  'ok'],
    ['Security','12 failed logins from 1 IP',          '2h ago',  'warn'],
    ['Ops',     'New builder onboarded — Lodha',       '5h ago',  'ok'],
    ['CRM',     'Lead L-1046 marked Hot',              '6h ago',  'ok'],
  ];
  const [channels, setChannels] = useState<Array<[string, boolean]>>([
    ['Email digests', true], ['Slack #ops alerts', true],
    ['SMS for security events', true], ['Weekly KPI summary', false],
  ]);

  const toggleChannel = (idx: number) =>
    setChannels((prev) => prev.map((c, i) => i === idx ? [c[0], !c[1]] : c));

  return (
    <>
      <TabHeader
        title="Notifications"
        subtitle="Platform alerts, system events and digests."
        action={
          <button onClick={() => toast.success('All notifications marked as read')} className="text-xs font-semibold text-accent hover:underline">
            Mark all read
          </button>
        }
      />
      <Section title="Inbox">
        {items.map(([cat, msg, ts, tone], i) => (
          <div key={i} className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-0">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${tone === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{cat[0]}</span>
              <div>
                <div className="text-sm font-semibold text-navy">{msg}</div>
                <div className="text-xs text-muted-foreground">{cat} · {ts}</div>
              </div>
            </div>
            <button onClick={() => toast(`Viewing: ${msg}`)} className="text-xs font-semibold text-accent hover:underline">View</button>
          </div>
        ))}
      </Section>
      <Section title="Notification Channels">
        {channels.map(([l, on], idx) => (
          <div key={l} className="flex items-center justify-between border-b border-border py-3 last:border-0">
            <span className="text-sm font-semibold text-navy">{l}</span>
            <Toggle on={on} onToggle={() => toggleChannel(idx)} />
          </div>
        ))}
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONTENT CMS TAB
═══════════════════════════════════════════════════════════ */
function CMSTab() {
  const pages: Array<[string, string, string, string, string]> = [
    ['Home Hero Carousel',        '/',                  'Published', 'Aarav K.',  '2d ago'],
    ['About — Leadership',        '/about',             'Published', 'Meera I.',  '5d ago'],
    ['Contact',                   '/contact',           'Published', 'Meera I.',  '1w ago'],
    ['Blog: Mumbai 2026 outlook', '/blog/mumbai-2026',  'Draft',     'Priya S.',  'today'],
    ['Builder co-marketing',      '/builders',          'Scheduled', 'Karan J.',  'in 2d'],
  ];
  return (
    <>
      <TabHeader
        title="Content CMS"
        subtitle="Marketing pages, blog and hero content."
        action={
          <button onClick={() => toast.success('New page draft created')} className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition">
            + New Page
          </button>
        }
      />
      <Section title="Pages">
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr><th className="py-2">Title</th><th>Path</th><th>Status</th><th>Editor</th><th>Updated</th></tr>
            </thead>
            <tbody>
              {pages.map(([t, p, s, e, u]) => (
                <tr key={t}>
                  <td className="font-semibold text-navy">{t}</td>
                  <td className="font-mono text-xs">{p}</td>
                  <td><Badge tone={s === 'Published' ? 'success' : s === 'Draft' ? 'warm' : 'new'}>{s}</Badge></td>
                  <td className="text-xs">{e}</td>
                  <td className="text-xs text-muted-foreground">{u}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECURITY CONSOLE TAB
═══════════════════════════════════════════════════════════ */
function SecurityTab() {
  const threats: Array<[string, string, string]> = [
    ['Brute force',              '203.0.113.42',   'Blocked'],
    ['Suspicious login (TOR)',   '198.51.100.7',   'Challenged'],
    ['Phishing report',          'user@gmail.com', 'Investigating'],
    ['Rate limit hit',           '10.0.4.21',      'Mitigated'],
  ];
  const [policies, setPolicies] = useState<Array<[string, boolean]>>([
    ['Require MFA for admins', true], ['Block logins outside India', false],
    ['Session timeout 30m', true], ['Audit log retention 365d', true],
  ]);

  const togglePolicy = (idx: number) =>
    setPolicies((prev) => prev.map((p, i) => i === idx ? [p[0], !p[1]] : p));

  return (
    <>
      <TabHeader title="Security Console" subtitle="Sessions, MFA coverage and threats." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="MFA Coverage"    value="96%"  sub="↑ +2 pts" />
        <StatCard label="Active Sessions" value="218"  />
        <StatCard label="Threats (24h)"   value="4"    sub="2 mitigated" accent="text-amber-600" />
        <StatCard label="Open Incidents"  value="0"    sub="All clear" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Recent Threats">
          {threats.map(([k, src, st]) => (
            <div key={k + src} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <div>
                <div className="text-sm font-semibold text-navy">{k}</div>
                <div className="font-mono text-xs text-muted-foreground">{src}</div>
              </div>
              <Badge tone={st === 'Blocked' || st === 'Mitigated' ? 'success' : 'warm'}>{st}</Badge>
            </div>
          ))}
        </Section>
        <Section title="Policies">
          {policies.map(([l, on], idx) => (
            <div key={l} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <span className="text-sm font-semibold text-navy">{l}</span>
              <Toggle on={on} onToggle={() => togglePolicy(idx)} />
            </div>
          ))}
        </Section>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   BILLING & REVENUE TAB
═══════════════════════════════════════════════════════════ */
function BillingTab() {
  const invoices: Array<[string, string, string, string, string]> = [
    ['INV-2041', 'Lodha Group',  '₹4,20,000', 'Paid',    'May 24'],
    ['INV-2040', 'Prestige',     '₹2,80,000', 'Paid',    'May 22'],
    ['INV-2039', 'Sobha',        '₹1,75,000', 'Overdue', 'May 14'],
    ['INV-2038', 'Kolte Patil',  '₹95,000',   'Paid',    'May 10'],
    ['INV-2037', 'DLF',          '₹6,40,000', 'Pending', 'May 09'],
  ];
  const revTrend = [42, 58, 51, 67, 74, 88, 82, 96, 104, 112, 118, 124];

  return (
    <>
      <TabHeader
        title="Billing & Revenue"
        subtitle="Subscriptions, invoices and payouts."
        action={
          <button onClick={() => toast.success('Statement PDF downloading…')} className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition">
            Download Statement
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="MRR"          value="₹12.4 Cr"  sub="↑ +8.4% wk" />
        <StatCard label="ARR Projection" value="₹148.8 Cr" sub="↑ +12% YoY" />
        <StatCard label="Outstanding"  value="₹8.15 L"   sub="3 overdue" accent="text-amber-600" />
        <StatCard label="Payouts MTD"  value="₹62.4 L"   />
      </div>

      <Section title="Revenue Trend — Last 12 months (₹ Cr)">
        <div className="flex h-32 items-end gap-1.5">
          {revTrend.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-sm bg-gold" style={{ height: `${(v / 124) * 100}px` }} />
              <span className="text-[9px] text-muted-foreground">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Recent Invoices"
        action={
          <button
            onClick={() => downloadCSV('invoices.csv', ['Invoice','Customer','Amount','Status','Date'], invoices.map((r) => r))}
            className="text-xs font-semibold text-accent hover:underline"
          >
            Export CSV →
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr><th className="py-2">Invoice</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {invoices.map(([id, c, a, s, d]) => (
                <tr key={id}>
                  <td className="font-mono text-xs">{id}</td>
                  <td className="font-semibold text-navy">{c}</td>
                  <td className="font-mono text-sm">{a}</td>
                  <td><Badge tone={s === 'Paid' ? 'success' : s === 'Overdue' ? 'hot' : 'warm'}>{s}</Badge></td>
                  <td className="text-xs text-muted-foreground">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   PERMISSIONS TAB
═══════════════════════════════════════════════════════════ */
type PermRole = 'Admin' | 'Supervisor' | 'Sales Rep' | 'User';
type PermGroup = { group: string; tabs: string[] };

const PERM_ROLES: PermRole[] = ['Admin', 'Supervisor', 'Sales Rep', 'User'];
const PERM_GROUPS: PermGroup[] = [
  { group: 'Admin Portal',      tabs: ['Operations', 'Team Mgmt', 'Listings', 'Leads', 'CRM', 'Marketing', 'Reports'] },
  { group: 'Supervisor Portal', tabs: ['Dashboard', 'Team Leads', 'Activity', 'Performance'] },
  { group: 'Sales Portal',      tabs: ['My Leads', 'Lead Details', 'Commissions', 'Site Visits'] },
  { group: 'User Portal',       tabs: ['My Properties', 'Recently Viewed', 'My Credits', 'Profile'] },
];

function buildDefaultPerms(): Record<PermRole, Record<string, boolean>> {
  const obj = {} as Record<PermRole, Record<string, boolean>>;
  for (const role of PERM_ROLES) {
    obj[role] = {};
    for (const g of PERM_GROUPS) {
      for (const tab of g.tabs) {
        obj[role][tab] = true;
      }
    }
  }
  return obj;
}

function PermissionsTab() {
  const [perms, setPerms] = useState<Record<PermRole, Record<string, boolean>>>(buildDefaultPerms);

  const toggle = (role: PermRole, tab: string) =>
    setPerms((prev) => ({
      ...prev,
      [role]: { ...prev[role], [tab]: !prev[role][tab] },
    }));

  return (
    <>
      <TabHeader
        title="Role Permissions"
        subtitle="Control which roles can access which tabs across all portals."
        action={
          <button
            onClick={() => toast.success('Permissions saved successfully')}
            className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition"
          >
            Save Permissions
          </button>
        }
      />

      {PERM_GROUPS.map(({ group, tabs }) => (
        <Section key={group} title={group}>
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2 text-left">Tab</th>
                  {PERM_ROLES.map((r) => (
                    <th key={r} className="text-center">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabs.map((tab) => (
                  <tr key={tab}>
                    <td className="text-sm font-semibold text-navy">{tab}</td>
                    {PERM_ROLES.map((role) => (
                      <td key={role} className="text-center">
                        <Toggle
                          on={perms[role][tab]}
                          onToggle={() => toggle(role, tab)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   REPORTS TAB
═══════════════════════════════════════════════════════════ */
interface ReportDef {
  name: string;
  description: string;
  rowCount: number;
  lastGenerated: string;
  headers: string[];
  rows: (string | number)[][];
}

function ReportsTab() {
  const [previews, setPreviews] = useState<Record<string, boolean>>({});

  const togglePreview = (name: string) =>
    setPreviews((p) => ({ ...p, [name]: !p[name] }));

  const kpiRows: (string | number)[][] = [
    ['Total Listings', kpis.totalListings, '+8.2%'],
    ['Active Leads',   kpis.activeLeads,  '+12.4%'],
    ['Revenue (Cr)',   kpis.revenueCr,    '+24%'],
    ['DAU',            kpis.dau,          '+3.1%'],
    ['MAU',            kpis.mau,          '+9.6%'],
    ['Conversion %',   kpis.conversion,   '+0.4pts'],
  ];

  const reports: ReportDef[] = [
    {
      name: 'Platform KPIs',
      description: 'Core platform metrics including listings, leads, revenue, and engagement.',
      rowCount: kpiRows.length,
      lastGenerated: '2026-06-06 10:00',
      headers: ['Metric', 'Value', 'Change'],
      rows: kpiRows,
    },
    {
      name: 'All Leads',
      description: 'Complete leads database with city, status, value and assigned owner.',
      rowCount: leads.length,
      lastGenerated: '2026-06-06 09:45',
      headers: ['ID', 'Name', 'City', 'Status', 'Value', 'Owner'],
      rows: leads.map((l) => [l.id, l.name, l.city, l.status, l.value, l.owner]),
    },
    {
      name: 'Property Views',
      description: 'All property view events including session duration and contact unlock status.',
      rowCount: propertyViews.length,
      lastGenerated: '2026-06-06 10:55',
      headers: ['ID', 'User', 'Email', 'Property', 'City', 'Duration', 'Unlocked'],
      rows: propertyViews.map((v) => [v.id, v.userName, v.userEmail, v.propertyTitle, v.city, v.durationSec, v.contactUnlocked ? 'Yes' : 'No']),
    },
    {
      name: 'Team Directory',
      description: 'Full staff roster with roles, cities and account status.',
      rowCount: allUsers.length,
      lastGenerated: '2026-06-06 08:30',
      headers: ['ID', 'Name', 'Role', 'City', 'Status'],
      rows: allUsers.map((u) => [u.id, u.name, u.role, u.city, u.status]),
    },
    {
      name: 'Audit Trail',
      description: 'Timestamped log of all privileged user actions and system events.',
      rowCount: activities.length,
      lastGenerated: '2026-06-06 10:42',
      headers: ['Time', 'User', 'Action', 'Outcome'],
      rows: activities.map((a) => [a.ts, a.user, a.action, a.outcome]),
    },
  ];

  return (
    <>
      <TabHeader
        title="Reports"
        subtitle="Download or preview platform data reports as CSV."
        action={<Badge tone="success">{reports.length} reports available</Badge>}
      />
      <div className="grid gap-6 md:grid-cols-2">
        {reports.map((r) => (
          <Section key={r.name} title={r.name}>
            <p className="text-sm text-muted-foreground">{r.description}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span>{r.rowCount} rows</span>
              <span>Last generated: {r.lastGenerated}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => downloadCSV(`${r.name.replace(/\s+/g, '-').toLowerCase()}.csv`, r.headers, r.rows)}
                className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-navy-deep hover:opacity-90 transition"
              >
                Download CSV
              </button>
              <button
                onClick={() => togglePreview(r.name)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:bg-secondary transition"
              >
                {previews[r.name] ? 'Hide Preview' : 'Preview'}
              </button>
            </div>
            {previews[r.name] && (
              <pre className="mt-4 overflow-x-auto rounded-lg bg-secondary/60 p-3 text-[11px] leading-relaxed text-foreground/80">
                {[r.headers, ...r.rows.slice(0, 3)].map((row) => row.join('\t')).join('\n')}
              </pre>
            )}
          </Section>
        ))}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   PLANS MANAGER TAB
═══════════════════════════════════════════════════════════ */
type EditablePlan = {
  id: string; name: string; price: number; priceLabel: string;
  credits?: number; validity: string; tagline: string;
  features: string[]; active: boolean; badge?: string | null;
};

function PlanCard({
  plan, onSave, onToggle, onDelete,
}: {
  plan: EditablePlan;
  onSave: (updated: EditablePlan) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditablePlan>(plan);
  const [newFeature, setNewFeature] = useState('');

  const save = () => { onSave(draft); setEditing(false); toast.success(`"${draft.name}" saved`); };
  const cancel = () => { setDraft(plan); setEditing(false); };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setDraft((d) => ({ ...d, features: [...d.features, newFeature.trim()] }));
    setNewFeature('');
  };
  const removeFeature = (i: number) =>
    setDraft((d) => ({ ...d, features: d.features.filter((_, idx) => idx !== i) }));

  return (
    <div className={`rounded-2xl border-2 bg-white p-5 shadow-sm transition-all duration-200 ${plan.active ? 'border-border' : 'border-border/40 opacity-60'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {editing ? (
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-2 py-1 font-display text-sm font-bold text-navy focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          ) : (
            <div className="font-display text-sm font-bold text-navy">{plan.name}</div>
          )}
          {plan.badge && (
            <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">{plan.badge}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onToggle}
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${plan.active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-secondary text-muted-foreground hover:bg-border'}`}
          >
            {plan.active ? 'Active' : 'Inactive'}
          </button>
          {!editing && (
            <>
              <button onClick={() => setEditing(true)} className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:border-accent hover:text-accent transition">
                <Pencil size={12} />
              </button>
              <button onClick={onDelete} className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:border-red-400 hover:text-red-500 transition">
                <Trash2 size={12} />
              </button>
            </>
          )}
          {editing && (
            <>
              <button onClick={save} className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-white hover:opacity-90 transition">
                <Check size={12} />
              </button>
              <button onClick={cancel} className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-secondary transition">
                <XIcon size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Price + credits */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Price (₹)</label>
          {editing ? (
            <input
              type="number"
              value={draft.price}
              onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value), priceLabel: `₹${Number(e.target.value).toLocaleString('en-IN')}` }))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          ) : (
            <div className="mt-1 font-display text-xl font-black text-navy">{plan.priceLabel}</div>
          )}
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Validity</label>
          {editing ? (
            <input
              value={draft.validity}
              onChange={(e) => setDraft((d) => ({ ...d, validity: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          ) : (
            <div className="mt-1 text-sm font-semibold text-navy">{plan.validity}</div>
          )}
        </div>
        {plan.credits !== undefined && (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Credits</label>
            {editing ? (
              <input
                type="number"
                value={draft.credits ?? 0}
                onChange={(e) => setDraft((d) => ({ ...d, credits: Number(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            ) : (
              <div className="mt-1 text-sm font-semibold text-navy">{plan.credits} unlocks</div>
            )}
          </div>
        )}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tagline</label>
          {editing ? (
            <input
              value={draft.tagline}
              onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">{plan.tagline}</div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="mt-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Features</label>
        <ul className="mt-2 space-y-1.5">
          {(editing ? draft : plan).features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="flex-1 text-navy">{f}</span>
              {editing && (
                <button onClick={() => removeFeature(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
                  <XIcon size={11} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {editing && (
          <div className="mt-2 flex gap-2">
            <input
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFeature()}
              placeholder="Add feature…"
              className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <button onClick={addFeature} className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-white hover:opacity-90 transition">
              <Plus size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function usePlanGroup(initial: EditablePlan[]) {
  const [plans, setPlans] = useState<EditablePlan[]>(initial);

  const save = (id: string, updated: EditablePlan) =>
    setPlans((ps) => ps.map((p) => (p.id === id ? updated : p)));

  const toggle = (id: string) =>
    setPlans((ps) => ps.map((p) => p.id === id ? { ...p, active: !p.active } : p));

  const remove = (id: string) => {
    setPlans((ps) => ps.filter((p) => p.id !== id));
    toast.success('Plan removed');
  };

  const add = (name: string) => {
    const id = `plan-${Date.now()}`;
    setPlans((ps) => [...ps, {
      id, name, price: 0, priceLabel: '₹0', validity: '30 days',
      tagline: 'New plan', features: ['Feature 1'], active: false,
    }]);
    toast.success(`"${name}" created — edit to configure`);
  };

  return { plans, save, toggle, remove, add };
}

function PlanGroup({ title, description, group }: {
  title: string;
  description: string;
  group: ReturnType<typeof usePlanGroup>;
}) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = () => {
    if (!newName.trim()) return;
    group.add(newName.trim());
    setNewName('');
    setAdding(false);
  };

  return (
    <Section
      title={title}
      action={
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{group.plans.filter(p => p.active).length}/{group.plans.length} active</span>
          <button
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-navy-deep hover:opacity-90 transition"
          >
            <Plus size={12} /> Add Plan
          </button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>

      {adding && (
        <div className="mb-4 flex gap-2 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="New plan name…"
            className="flex-1 rounded-lg border border-input bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <button onClick={handleAdd} className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition">Create</button>
          <button onClick={() => setAdding(false)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary transition">Cancel</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSave={(updated) => group.save(plan.id, updated)}
            onToggle={() => group.toggle(plan.id)}
            onDelete={() => group.remove(plan.id)}
          />
        ))}
      </div>
    </Section>
  );
}

function PlansManagerTab() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toEditable = (p: Record<string, any>): EditablePlan => ({
    id: p.id, name: p.name, price: p.price, priceLabel: p.priceLabel,
    credits: p.credits, validity: p.validity, tagline: p.tagline,
    features: [...p.features], active: true,
    badge: 'badge' in p ? p.badge ?? null : null,
  });

  const seekerGroup       = usePlanGroup(seekerPlans.map(toEditable));
  const ownerRentalGroup  = usePlanGroup(ownerRentalPlans.map(toEditable));
  const ownerSellGroup    = usePlanGroup(ownerSellPlans.map(toEditable));

  const totalPlans  = seekerGroup.plans.length + ownerRentalGroup.plans.length + ownerSellGroup.plans.length;
  const activePlans = [...seekerGroup.plans, ...ownerRentalGroup.plans, ...ownerSellGroup.plans].filter(p => p.active).length;

  return (
    <>
      <TabHeader
        title="Plans Manager"
        subtitle="Create, edit, price and activate plans across all customer segments."
        action={
          <button
            onClick={() => toast.success('All plan changes published to production')}
            className="rounded-md bg-gold px-4 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition"
          >
            Publish All Changes
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Plans"  value={String(totalPlans)}  sub={`${activePlans} active`} />
        <StatCard label="Plan Groups"  value="3"                   sub="Seeker · Owner Rent · Owner Sell" />
        <StatCard label="MRR from Plans" value="₹12.4 Cr"         sub="↑ +8.4% this month" />
      </div>

      <div className="mt-6 space-y-6">
        <PlanGroup
          title="Seeker Plans (Home Buyers / Renters)"
          description="Credit-based contact unlock plans shown on the Pricing page and property detail pages."
          group={seekerGroup}
        />
        <PlanGroup
          title="Owner Rental Plans"
          description="Listing plans for landlords looking to find tenants."
          group={ownerRentalGroup}
        />
        <PlanGroup
          title="Owner Sell Plans"
          description="Listing plans for property sellers, brokers and developers."
          group={ownerSellGroup}
        />
      </div>
    </>
  );
}
