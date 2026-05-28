import { createFileRoute, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PortalShell, StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { kpis, leads, activities, properties, teamMembers } from "@/data/static";

export const Route = createFileRoute("/sa-portal")({
  head: () => ({ meta: [{ title: "NestIQ Command — Super Admin" }] }),
  component: SA,
});

const nav = [
  { label: "Command Dashboard", to: "/sa-portal", icon: "◆" },
  { label: "User Management", to: "/sa-portal#users", icon: "◇" },
  { label: "Platform Config", to: "/sa-portal#config", icon: "⚙" },
  { label: "Global Analytics", to: "/sa-portal#analytics", icon: "◉" },
  { label: "Audit Trail", to: "/sa-portal#audit", icon: "≡" },
  { label: "AI Model Control", to: "/sa-portal#ai", icon: "▲" },
  { label: "Notifications", to: "/sa-portal#notify", icon: "✦" },
  { label: "Content CMS", to: "/sa-portal#cms", icon: "▤" },
  { label: "Security Console", to: "/sa-portal#sec", icon: "⚿" },
  { label: "Billing & Revenue", to: "/sa-portal#bill", icon: "₹" },
];

function SA() {
  const { hash } = useLocation();
  return (
    <PortalShell brand="NestIQ Command" role="Super Admin" accent="gold" user={{ name: "Aarav Khanna", initials: "AK" }} nav={nav} basePath="/sa-portal">
      {renderTab(hash)}
    </PortalShell>
  );
}

function renderTab(hash: string) {
  switch (hash) {
    case "users": return <UsersTab />;
    case "config": return <ConfigTab />;
    case "analytics": return <AnalyticsTab />;
    case "audit": return <AuditTab />;
    case "ai": return <AITab />;
    case "notify": return <NotifyTab />;
    case "cms": return <CMSTab />;
    case "sec": return <SecurityTab />;
    case "bill": return <BillingTab />;
    default: return <Dashboard />;
  }
}

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

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`relative inline-block h-6 w-11 rounded-full transition ${on ? "bg-accent" : "bg-secondary"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-5" : "left-0.5"}`} />
    </span>
  );
}

