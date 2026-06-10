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
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import {
  leads,
  teamMembers,
  properties,
  activities,
  unlockedContacts,
  disputes as disputeData,
  seekerPlans,
  ownerRentalPlans,
  ownerSellPlans,
} from "@/data/static";
import { ReportsDashboard } from "@/components/portal/ReportsDashboard";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useRouter } from "next/navigation";

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

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  city: string;
  verified: boolean;
  joined: string;
};

type NewMemberInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "admin" | "supervisor" | "sales" | "support-admin";
  city: string;
};

const ROLE_LABEL: Record<string, string> = {
  "super-admin": "Super Admin",
  admin: "Admin",
  supervisor: "Supervisor",
  sales: "Sales Rep",
  "support-admin": "Support Admin",
};

export default function AdminPortal() {
  const { session } = useAuth();
  const router = useRouter();
  const hash = useActiveHash();

  useEffect(() => {
    if (session !== undefined && !session) router.push("/admin-login");
  }, [session, router]);

  if (!session) return null;

  const user = { name: session.name, initials: session.initials };

  return (
    <PortalShell
      brand="NxtSft.com Control"
      role="Admin"
      accent="red"
      user={user}
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
  const statsQ = trpc.admin.stats.useQuery();
  const s = statsQ.data;

  const fmtRevenue = (r: number) =>
    r >= 1e7 ? `₹${(r / 1e7).toFixed(1)} Cr` : r >= 1e5 ? `₹${(r / 1e5).toFixed(1)} L` : `₹${r.toLocaleString("en-IN")}`;

  return (
    <>
      <PageHead
        title="Operations Overview"
        subtitle="Pulse of all NxtSft.com ops — refreshed every 30 seconds."
      />

      {/* 8-card stat grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Revenue" value={s ? fmtRevenue(s.totalRevenue) : "…"} sub="from verified payments" />
        <StatCard label="Open Leads" value={s ? String(s.totalLeads) : "…"} sub={s ? `${s.hotLeads} hot` : "loading"} />
        <StatCard label="Active Listings" value={s ? String(s.activeListings) : "…"} sub={s ? `of ${s.totalProperties} total` : "loading"} accent="text-amber-600" />
        <StatCard
          label="Hot Leads"
          value={s ? String(s.hotLeads) : "…"}
          sub="need immediate action"
          accent="text-accent"
        />
        <StatCard label="Total Properties" value={s ? String(s.totalProperties) : "…"} sub="across all cities" />
        <StatCard
          label="Registered Users"
          value={s ? String(s.totalUsers) : "…"}
          sub="buyers + staff"
          accent="text-emerald-600"
        />
        <StatCard label="Avg Deal Size" value="₹52 L" sub="static — wire later" />
        <StatCard label="Team Size" value={s ? String(s.totalUsers) : "…"} sub="all roles" />
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

function TeamTab() {
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const teamQ = trpc.admin.teamMembers.useQuery({
    role: roleFilter ? (roleFilter as NewMemberInput["role"]) : undefined,
    search: search || undefined,
  });
  const members = (teamQ.data ?? []) as unknown as TeamMember[];

  const createMember = trpc.admin.createTeamMember.useMutation({
    onSuccess: () => {
      teamQ.refetch();
      setShowInvite(false);
      toast.success("Team member added");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [showInvite, setShowInvite] = useState(false);

  return (
    <>
      <PageHead title="Team Management" subtitle={`${members.length} staff member${members.length !== 1 ? "s" : ""}`} />
      <Section
        title="Active Roster"
        action={
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / email…"
              className="rounded-md border border-border bg-white px-3 py-1.5 text-xs outline-none focus:border-accent"
            />
            <Select value={roleFilter || "__all"} onValueChange={(v) => setRoleFilter(v === "__all" ? "" : v)}>
              <SelectTrigger size="sm" className="min-w-[8.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All roles</SelectItem>
                {["admin", "supervisor", "sales", "support-admin"].map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => setShowInvite(true)}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
            >
              + Add Member
            </button>
          </div>
        }
      >
        {teamQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading team…</p>
        ) : members.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No team members match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2">Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>City</th>
                  <th>Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="font-semibold text-navy">{m.name}</td>
                    <td className="text-xs text-muted-foreground">{m.email}</td>
                    <td className="font-mono text-xs text-muted-foreground">{m.phone}</td>
                    <td className="text-xs">{ROLE_LABEL[m.role] ?? m.role}</td>
                    <td className="text-xs">{m.city}</td>
                    <td className="text-xs text-muted-foreground">{new Date(m.joined).toLocaleDateString("en-IN")}</td>
                    <td><Badge tone={m.verified ? "success" : "new"}>{m.verified ? "Active" : "Invited"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      {showInvite && (
        <InviteModal
          pending={createMember.isPending}
          onClose={() => setShowInvite(false)}
          onCreate={(m) => createMember.mutate(m)}
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
  isDbProperty?: boolean;
  rera?: string | null;
  locality?: string;
  listerEmail?: string;
  listerPhone?: string;
  submittedAt?: string;
  purpose?: string;
  area?: string;
};

function ListingsTab() {
  const dbListingsQ = trpc.admin.properties.list.useQuery({ limit: 50 });
  const approveMutation = trpc.admin.properties.approve.useMutation({
    onSuccess: () => {
      void dbListingsQ.refetch();
      toast.success("Property approved and set to Active.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const [localItems, setLocalItems] = useState<ListingItem[]>([]);

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
    setLocalItems(userSubs);
  }, []);

  type RawProp = { id: string; title: string; images: string[]; owner: { name: string } | null; location: { city: string } | null; price: number; bhk: string | null; status: string; rera: string | null; slug: string };
  const dbItems: ListingItem[] = ((dbListingsQ.data?.items ?? []) as RawProp[]).map((p) => ({
    id: p.id,
    title: p.title,
    image: p.images?.[0] ?? "",
    builder: p.owner?.name ?? "",
    city: p.location?.city ?? "",
    priceLabel: p.price >= 1e7
      ? `₹${(p.price / 1e7).toFixed(2)} Cr`
      : p.price >= 1e5
      ? `₹${(p.price / 1e5).toFixed(1)} L`
      : `₹${p.price.toLocaleString("en-IN")}`,
    bhk: p.bhk ?? "",
    status: (p.status === "Active" ? "Approved" : p.status === "Sold" || p.status === "Rented" ? "Approved" : "Pending") as "Pending" | "Approved" | "Rejected",
    isDbProperty: true,
    rera: p.rera,
  }));

  const items = [...localItems, ...dbItems];

  const approve = (it: ListingItem) => {
    if (it.isUserSubmission) {
      setLocalItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, status: "Approved" } : x)));
      persistListingStatus(it.id, "approved");
      toast.success(`Approved: ${it.title}`);
    } else {
      approveMutation.mutate({ id: it.id });
    }
  };

  const reject = (it: ListingItem) => {
    if (it.isUserSubmission) {
      setLocalItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, status: "Rejected" } : x)));
      persistListingStatus(it.id, "rejected");
    }
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
  const dbLeadsQ = trpc.admin.leads.list.useQuery({ limit: 50, status: filter === "All" ? undefined : filter });
  const dbLeads = dbLeadsQ.data?.items ?? [];

  // Merge DB leads (primary) with static leads as fallback
  const displayLeads = dbLeads.length > 0 ? dbLeads : (
    filter === "All" ? leads : leads.filter((l) => l.status === filter)
  );

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
        {dbLeadsQ.isLoading && (
          <div className="mt-4 text-sm text-muted-foreground">Loading leads…</div>
        )}
        <div className="mt-5 overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th>
                <th>Lead</th>
                <th>Property</th>
                <th>Source</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dbLeads.length > 0 ? dbLeads.map((l) => (
                <tr key={l.id}>
                  <td className="font-mono text-[11px]">{l.id.slice(0, 8)}…</td>
                  <td>
                    <div className="font-semibold text-navy">{l.user?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{l.user?.email}</div>
                  </td>
                  <td className="text-xs">{l.property?.title ?? "—"}</td>
                  <td>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-navy">
                      {l.source ?? "Portal"}
                    </span>
                  </td>
                  <td className="text-xs">{l.assignedToId ? l.assignedToId.slice(0, 8) + "…" : "Unassigned"}</td>
                  <td>
                    <Badge tone={(l.status?.toLowerCase() ?? "new") as "hot" | "warm" | "cold" | "new"}>
                      {l.status ?? "New"}
                    </Badge>
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {new Date(l.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => toast.success(`Assigning lead…`)}
                      className="text-xs font-semibold text-accent"
                    >
                      Assign →
                    </button>
                  </td>
                </tr>
              )) : (leads.filter((l) => filter === "All" || l.status === filter)).map((l) => (
                <tr key={l.id}>
                  <td className="font-mono text-xs">{l.id}</td>
                  <td>
                    <div className="font-semibold text-navy">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.phone}</div>
                  </td>
                  <td className="text-xs">{l.interest}</td>
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

// Kanban columns map to the real Lead.status enum values
const CRM_STAGES = ["New", "Hot", "Warm", "Cold", "Converted", "Lost"] as const;
type CrmStage = (typeof CRM_STAGES)[number];

const stageAccent: Record<CrmStage, string> = {
  New: "border-t-sky-400",
  Hot: "border-t-red-500",
  Warm: "border-t-amber-500",
  Cold: "border-t-blue-400",
  Converted: "border-t-emerald-500",
  Lost: "border-t-zinc-400",
};

type CrmLead = {
  id: string;
  name: string;
  city: string | null;
  status: string;
  value: number | null;
  interest: string | null;
  property: { id: string; title: string; slug: string } | null;
};

function CRMTab() {
  const leadsQ = trpc.admin.leads.list.useQuery({ limit: 100 });
  const updateStatus = trpc.leads.updateStatus.useMutation({
    onSuccess: () => leadsQ.refetch(),
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const leads = (leadsQ.data?.items ?? []) as unknown as CrmLead[];

  const fmtValue = (v: number | null) =>
    v == null ? "—" : v >= 1e7 ? `₹${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(1)}L` : `₹${v.toLocaleString("en-IN")}`;

  const move = (id: string, status: CrmStage) =>
    updateStatus.mutate({ id, status }, { onSuccess: () => toast.success(`Moved to ${status}`) });

  return (
    <>
      <PageHead title="CRM Pipeline" subtitle="Lead funnel across all teams — move a lead to update its stage." />
      <Section title="Pipeline — All Teams" action={<Badge tone="new">{leads.length} leads</Badge>}>
        {leadsQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading pipeline…</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {CRM_STAGES.map((stage) => {
              const items = leads.filter((l) => l.status === stage);
              return (
                <div key={stage} className={`rounded-lg border-t-4 bg-secondary/60 p-3 ${stageAccent[stage]}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-navy">{stage}</span>
                    <span className="rounded-full bg-white px-1.5 text-[10px] font-bold text-mid-blue">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((l) => (
                      <div key={l.id} className="rounded-md bg-white p-2.5 text-xs shadow-sm">
                        <div className="font-semibold leading-tight text-navy">{l.name}</div>
                        <div className="mt-0.5 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">{l.city ?? "—"}</span>
                          <span className="font-mono text-[10px] font-bold text-accent">{fmtValue(l.value)}</span>
                        </div>
                        {l.property && (
                          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{l.property.title}</div>
                        )}
                        <Select value={l.status} onValueChange={(v) => move(l.id, v as CrmStage)} disabled={updateStatus.isPending}>
                          <SelectTrigger size="sm" className="mt-2 w-full px-1.5 py-1 text-[10px] font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CRM_STAGES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="py-2 text-center text-[10px] text-muted-foreground">Empty</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

const INVITE_ROLES: { label: string; value: NewMemberInput["role"] }[] = [
  { label: "Admin", value: "admin" },
  { label: "Supervisor", value: "supervisor" },
  { label: "Sales Rep", value: "sales" },
  { label: "Support Admin", value: "support-admin" },
];

function InviteModal({
  onClose,
  onCreate,
  pending,
}: {
  onClose: () => void;
  onCreate: (m: NewMemberInput) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<NewMemberInput["role"]>("sales");
  const [city, setCity] = useState("Mumbai");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Enter the member's full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Enter a valid email.");
    if (!/^[6-9]\d{9}$/.test(phone)) return toast.error("Enter a valid 10-digit Indian mobile number.");
    if (password.length < 8) return toast.error("Temporary password must be at least 8 characters.");
    onCreate({ name: name.trim(), email: email.trim(), phone, password, role, city });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-accent">
          Add to NxtSft.com
        </div>
        <h3 className="font-display text-xl font-bold text-navy">Add a new team member</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Creates a verified staff account they can sign in with immediately.
        </p>
        <div className="mt-5 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="aisha@nxtsft.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Phone (10-digit)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="9876543210"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Temp password</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="min 8 chars"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Role</label>
              <Select value={role} onValueChange={(v) => setRole(v as NewMemberInput["role"])}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">City</label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Mumbai", "Bengaluru", "Pune", "Delhi", "Hyderabad", "Chennai"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow hover:opacity-95 disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add member"}
          </button>
        </div>
      </form>
    </div>
  );
}

type AdminSub = {
  id: string;
  planName: string;
  amount: number; // paise
  status: string;
  cycle: string;
  startDate: string;
  endDate: string;
  renewalDate: string | null;
  user: { id: string; name: string; email: string } | null;
};

function SubscriptionsTab() {
  const [statusFilter, setStatusFilter] = useState("");
  const subQ = trpc.subscriptions.adminList.useQuery({ status: statusFilter || undefined, limit: 100 });
  const subs = (subQ.data?.items ?? []) as unknown as AdminSub[];
  const cancelSub = trpc.subscriptions.cancel.useMutation({
    onSuccess: () => { subQ.refetch(); toast.success("Subscription cancelled"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [unlocks, setUnlocks] = useState(unlockedContacts.map((u) => ({ ...u })));
  const [disputeList, setDisputeList] = useState(disputeData.map((d) => ({ ...d })));

  const totalRevenue = subs.reduce((s, sub) => s + sub.amount, 0) / 100;
  const activeCount = subs.filter((s) => s.status === "Active").length;
  const totalUnlocks = unlocks.length;
  const closedDeals = unlocks.filter((u) => u.closed).length;

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

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
        <StatCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} sub={`${subs.length} subscription${subs.length !== 1 ? "s" : ""}`} />
        <StatCard label="Active Plans" value={String(activeCount)} sub={`${subs.length - activeCount} inactive`} />
        <StatCard label="Contacts Unlocked" value={String(totalUnlocks)} sub="Across all users" />
        <StatCard
          label="Deals Closed"
          value={String(closedDeals)}
          sub={`${totalUnlocks - closedDeals} in progress`}
          accent="text-emerald-600"
        />
      </div>

      <Section
        title="Plan Purchases"
        action={
          <Select value={statusFilter || "__all"} onValueChange={(v) => setStatusFilter(v === "__all" ? "" : v)}>
            <SelectTrigger size="sm" className="min-w-[9rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All statuses</SelectItem>
              {["Active", "Cancelled", "Expired", "Failed"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        {subQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading subscriptions…</p>
        ) : subs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No subscriptions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Cycle</th>
                  <th>Start</th>
                  <th>Renewal</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <div className="font-semibold text-navy">{sub.user?.name ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{sub.user?.email ?? ""}</div>
                    </td>
                    <td><Badge tone="new">{sub.planName}</Badge></td>
                    <td className="font-mono text-sm font-semibold text-navy">₹{(sub.amount / 100).toLocaleString("en-IN")}</td>
                    <td className="text-xs">{sub.cycle}</td>
                    <td className="text-xs text-muted-foreground">{fmtDate(sub.startDate)}</td>
                    <td className="text-xs text-muted-foreground">{sub.renewalDate ? fmtDate(sub.renewalDate) : "—"}</td>
                    <td><Badge tone={sub.status === "Active" ? "success" : "cold"}>{sub.status}</Badge></td>
                    <td className="text-right">
                      {sub.status === "Active" ? (
                        <button
                          onClick={() => cancelSub.mutate({ subscriptionId: sub.id })}
                          disabled={cancelSub.isPending}
                          className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

type ViewRecord = {
  id: string;
  durationSec: number;
  contactUnlocked: boolean;
  createdAt: string;
  viewer: string;
  property: {
    id: string; slug: string; title: string; bhk: string | null; price: number;
    images: string[]; location: { city: string; locality: string } | null;
  } | null;
};

function ViewsTab() {
  const [filter, setFilter] = useState("");
  const viewsQ = trpc.propertyViews.analytics.useQuery({ limit: 200 });
  const views = (viewsQ.data?.items ?? []) as unknown as ViewRecord[];
  const totalViews = viewsQ.data?.totalViews ?? 0;
  const unlockedViews = viewsQ.data?.unlockedViews ?? 0;

  const filtered = filter
    ? views.filter(
        (v) =>
          v.viewer.toLowerCase().includes(filter.toLowerCase()) ||
          (v.property?.title ?? "").toLowerCase().includes(filter.toLowerCase()) ||
          (v.property?.location?.city ?? "").toLowerCase().includes(filter.toLowerCase()),
      )
    : views;

  const fmtDur = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);
  const fmtWhen = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const uniqueUsers = new Set(views.map((v) => v.viewer)).size;
  const unlockRate = totalViews ? Math.round((unlockedViews / totalViews) * 100) : 0;

  const viewsPerProp: Record<string, { title: string; slug: string; count: number }> = {};
  for (const v of views) {
    if (!v.property) continue;
    if (!viewsPerProp[v.property.id])
      viewsPerProp[v.property.id] = { title: v.property.title, slug: v.property.slug, count: 0 };
    viewsPerProp[v.property.id].count++;
  }
  const topProps = Object.entries(viewsPerProp).sort(([, a], [, b]) => b.count - a.count).slice(0, 8);
  const maxCount = topProps.length ? topProps[0][1].count : 1;

  const handleDownloadCSV = () => {
    downloadCSV(
      "property-views.csv",
      ["ID", "Viewer", "Property", "City", "Viewed At", "Duration (s)", "Unlocked"],
      views.map((v) => [
        v.id,
        v.viewer,
        v.property?.title ?? "",
        v.property?.location?.city ?? "",
        fmtWhen(v.createdAt),
        v.durationSec,
        v.contactUnlocked ? "Yes" : "No",
      ]),
    );
  };

  return (
    <>
      <PageHead title="Property Views" subtitle="Who checked which property — full view analytics." />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Views" value={String(totalViews)} sub="all time" />
        <StatCard label="Unique Viewers" value={String(uniqueUsers)} sub="in recent sample" />
        <StatCard label="Unlock Rate" value={`${unlockRate}%`} sub="views → contact unlocked" accent="text-emerald-600" />
        <StatCard label="Contacts Unlocked" value={String(unlockedViews)} sub="total" />
      </div>

      {viewsQ.isLoading ? (
        <Section title="Views by Property"><p className="py-8 text-center text-sm text-muted-foreground">Loading…</p></Section>
      ) : views.length === 0 ? (
        <Section title="View Records"><p className="py-8 text-center text-sm text-muted-foreground">No property views recorded yet.</p></Section>
      ) : (
        <>
          <Section title="Views by Property">
            <div className="space-y-3">
              {topProps.map(([pid, { title, slug, count }]) => {
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={pid} className="flex items-center gap-3">
                    <Link href={`/properties/${slug}`} className="w-52 shrink-0 truncate text-xs font-semibold text-navy hover:text-accent">
                      {title}
                    </Link>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
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
                  placeholder="Search viewer or property…"
                  className="rounded-md border border-border bg-white px-3 py-1.5 text-xs outline-none focus:border-accent"
                />
                <button onClick={handleDownloadCSV} className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-accent">
                  Download CSV
                </button>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Viewer</th>
                    <th>Property</th>
                    <th>City</th>
                    <th>Viewed At</th>
                    <th>Duration</th>
                    <th>Unlocked</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => (
                    <tr key={v.id}>
                      <td className="font-semibold text-navy">{v.viewer}</td>
                      <td className="max-w-[200px]">
                        {v.property ? (
                          <Link href={`/properties/${v.property.slug}`} className="block truncate text-sm font-medium text-navy hover:text-accent">
                            {v.property.title}
                          </Link>
                        ) : <span className="text-xs text-muted-foreground">removed</span>}
                      </td>
                      <td className="text-xs text-muted-foreground">{v.property?.location?.city ?? "—"}</td>
                      <td className="font-mono text-xs text-muted-foreground">{fmtWhen(v.createdAt)}</td>
                      <td className="font-mono text-xs">{v.durationSec > 0 ? fmtDur(v.durationSec) : "—"}</td>
                      <td><Badge tone={v.contactUnlocked ? "success" : "cold"}>{v.contactUnlocked ? "Yes" : "No"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
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
