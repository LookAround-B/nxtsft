"use client";
import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  Building2,
  Target,
  Kanban,
  BellRing,
  Megaphone,
  Building,
  BarChart2,
  Wallet,
  ReceiptText,
  CheckCircle,
  XCircle,
  Eye,
  Phone,
  Mail,
  UserCheck,
  ChevronDown,
  PackageOpen,
  Plus,
  Pencil,
  Trash2,
  Check,
  X as XIcon,
} from "lucide-react";
import { getLeads, assignLead, updateLeadStatus, type Lead } from "@/lib/leads";
import { getPendingListings, updateListingStatus as persistListingStatus } from "@/lib/listings";
import { PortalShell, StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { useActiveHash } from "@/lib/use-active-hash";
import {
  leads,
  teamMembers,
  properties,
  pipeline,
  activities,
  subscriptions,
  unlockedContacts,
  disputes as disputeData,
  propertyViews,
  seekerPlans,
  ownerRentalPlans,
  ownerSellPlans,
} from "@/data/static";
import { ReportsDashboard } from "@/components/portal/ReportsDashboard";

// ─── CSV helper ────────────────────────────────────────────────────────────────
const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: filename,
  });
  a.click();
};

const nav = [
  { label: "Operations", to: "/admin-portal", icon: <LayoutDashboard size={14} /> },
  { label: "Team Management", to: "/admin-portal#team", icon: <Users size={14} /> },
  { label: "Listings", to: "/admin-portal#listings", icon: <Building2 size={14} /> },
  { label: "Lead Management", to: "/admin-portal#leads", icon: <Target size={14} /> },
  { label: "CRM Pipeline", to: "/admin-portal#crm", icon: <Kanban size={14} /> },
  { label: "Subscriptions", to: "/admin-portal#subscriptions", icon: <ReceiptText size={14} /> },
  { label: "Property Views", to: "/admin-portal#views", icon: <Eye size={14} /> },
  { label: "Click Alerts", to: "/admin-portal#alerts", icon: <BellRing size={14} /> },
  { label: "Marketing", to: "/admin-portal#marketing", icon: <Megaphone size={14} /> },
  { label: "Developers", to: "/admin-portal#dev", icon: <Building size={14} /> },
  { label: "Reports", to: "/admin-portal#reports", icon: <BarChart2 size={14} /> },
  { label: "Plans", to: "/admin-portal#plans", icon: <PackageOpen size={14} /> },
  { label: "Commissions", to: "/admin-portal#commissions", icon: <Wallet size={14} /> },
];

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  city: string;
  status: "Active" | "Invited";
  phone: string;
  joined: string;
  achieved: number;
};

const JOINED_DATES: Record<string, string> = {
  "U-21": "Jan 2022",
  "U-22": "Mar 2021",
  "U-23": "Jul 2023",
  "U-24": "Nov 2022",
};
const PHONES: Record<string, string> = {
  "U-21": "+91 98765 11001",
  "U-22": "+91 98765 11002",
  "U-23": "+91 98765 11003",
  "U-24": "+91 98765 11004",
};

const seedRoster: Member[] = teamMembers.map((m) => ({
  id: m.id,
  name: m.name,
  email: `${m.name.split(" ")[0].toLowerCase()}@nxtsft.com`,
  role: m.role,
  city: m.city,
  status: "Active",
  phone: PHONES[m.id] ?? "+91 99999 00000",
  joined: JOINED_DATES[m.id] ?? "Jan 2024",
  achieved: m.achieved,
}));

export default function AdminPortal() {
  const hash = useActiveHash();
  return (
    <PortalShell
      brand="NxtSft.com Control"
      role="Admin"
      accent="red"
      user={{ name: "Meera Iyer", initials: "MI" }}
      nav={nav}
      basePath="/admin-portal"
    >
      {renderTab(hash)}
    </PortalShell>
  );
}