function Dashboard() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Listings" value={kpis.totalListings.toLocaleString()} sub="+8.2% wk" />
        <StatCard label="Active Leads" value={kpis.activeLeads.toLocaleString()} sub="+12.4% wk" />
        <StatCard label="Revenue YTD" value={`₹${kpis.revenueCr}Cr`} sub="+24% YoY" />
        <StatCard label="DAU" value={kpis.dau.toLocaleString()} sub="+3.1%" />
        <StatCard label="MAU" value={`${(kpis.mau / 1000).toFixed(0)}K`} sub="+9.6%" />
        <StatCard label="Conv. Rate" value={`${kpis.conversion}%`} sub="+0.4 pts" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Revenue & Lead Funnel — Last 12 weeks" action={<Badge tone="success">Live</Badge>}>
            <div className="flex h-56 items-end gap-2">
              {Array.from({ length: 12 }).map((_, i) => {
                const h = 30 + ((i * 37) % 60);
                const h2 = 20 + ((i * 53) % 50);
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-col gap-0.5">
                      <div className="w-full rounded-t bg-accent" style={{ height: `${h}%` }} />
                      <div className="w-full rounded-b bg-gold" style={{ height: `${h2}%` }} />
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
          {[["API p50", "84ms", "ok"], ["DB Replication", "1.2s lag", "ok"], ["AI Model Drift", "0.4%", "ok"], ["Failed Logins (24h)", "12", "warn"]].map(([l, v, s]) => (
            <div key={l} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <span className="text-sm">{l}</span>
              <span className={`font-mono text-sm font-bold ${s === "warn" ? "text-amber-600" : "text-emerald-600"}`}>{v}</span>
            </div>
          ))}
        </Section>
      </div>

      <Section title="Recent Audit Trail" action={<button className="text-xs font-semibold text-accent">Export PDF →</button>}>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="py-2">Time</th><th>User</th><th>Action</th><th>Outcome</th></tr>
          </thead>
          <tbody>
            {activities.map((a, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-3 font-mono text-xs">{a.ts}</td>
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
              <Badge tone={l.status.toLowerCase() as "hot" | "warm" | "cold" | "new"}>{l.status}</Badge>
            </div>
          ))}
        </Section>
      </div>
    </>
  );
}

const allUsers = [
  ...teamMembers.map((m) => ({ id: m.id, name: m.name, role: m.role, city: m.city, status: "Active" as const, last: "2h ago" })),
  { id: "U-25", name: "Aarav Khanna", role: "Super Admin", city: "Mumbai", status: "Active" as const, last: "now" },
  { id: "U-26", name: "Meera Iyer", role: "Admin", city: "Bengaluru", status: "Active" as const, last: "12m ago" },
  { id: "U-27", name: "Rohit Nair", role: "Supervisor", city: "Hyderabad", status: "Suspended" as const, last: "4d ago" },
  { id: "U-28", name: "Sneha Pillai", role: "Sales Rep", city: "Chennai", status: "Invited" as const, last: "—" },
];

function UsersTab() {
  return (
    <>
      <TabHeader title="User Management" subtitle="Roles, permissions and lifecycle for the whole platform." action={<button className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep">+ Invite User</button>} />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Users" value="184" sub="+6 this wk" />
        <StatCard label="Admins" value="12" />
        <StatCard label="Sales Reps" value="64" sub="+2 this wk" />
        <StatCard label="Suspended" value="3" accent="text-amber-600" />
      </div>
      <Section title="Directory">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2">ID</th><th>Name</th><th>Role</th><th>City</th><th>Last Active</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {allUsers.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-3 font-mono text-xs">{u.id}</td>
                  <td className="font-semibold text-navy">{u.name}</td>
                  <td className="text-xs">{u.role}</td>
                  <td className="text-xs">{u.city}</td>
                  <td className="text-xs text-muted-foreground">{u.last}</td>
                  <td><Badge tone={u.status === "Active" ? "success" : u.status === "Suspended" ? "warm" : "new"}>{u.status}</Badge></td>
                  <td className="text-right"><button className="text-xs font-semibold text-accent">Manage →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

function ConfigTab() {
  const flags: Array<[string, boolean, string]> = [
    ["AI Property Match v3", true, "Production"],
    ["WhatsApp Lead Capture", true, "Production"],
    ["Bulk Listing Import", false, "Beta"],
    ["Mortgage Calculator v2", true, "Production"],
    ["Builder Co-marketing", false, "Internal"],
    ["End-user Chat Widget", true, "Production"],
  ];
  const integrations: Array<[string, string]> = [
    ["Twilio SMS", "Connected"], ["SendGrid Email", "Connected"], ["Razorpay Payments", "Connected"],
    ["Google Maps", "Connected"], ["MagicBricks Sync", "Disconnected"], ["99acres Sync", "Connected"],
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
              <Toggle on={on} />
            </div>
          ))}
        </Section>
        <Section title="Integrations">
          {integrations.map(([n, s]) => (
            <div key={n} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <span className="text-sm font-semibold text-navy">{n}</span>
              <Badge tone={s === "Connected" ? "success" : "warm"}>{s}</Badge>
            </div>
          ))}
        </Section>
      </div>
    </>
  );
}

function AnalyticsTab() {
  const cities: Array<[string, number]> = [["Mumbai", 38], ["Bengaluru", 27], ["Pune", 14], ["Delhi", 11], ["Hyderabad", 7], ["Chennai", 3]];
  const channels: Array<[string, number]> = [["Organic", 62], ["Direct", 48], ["Paid", 36], ["Referral", 22], ["Social", 18], ["Email", 12]];
  return (
    <>
      <TabHeader title="Global Analytics" subtitle="Cross-portal traffic, conversion and geography." action={<Badge tone="success">Realtime</Badge>} />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Sessions / day" value="58,420" sub="+11% wk" />
        <StatCard label="Avg. Session" value="4m 12s" sub="+0:18" />
        <StatCard label="Bounce" value="32%" sub="−2.1 pts" />
        <StatCard label="Lead → Visit" value="14.8%" sub="+0.6 pts" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Traffic by City">
          {cities.map(([c, p]) => (
            <div key={c} className="border-b border-border py-3 last:border-0">
              <div className="mb-1 flex justify-between text-sm"><span className="font-semibold text-navy">{c}</span><span className="font-mono text-xs">{p}%</span></div>
              <div className="h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-mid-blue" style={{ width: `${Math.min(100, p * 2.6)}%` }} /></div>
            </div>
          ))}
        </Section>
        <Section title="Channel Mix">
          <div className="flex h-56 items-end gap-3">
            {channels.map(([l, h]) => (
              <div key={l} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t bg-gold" style={{ height: `${h}%` }} />
                <span className="text-[10px] text-muted-foreground">{l}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}

function AuditTab() {
  const rows = [...activities, ...activities.map((a) => ({ ...a, ts: a.ts.replace("10", "08") }))];
  return (
    <>
      <TabHeader title="Audit Trail" subtitle="Every privileged action across the platform." action={<button className="text-xs font-semibold text-accent">Export CSV →</button>} />
      <Section title="Last 24 hours">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2">Time</th><th>User</th><th>Action</th><th>Outcome</th><th>IP</th></tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-3 font-mono text-xs">{a.ts}</td>
                  <td className="font-semibold text-navy">{a.user}</td>
                  <td className="text-sm">{a.action}</td>
                  <td className="text-xs text-muted-foreground">{a.outcome}</td>
                  <td className="font-mono text-xs">10.0.{i}.{(i * 7) % 250}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

function AITab() {
  const models: Array<[string, string, string, string, boolean]> = [
    ["nestiq-match-v3", "Property Match", "0.4%", "94.2%", true],
    ["nestiq-price-v2", "Price Estimator", "1.1%", "88.6%", true],
    ["nestiq-lead-score", "Lead Scoring", "0.8%", "91.0%", true],
    ["nestiq-recommend", "Recommendations", "2.3%", "82.4%", false],
  ];
  return (
    <>
      <TabHeader title="AI Model Control" subtitle="Production model versions, drift and rollout." action={<button className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep">+ Deploy Model</button>} />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Models Live" value="3" sub="1 in canary" />
        <StatCard label="Inference / hr" value="184k" sub="+6% vs avg" />
        <StatCard label="p95 Latency" value="142ms" sub="−8ms wk" />
      </div>
      <Section title="Production Models">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2">Model</th><th>Purpose</th><th>Drift</th><th>Accuracy</th><th>Status</th></tr>
            </thead>
            <tbody>
              {models.map(([id, p, d, a, live]) => (
                <tr key={id} className="border-t border-border">
                  <td className="py-3 font-mono text-xs">{id}</td>
                  <td className="text-sm font-semibold text-navy">{p}</td>
                  <td className="font-mono text-xs">{d}</td>
                  <td className="font-mono text-xs">{a}</td>
                  <td><Badge tone={live ? "success" : "warm"}>{live ? "Live" : "Canary"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

function NotifyTab() {
  const items: Array<[string, string, string, "warn" | "ok"]> = [
    ["System", "AI model drift exceeded 2%", "5m ago", "warn"],
    ["Billing", "Razorpay payout ₹4.2L succeeded", "1h ago", "ok"],
    ["Security", "12 failed logins from 1 IP", "2h ago", "warn"],
    ["Ops", "New builder onboarded — Lodha", "5h ago", "ok"],
    ["CRM", "Lead L-1046 marked Hot", "6h ago", "ok"],
  ];
  const channels: Array<[string, boolean]> = [
    ["Email digests", true], ["Slack #ops alerts", true],
    ["SMS for security events", true], ["Weekly KPI summary", false],
  ];
  return (
    <>
      <TabHeader title="Notifications" subtitle="Platform alerts, system events and digests." action={<button className="text-xs font-semibold text-accent">Mark all read</button>} />
      <Section title="Inbox">
        {items.map(([cat, msg, ts, tone], i) => (
          <div key={i} className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-0">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${tone === "warn" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{cat[0]}</span>
              <div>
                <div className="text-sm font-semibold text-navy">{msg}</div>
                <div className="text-xs text-muted-foreground">{cat} · {ts}</div>
              </div>
            </div>
            <button className="text-xs font-semibold text-accent">View</button>
          </div>
        ))}
      </Section>
      <Section title="Notification Channels">
        {channels.map(([l, on]) => (
          <div key={l} className="flex items-center justify-between border-b border-border py-3 last:border-0">
            <span className="text-sm font-semibold text-navy">{l}</span>
            <Toggle on={on} />
          </div>
        ))}
      </Section>
    </>
  );
}

function CMSTab() {
  const pages: Array<[string, string, string, string, string]> = [
    ["Home Hero Carousel", "/", "Published", "Aarav K.", "2d ago"],
    ["About — Leadership", "/about", "Published", "Meera I.", "5d ago"],
    ["Contact", "/contact", "Published", "Meera I.", "1w ago"],
    ["Blog: Mumbai 2026 outlook", "/blog/mumbai-2026", "Draft", "Priya S.", "today"],
    ["Builder co-marketing", "/builders", "Scheduled", "Karan J.", "in 2d"],
  ];
  return (
    <>
      <TabHeader title="Content CMS" subtitle="Marketing pages, blog and hero content." action={<button className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep">+ New Page</button>} />
      <Section title="Pages">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2">Title</th><th>Path</th><th>Status</th><th>Editor</th><th>Updated</th></tr>
            </thead>
            <tbody>
              {pages.map(([t, p, s, e, u]) => (
                <tr key={t} className="border-t border-border">
                  <td className="py-3 font-semibold text-navy">{t}</td>
                  <td className="font-mono text-xs">{p}</td>
                  <td><Badge tone={s === "Published" ? "success" : s === "Draft" ? "warm" : "new"}>{s}</Badge></td>
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

function SecurityTab() {
  const threats: Array<[string, string, string]> = [
    ["Brute force", "203.0.113.42", "Blocked"],
    ["Suspicious login (TOR)", "198.51.100.7", "Challenged"],
    ["Phishing report", "user@gmail.com", "Investigating"],
    ["Rate limit hit", "10.0.4.21", "Mitigated"],
  ];
  const policies: Array<[string, boolean]> = [
    ["Require MFA for admins", true], ["Block logins outside India", false],
    ["Session timeout 30m", true], ["Audit log retention 365d", true],
  ];
  return (
    <>
      <TabHeader title="Security Console" subtitle="Sessions, MFA coverage and threats." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="MFA Coverage" value="96%" sub="+2 pts" />
        <StatCard label="Active Sessions" value="218" />
        <StatCard label="Threats (24h)" value="4" sub="2 mitigated" accent="text-amber-600" />
        <StatCard label="Open Incidents" value="0" sub="All clear" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Recent Threats">
          {threats.map(([k, src, st]) => (
            <div key={k + src} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <div>
                <div className="text-sm font-semibold text-navy">{k}</div>
                <div className="font-mono text-xs text-muted-foreground">{src}</div>
              </div>
              <Badge tone={st === "Blocked" || st === "Mitigated" ? "success" : "warm"}>{st}</Badge>
            </div>
          ))}
        </Section>
        <Section title="Policies">
          {policies.map(([l, on]) => (
            <div key={l} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <span className="text-sm font-semibold text-navy">{l}</span>
              <Toggle on={on} />
            </div>
          ))}
        </Section>
      </div>
    </>
  );
}

function BillingTab() {
  const invoices: Array<[string, string, string, string, string]> = [
    ["INV-2041", "Lodha Group", "₹4,20,000", "Paid", "May 24"],
    ["INV-2040", "Prestige", "₹2,80,000", "Paid", "May 22"],
    ["INV-2039", "Sobha", "₹1,75,000", "Overdue", "May 14"],
    ["INV-2038", "Kolte Patil", "₹95,000", "Paid", "May 10"],
    ["INV-2037", "DLF", "₹6,40,000", "Pending", "May 09"],
  ];
  return (
    <>
      <TabHeader title="Billing & Revenue" subtitle="Subscriptions, invoices and payouts." action={<button className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep">Download Statement</button>} />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="MRR" value="₹12.4 Cr" sub="+8.4% wk" />
        <StatCard label="ARR Projection" value="₹148.8 Cr" sub="+12% YoY" />
        <StatCard label="Outstanding" value="₹8.15 L" sub="3 overdue" accent="text-amber-600" />
        <StatCard label="Payouts MTD" value="₹62.4 L" />
      </div>
      <Section title="Recent Invoices">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2">Invoice</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {invoices.map(([id, c, a, s, d]) => (
                <tr key={id} className="border-t border-border">
                  <td className="py-3 font-mono text-xs">{id}</td>
                  <td className="font-semibold text-navy">{c}</td>
                  <td className="font-mono text-sm">{a}</td>
                  <td><Badge tone={s === "Paid" ? "success" : s === "Overdue" ? "hot" : "warm"}>{s}</Badge></td>
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