function renderTab(hash: string) {
  switch (hash) {
    case "team":
      return <TeamTab />;
    case "listings":
      return <ListingsTab />;
    case "leads":
      return <LeadsTab />;
    case "crm":
      return <CRMTab />;
    case "subscriptions":
      return <SubscriptionsTab />;
    case "views":
      return <ViewsTab />;
    case "alerts":
      return <AlertsTab />;
    case "marketing":
      return <MarketingTab />;
    case "dev":
      return <DevTab />;
    case "reports":
      return <ReportsTab />;
    case "plans":
      return <AdminPlansTab />;
    case "commissions":
      return <CommissionsTab />;
    default:
      return <OperationsTab />;
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
  if (user === "System") return "border-l-amber-500";
  if (user.startsWith("Priya")) return "border-l-emerald-500";
  if (user.startsWith("Karan")) return "border-l-blue-500";
  if (user.startsWith("Anita")) return "border-l-purple-500";
  if (user.startsWith("Devansh")) return "border-l-rose-500";
  return "border-l-accent";
};

// ─── Funnel bar component ────────────────────────────────────────────────────
function FunnelBar({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const pct = Math.round((count / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-semibold text-navy">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-secondary h-4">
        <div className={`h-4 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-xs font-bold text-navy">
        {count}
      </span>
    </div>
  );
}

function OperationsTab() {
  return (
    <>
      <PageHead
        title="Operations Overview"
        subtitle="Pulse of all NxtSft.com ops — refreshed every 30 seconds."
      />

      {/* 8-card stat grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Pipeline Value" value="₹84.2 Cr" sub="+9.1% wk" />
        <StatCard label="Open Leads" value="412" sub="+18 today" />
        <StatCard label="Pending Approvals" value="27" sub="6 urgent" accent="text-amber-600" />
        <StatCard
          label="Click Alerts (24h)"
          value="14"
          sub="3 thresholds hit"
          accent="text-accent"
        />
        <StatCard label="Total Properties" value="186" sub="Across all cities" />
        <StatCard
          label="Conversions MTD"
          value="23"
          sub="+4 vs last mo"
          accent="text-emerald-600"
        />
        <StatCard label="Avg Deal Size" value="₹52 L" sub="Up ₹3L vs last mo" />
        <StatCard label="Team Size" value="18" sub="4 cities active" />
      </div>

      {/* Funnel section */}
      <Section title="Conversion Funnel — This Month">
        <div className="space-y-3 py-1">
          <FunnelBar label="Leads" count={412} max={412} color="bg-blue-500" />
          <FunnelBar label="Qualified" count={198} max={412} color="bg-violet-500" />
          <FunnelBar label="Site Visit" count={87} max={412} color="bg-amber-500" />
          <FunnelBar label="Closed" count={23} max={412} color="bg-emerald-500" />
        </div>
        <div className="mt-3 flex gap-6 text-[11px] text-muted-foreground">
          <span>
            Qualified rate: <strong className="text-navy">48%</strong>
          </span>
          <span>
            Visit rate: <strong className="text-navy">44%</strong>
          </span>
          <span>
            Close rate: <strong className="text-navy">26%</strong>
          </span>
          <span>
            Overall: <strong className="text-emerald-600">5.6%</strong>
          </span>
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
            { label: "Approve listing", hash: "listings" },
            { label: "Invite team member", hash: "team" },
            { label: "View click alerts", hash: "alerts" },
            { label: "Run weekly report", hash: "reports" },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => {
                window.location.hash = a.hash;
              }}
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
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 overflow-hidden rounded-full bg-secondary h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span
        className={`text-xs font-semibold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500"}`}
      >
        {pct}%
      </span>
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
          <button
            onClick={() => setShowInvite(true)}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
          >
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
                  <td>
                    <PerfBar pct={m.achieved} />
                  </td>
                  <td>
                    <Badge tone={m.status === "Active" ? "success" : "new"}>{m.status}</Badge>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => {
                        setRoster((r) => r.filter((x) => x.id !== m.id));
                        toast.success(`${m.name} removed from team`);
                      }}
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
          onInvite={(m) => {
            setRoster((r) => [m, ...r]);
            setShowInvite(false);
            toast.success(`Invite sent to ${m.email}`);
          }}
        />
      )}
    </>
  );
}

type ListingItem = {
  id: string;
  title: string;
  image: string;
  builder: string;
  city: string;
  priceLabel: string;
  bhk: string;
  status: "Pending" | "Approved" | "Rejected";
  isUserSubmission?: boolean;
  locality?: string;
  listerEmail?: string;
  listerPhone?: string;
  submittedAt?: string;
  purpose?: string;
  area?: string;
};

function ListingsTab() {
  const [items, setItems] = useState<ListingItem[]>(
    properties.map((p) => ({
      id: p.id,
      title: p.title,
      image: p.image,
      builder: p.builder,
      city: p.city,
      priceLabel: p.priceLabel,
      bhk: p.bhk,
      status: "Pending" as const,
    })),
  );

  useEffect(() => {
    const userSubs: ListingItem[] = getPendingListings().map((l) => ({
      id: l.id,
      title: l.title || `${l.bhk} ${l.propertyType} in ${l.city}`,
      image: "",
      builder: l.listerName,
      city: l.city,
      priceLabel: `₹${l.price}`,
      bhk: l.bhk,
      status:
        l.status === "pending" ? "Pending" : l.status === "approved" ? "Approved" : "Rejected",
      isUserSubmission: true,
      locality: l.locality,
      listerEmail: l.listerEmail,
      listerPhone: l.listerPhone,
      submittedAt: l.submittedAt,
      purpose: l.purpose,
      area: l.area,
    }));
    setItems((prev) => {
      const staticOnly = prev.filter((i) => !i.isUserSubmission);
      return [...userSubs, ...staticOnly];
    });
  }, []);

  const approve = (it: ListingItem) => {
    setItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, status: "Approved" } : x)));
    if (it.isUserSubmission) persistListingStatus(it.id, "approved");
    toast.success(`Approved: ${it.title}`);
  };

  const reject = (it: ListingItem) => {
    setItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, status: "Rejected" } : x)));
    if (it.isUserSubmission) persistListingStatus(it.id, "rejected");
    toast.error(`Rejected: ${it.title}`);
  };

  const counts = {
    pending: items.filter((i) => i.status === "Pending").length,
    approved: items.filter((i) => i.status === "Approved").length,
    rejected: items.filter((i) => i.status === "Rejected").length,
    user: items.filter((i) => i.isUserSubmission).length,
  };

  return (
    <>
      <PageHead
        title="Listings Approvals"
        subtitle="Moderate property submissions before they go live."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Pending"
          value={String(counts.pending)}
          sub="Awaiting review"
          accent="text-amber-600"
        />
        <StatCard label="Approved" value={String(counts.approved)} sub="Live on site" />
        <StatCard
          label="Rejected"
          value={String(counts.rejected)}
          sub="Needs re-submission"
          accent="text-accent"
        />
        <StatCard
          label="User Submissions"
          value={String(counts.user)}
          sub="From /list form"
          accent="text-blue-600"
        />
      </div>
      <Section title="All Submissions">
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <div
              key={it.id}
              className={`rounded-xl border p-4 ${it.isUserSubmission ? "border-blue-200 bg-blue-50/30" : "border-border"}`}
            >
              <div className="flex gap-3">
                {it.image ? (
                  <img
                    src={it.image}
                    alt=""
                    className="h-20 w-28 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="grid h-20 w-28 shrink-0 place-items-center rounded-lg bg-navy/8 text-xs font-semibold text-navy/40">
                    No image
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-1.5">
                    {it.isUserSubmission && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        User Submission
                      </span>
                    )}
                    <Badge
                      tone={
                        it.status === "Approved"
                          ? "success"
                          : it.status === "Rejected"
                            ? "hot"
                            : "warm"
                      }
                    >
                      {it.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-navy">{it.title}</div>
                  <div className="text-xs text-muted-foreground">{it.builder}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-navy">
                      {it.city}
                    </span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-navy">
                      {it.priceLabel}
                    </span>
                    {it.bhk && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-semibold text-navy">
                        {it.bhk}
                      </span>
                    )}
                    {it.purpose && (
                      <span className="rounded bg-accent/10 px-1.5 py-0.5 font-medium text-accent">
                        For {it.purpose}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {it.isUserSubmission && (it.listerEmail || it.listerPhone) && (
                <div className="mt-3 flex flex-wrap gap-3 border-t border-blue-100 pt-3 text-xs text-muted-foreground">
                  {it.listerEmail && (
                    <span className="flex items-center gap-1">
                      <Mail size={11} className="text-accent" />
                      {it.listerEmail}
                    </span>
                  )}
                  {it.listerPhone && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} className="text-accent" />
                      +91 {it.listerPhone}
                    </span>
                  )}
                  {it.submittedAt && (
                    <span className="ml-auto text-[10px]">
                      {new Date(it.submittedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => approve(it)}
                  disabled={it.status === "Approved"}
                  className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  onClick={() => reject(it)}
                  disabled={it.status === "Rejected"}
                  className="rounded-md border border-border px-3 py-1 text-xs font-semibold transition hover:bg-secondary disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function LeadsTab() {
  const [filter, setFilter] = useState<string>("All");
  const filtered = filter === "All" ? leads : leads.filter((l) => l.status === filter);
  return (
    <>
      <PageHead title="Lead Management" subtitle="All leads across cities and reps." />
      <Section title="Filter by status">
        <div className="flex flex-wrap gap-2">
          {["All", "Hot", "Warm", "Cold", "New"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === s ? "border-accent bg-accent text-accent-foreground" : "border-border bg-white"}`}
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
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-navy">
                      {l.source}
                    </span>
                  </td>
                  <td className="text-xs">{l.owner}</td>
                  <td>
                    <Badge tone={l.status.toLowerCase() as "hot" | "warm" | "cold" | "new"}>
                      {l.status}
                    </Badge>
                  </td>
                  <td className="font-mono text-xs">₹{(l.value / 100000).toFixed(1)}L</td>
                  <td className="text-xs text-muted-foreground">{l.lastActivity}</td>
                  <td className="text-right">
                    <button
                      onClick={() => toast.success(`Assigning ${l.name}…`)}
                      className="text-xs font-semibold text-accent"
                    >
                      Assign →
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

// ─── CRM enrichment lookup ─────────────────────────────────────────────────
const leadMeta: Record<string, { name: string; city: string; value: string }> = {
  "L-1042": { name: "Rohan Mehta", city: "Mumbai", value: "₹3.25 Cr" },
  "L-1043": { name: "Aisha Khan", city: "Bengaluru", value: "₹4.10 Cr" },
  "L-1044": { name: "Vikram Singh", city: "Pune", value: "₹35K/mo" },
  "L-1045": { name: "Neha Reddy", city: "Hyderabad", value: "₹1.75L/mo" },
  "L-1046": { name: "Suresh Iyer", city: "Delhi", value: "₹6.80 Cr" },
  "L-1047": { name: "Kavya Nair", city: "Mumbai", value: "₹2.85 Cr" },
  "L-1051": { name: "Amit Verma", city: "Pune", value: "₹42L" },
  "L-1055": { name: "Riya Desai", city: "Mumbai", value: "₹1.9 Cr" },
  "L-1058": { name: "Dev Kumar", city: "Chennai", value: "₹68L" },
  "L-1062": { name: "Meena Pillai", city: "Delhi", value: "₹3.5 Cr" },
  "L-1031": { name: "Tarun Seth", city: "Bengaluru", value: "₹2.1 Cr" },
  "L-1037": { name: "Preethi R.", city: "Hyderabad", value: "₹1.4 Cr" },
  "L-1024": { name: "Harish Nair", city: "Mumbai", value: "₹5.2 Cr" },
  "L-1019": { name: "Sonia Kapoor", city: "Delhi", value: "₹62L" },
  "L-1011": { name: "Raj Malhotra", city: "Pune", value: "₹88L" },
};

const colAccent: Record<string, string> = {
  New: "border-t-sky-400",
  Contacted: "border-t-blue-500",
  Qualified: "border-t-violet-500",
  "Site Visit": "border-t-amber-500",
  Negotiation: "border-t-orange-500",
  Closed: "border-t-emerald-500",
};

function CRMTab() {
  return (
    <>
      <PageHead title="CRM Pipeline" subtitle="Drag-style kanban across the full funnel." />
      <Section title="Pipeline — All Teams" action={<Badge tone="new">Real-time</Badge>}>
        <div className="grid gap-3 md:grid-cols-6">
          {Object.entries(pipeline).map(([col, items]) => (
            <div
              key={col}
              className={`rounded-lg bg-secondary/60 p-3 border-t-4 ${colAccent[col] ?? "border-t-border"}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-navy">{col}</span>
                <span className="rounded-full bg-white px-1.5 text-[10px] font-bold text-mid-blue">
                  {items.length}
                </span>
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
                          <div className="mt-0.5 font-semibold text-navy leading-tight">
                            {meta.name}
                          </div>
                          <div className="mt-0.5 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{meta.city}</span>
                            <span className="font-mono text-[10px] font-bold text-accent">
                              {meta.value}
                            </span>
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

function AlertsTab() {
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

type Campaign = {
  id: string;
  name: string;
  budget: string;
  budgetNum: number;
  clicks: number;
  leads: number;
  cpl: string;
  roi: string;
  status: "Active" | "Paused";
};

function MarketingTab() {
  const [dateRange] = useState({ from: "2026-05-01", to: "2026-05-31" });
  const campaigns: Campaign[] = [
    {
      id: "C-21",
      name: "Bandra Premium — Google",
      budget: "₹2.4L",
      budgetNum: 240000,
      clicks: 4820,
      leads: 64,
      cpl: "₹3,750",
      roi: "3.2x",
      status: "Active",
    },
    {
      id: "C-22",
      name: "Whitefield Villa — Meta",
      budget: "₹1.8L",
      budgetNum: 180000,
      clicks: 3210,
      leads: 41,
      cpl: "₹4,390",
      roi: "2.6x",
      status: "Active",
    },
    {
      id: "C-23",
      name: "Pune Rentals — WhatsApp",
      budget: "₹60K",
      budgetNum: 60000,
      clicks: 1240,
      leads: 28,
      cpl: "₹2,140",
      roi: "4.1x",
      status: "Paused",
    },
  ];
  const [statuses, setStatuses] = useState<Record<string, "Active" | "Paused">>(
    Object.fromEntries(campaigns.map((c) => [c.id, c.status])),
  );
  const toggleStatus = (id: string) => {
    setStatuses((prev) => {
      const next = prev[id] === "Active" ? "Paused" : "Active";
      toast(next === "Paused" ? `Pausing ${id}…` : `Resuming ${id}…`);
      return { ...prev, [id]: next };
    });
  };
  return (
    <>
      <PageHead title="Marketing" subtitle="Campaigns, attribution and creative library." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Spend MTD" value="₹4.8 L" sub="+12% vs last mo" />
        <StatCard label="Leads Generated" value="133" sub="+18 today" />
        <StatCard label="Avg CPL" value="₹3,621" sub="-8% vs last mo" />
      </div>

      {/* Date range display */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Date Range
        </span>
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
                    <Badge tone={statuses[c.id] === "Active" ? "success" : "cold"}>
                      {statuses[c.id]}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => toggleStatus(c.id)}
                      className="text-xs font-semibold text-accent"
                    >
                      {statuses[c.id] === "Active" ? "Pause" : "Resume"}
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
      <PageHead
        title="Developer Partners"
        subtitle="Builder accounts, inventory and white-label settings."
      />
      <Section title="Partnered Builders">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {builders.map((b) => (
            <div key={b.name} className="rounded-lg border border-border p-4">
              <div className="font-display text-lg font-bold text-navy">{b.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{b.count} active listings</div>
              <div className="mt-3">
                <Badge tone={b.partnered ? "success" : "new"}>
                  {b.partnered ? "Partnered" : "Pending MOU"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function ReportsTab() {
  return (
    <ReportsDashboard
      title="Reports"
      subtitle="Calendar-filtered CRM reports — users, subscriptions, visits, agents and tickets."
    />
  );
}

// ─── Masked bank account helper ───────────────────────────────────────────────
const maskedBank: Record<string, string> = {
  "U-21": "HDFC ****4821",
  "U-22": "ICICI ****7293",
  "U-23": "SBI ****0065",
  "U-24": "Axis ****3312",
};
const paymentMethod: Record<string, string> = {
  "U-21": "NEFT",
  "U-22": "IMPS",
  "U-23": "NEFT",
  "U-24": "UPI",
};

function CommissionsTab() {
  const totalEarned = teamMembers.reduce((s, m) => s + m.closedMTD * 0.62, 0);
  const totalPending = teamMembers.reduce((s, m) => s + m.closedMTD * 0.18, 0);
  return (
    <>
      <PageHead title="Commissions" subtitle="Team payouts and ledger." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Payable This Cycle" value="₹6.42 L" sub="Clears 5th" />
        <StatCard label="On Hold" value="₹84,000" sub="Pending KYC" accent="text-amber-600" />
        <StatCard label="YTD Paid" value="₹38.2 L" sub="+₹4.1L vs LY" />
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
                  <td className="font-mono text-xs text-amber-600">
                    ₹{(m.closedMTD * 0.18).toFixed(2)} L
                  </td>
                  <td className="text-xs">{paymentMethod[m.id] ?? "NEFT"}</td>
                  <td className="font-mono text-xs text-muted-foreground">
                    {maskedBank[m.id] ?? "****0000"}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() =>
                        toast.success(`Released ₹${(m.closedMTD * 0.18).toFixed(2)}L to ${m.name}`)
                      }
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
                <td className="font-mono text-xs font-bold text-navy">
                  ₹{totalEarned.toFixed(2)} L
                </td>
                <td className="font-mono text-xs font-bold text-amber-600">
                  ₹{totalPending.toFixed(2)} L
                </td>
                <td colSpan={3}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

function InviteModal({
  onClose,
  onInvite,
}: {
  onClose: () => void;
  onInvite: (m: Member) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Sales Rep");
  const [city, setCity] = useState("Mumbai");
  const [phone, setPhone] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onInvite({
      id: `U-${Math.floor(Math.random() * 900 + 100)}`,
      name: name.trim(),
      email: email.trim(),
      role,
      city,
      status: "Invited",
      phone: phone.trim() || "+91 99999 00000",
      joined: "Jun 2026",
      achieved: 0,
    });
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">
          Invite to NxtSft.com
        </div>
        <h3 className="font-display text-xl font-bold text-navy">Add a new team member</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          They'll receive an email invite with a one-time sign-in link.
        </p>
        <div className="mt-5 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Full name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="e.g. Aisha Khan"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Work email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="aisha@nxtsft.com"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Phone
            </label>
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
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Admin</option>
                <option>Supervisor</option>
                <option>Sales Rep</option>
                <option>Marketing</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                City
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow hover:opacity-95"
          >
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
  const activeCount = subscriptions.filter((s) => s.status === "Active").length;
  const totalUnlocks = unlocks.length;
  const closedDeals = unlocks.filter((u) => u.closed).length;

  const toggleClosed = (id: string) => {
    setUnlocks((prev) => prev.map((u) => (u.id === id ? { ...u, closed: !u.closed } : u)));
    toast.success("Closure status updated");
  };

  const resolveDispute = (id: string) => {
    setDisputeList((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: "Resolved" as const, refundIssued: true } : d,
      ),
    );
    toast.success(`Dispute ${id} resolved and refund issued`);
  };

  return (
    <>
      <PageHead
        title="Subscriptions"
        subtitle="All plan purchases, unlocks, and closure tracking."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          sub={`${subscriptions.length} purchases`}
        />
        <StatCard
          label="Active Plans"
          value={String(activeCount)}
          sub={`${subscriptions.length - activeCount} exhausted`}
        />
        <StatCard label="Contacts Unlocked" value={String(totalUnlocks)} sub="Across all users" />
        <StatCard
          label="Deals Closed"
          value={String(closedDeals)}
          sub={`${totalUnlocks - closedDeals} in progress`}
          accent="text-emerald-600"
        />
      </div>

      <Section title="Plan Purchases">
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Contact</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Credits</th>
                <th>Remaining</th>
                <th>Date</th>
                <th>Status</th>
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
                    <Badge
                      tone={
                        sub.plan === "Premium" ? "new" : sub.plan === "Basic" ? "success" : "warm"
                      }
                    >
                      {sub.plan}
                    </Badge>
                  </td>
                  <td className="font-mono text-sm font-semibold text-navy">₹{sub.amount}</td>
                  <td className="text-center">{sub.creditsTotal}</td>
                  <td
                    className="text-center font-semibold"
                    style={{ color: sub.creditsLeft === 0 ? "var(--color-accent)" : "inherit" }}
                  >
                    {sub.creditsLeft}
                  </td>
                  <td className="text-xs text-muted-foreground">{sub.date}</td>
                  <td>
                    <Badge tone={sub.status === "Active" ? "success" : "cold"}>{sub.status}</Badge>
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
                <th>ID</th>
                <th>User</th>
                <th>Property</th>
                <th>Owner / Phone</th>
                <th>Unlocked At</th>
                <th>Closure</th>
                <th>Action</th>
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
                    <Badge tone={u.closed ? "success" : "warm"}>
                      {u.closed ? "Closed" : "In Progress"}
                    </Badge>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleClosed(u.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                    >
                      {u.closed ? (
                        <>
                          <XCircle size={12} /> Reopen
                        </>
                      ) : (
                        <>
                          <CheckCircle size={12} /> Mark closed
                        </>
                      )}
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
            {disputeList.filter((d) => d.status === "Pending").length} pending
          </Badge>
        }
      >
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Property</th>
                <th>Reason</th>
                <th>Date</th>
                <th>Status</th>
                <th>Refund</th>
                <th></th>
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
                    <Badge tone={d.status === "Resolved" ? "success" : "hot"}>{d.status}</Badge>
                  </td>
                  <td>
                    <Badge tone={d.refundIssued ? "success" : "warm"}>
                      {d.refundIssued ? "Issued" : "Pending"}
                    </Badge>
                  </td>
                  <td>
                    {d.status === "Pending" && (
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
  const [filter, setFilter] = useState("");
  const views = [...propertyViews].sort((a, b) => b.ts.localeCompare(a.ts));
  const filtered = filter
    ? views.filter(
        (v) =>
          v.userName.toLowerCase().includes(filter.toLowerCase()) ||
          v.propertyTitle.toLowerCase().includes(filter.toLowerCase()) ||
          v.city.toLowerCase().includes(filter.toLowerCase()),
      )
    : views;

  const fmtDur = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);
  const uniqueUsers = new Set(views.map((v) => v.userEmail)).size;
  const unlockCount = views.filter((v) => v.contactUnlocked).length;
  const unlockRate = Math.round((unlockCount / views.length) * 100);

  const viewsPerProp: Record<string, { title: string; count: number }> = {};
  for (const v of views) {
    if (!viewsPerProp[v.propertyId])
      viewsPerProp[v.propertyId] = { title: v.propertyTitle.split("—")[0].trim(), count: 0 };
    viewsPerProp[v.propertyId].count++;
  }
  const topProps = Object.entries(viewsPerProp).sort(([, a], [, b]) => b.count - a.count);

  const handleDownloadCSV = () => {
    downloadCSV(
      "property-views.csv",
      [
        "ID",
        "User",
        "Email",
        "Property",
        "City",
        "Viewed At",
        "Duration (s)",
        "Unlocked",
        "Lead ID",
      ],
      views.map((v) => [
        v.id,
        v.userName,
        v.userEmail,
        v.propertyTitle.split("—")[0].trim(),
        v.city,
        v.ts,
        v.durationSec,
        v.contactUnlocked ? "Yes" : "No",
        v.leadId ?? "",
      ]),
    );
  };

  return (
    <>
      <PageHead
        title="Property Views"
        subtitle="Who checked which property — full view analytics."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Views" value={String(views.length)} sub="Last 30 days" />
        <StatCard label="Unique Visitors" value={String(uniqueUsers)} sub="Registered users" />
        <StatCard
          label="Unlock Rate"
          value={`${unlockRate}%`}
          sub="Views → contact unlocked"
          accent="text-emerald-600"
        />
        <StatCard
          label="Leads Linked"
          value={String(views.filter((v) => v.leadId).length)}
          sub="Views tied to a lead"
        />
      </div>

      <Section title="Views by Property">
        <div className="space-y-3">
          {topProps.map(([pid, { title, count }]) => {
            const pct = Math.round((count / views.length) * 100);
            return (
              <div key={pid} className="flex items-center gap-3">
                <Link
                  href={`/properties/${pid}`}
                  className="w-52 shrink-0 truncate text-xs font-semibold text-navy hover:text-accent"
                >
                  {title}
                </Link>
                <div className="flex-1 overflow-hidden rounded-full bg-secondary h-3">
                  <div className="h-3 rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-xs font-bold text-navy">
                  {count}
                </span>
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
                <th>User</th>
                <th>Property</th>
                <th>City</th>
                <th>Viewed At</th>
                <th>Duration</th>
                <th>Unlocked</th>
                <th>Lead</th>
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
                    <Link
                      href={`/properties/${v.propertyId}`}
                      className="block truncate text-sm font-medium text-navy hover:text-accent"
                    >
                      {v.propertyTitle.split("—")[0].trim()}
                    </Link>
                  </td>
                  <td className="text-xs text-muted-foreground">{v.city}</td>
                  <td className="font-mono text-xs text-muted-foreground">{v.ts}</td>
                  <td className="font-mono text-xs">{fmtDur(v.durationSec)}</td>
                  <td>
                    <Badge tone={v.contactUnlocked ? "success" : "cold"}>
                      {v.contactUnlocked ? "Yes" : "No"}
                    </Badge>
                  </td>
                  <td className="font-mono text-xs text-muted-foreground">{v.leadId ?? "—"}</td>
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
   PLANS TAB (Admin — price & description editing)
═══════════════════════════════════════════════════════════ */
type EditablePlan = {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  credits?: number;
  validity: string;
  tagline: string;
  features: string[];
  active: boolean;
  badge?: string | null;
};

function PlanCard({
  plan,
  onSave,
  onToggle,
}: {
  plan: EditablePlan;
  onSave: (updated: EditablePlan) => void;
  onToggle: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditablePlan>(plan);

  const save = () => {
    onSave(draft);
    setEditing(false);
    toast.success(`"${draft.name}" saved`);
  };
  const cancel = () => {
    setDraft(plan);
    setEditing(false);
  };

  return (
    <div
      className={`rounded-2xl border-2 bg-white p-5 shadow-sm transition-all duration-200 ${plan.active ? "border-border" : "border-border/40 opacity-60"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-sm font-bold text-navy">{plan.name}</div>
          {plan.badge && (
            <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              {plan.badge}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onToggle}
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${plan.active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-secondary text-muted-foreground hover:bg-border"}`}
          >
            {plan.active ? "Active" : "Inactive"}
          </button>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:border-accent hover:text-accent transition"
            >
              <Pencil size={12} />
            </button>
          ) : (
            <>
              <button
                onClick={save}
                className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-white hover:opacity-90 transition"
              >
                <Check size={12} />
              </button>
              <button
                onClick={cancel}
                className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-secondary transition"
              >
                <XIcon size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Price (₹)
          </label>
          {editing ? (
            <input
              type="number"
              value={draft.price}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  price: Number(e.target.value),
                  priceLabel: `₹${Number(e.target.value).toLocaleString("en-IN")}`,
                }))
              }
              className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          ) : (
            <div className="mt-1 font-display text-xl font-black text-navy">{plan.priceLabel}</div>
          )}
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Validity
          </label>
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
        <div className="col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Description / Tagline
          </label>
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
    </div>
  );
}

function usePlanGroup(initial: EditablePlan[]) {
  const [plans, setPlans] = useState<EditablePlan[]>(initial);
  const save = (id: string, updated: EditablePlan) =>
    setPlans((ps) => ps.map((p) => (p.id === id ? updated : p)));
  const toggle = (id: string) =>
    setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  return { plans, save, toggle };
}

function AdminPlansTab() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toEditable = (p: Record<string, any>): EditablePlan => ({
    id: p.id,
    name: p.name,
    price: p.price,
    priceLabel: p.priceLabel,
    credits: p.credits,
    validity: p.validity,
    tagline: p.tagline,
    features: [...p.features],
    active: true,
    badge: "badge" in p ? (p.badge ?? null) : null,
  });

  const seekerG = usePlanGroup(seekerPlans.map(toEditable));
  const ownerRentG = usePlanGroup(ownerRentalPlans.map(toEditable));
  const ownerSellG = usePlanGroup(ownerSellPlans.map(toEditable));

  const allPlans = [...seekerG.plans, ...ownerRentG.plans, ...ownerSellG.plans];

  const renderGroup = (title: string, desc: string, group: ReturnType<typeof usePlanGroup>) => (
    <Section title={title} key={title}>
      <p className="mb-4 text-sm text-muted-foreground">{desc}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSave={(updated) => group.save(plan.id, updated)}
            onToggle={() => group.toggle(plan.id)}
          />
        ))}
      </div>
    </Section>
  );

  return (
    <>
      <PageHead
        title="Plans Manager"
        subtitle="Edit plan prices and descriptions across all customer segments."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total Plans"
          value={String(allPlans.length)}
          sub={`${allPlans.filter((p) => p.active).length} active`}
        />
        <StatCard label="Plan Groups" value="3" sub="Seeker · Owner Rent · Owner Sell" />
        <StatCard label="MRR from Plans" value="₹12.4 Cr" sub="↑ +8.4% this month" />
      </div>

      <div className="mt-6 space-y-6">
        {renderGroup(
          "Seeker Plans",
          "Credit-based contact unlock plans for home buyers and renters.",
          seekerG,
        )}
        {renderGroup(
          "Owner Rental Plans",
          "Listing plans for landlords looking to find tenants.",
          ownerRentG,
        )}
        {renderGroup(
          "Owner Sell Plans",
          "Listing plans for property sellers, brokers and developers.",
          ownerSellG,
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => toast.success("Plan changes submitted for super admin approval")}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition"
        >
          Submit Changes for Approval →
        </button>
      </div>
    </>
  );
}
