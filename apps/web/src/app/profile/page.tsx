"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Home,
  Heart,
  Calendar,
  Calculator,
  MessageCircle,
  Bell,
  Phone,
  Mail,
  MapPin,
  Shield,
  LogOut,
  Edit2,
  ChevronRight,
  CheckCircle2,
  Clock,
  Star,
  Sparkles,
  Building2,
  CreditCard,
  BarChart2,
  Settings2,
  Users,
  Smartphone,
  Target,
  FolderOpen,
  RefreshCcw,
  Satellite,
  type LucideIcon,
} from "lucide-react";
import { ROLE_META, useAuth, type Role } from "@/lib/auth";
import { trpc } from "@/lib/trpc";

/* ── per-role quick actions ─────────────────────────────────────── */
const roleActions: Record<Role, Array<{ label: string; to: string; Icon: LucideIcon }>> = {
  "super-admin": [
    { label: "Command Deck", to: "/sa-portal", Icon: Satellite },
    { label: "Tenants", to: "/sa-portal", Icon: Building2 },
    { label: "Billing", to: "/sa-portal#bill", Icon: CreditCard },
  ],
  admin: [
    { label: "Control Panel", to: "/admin-portal", Icon: Settings2 },
    { label: "Approve Listings", to: "/admin-portal#listings", Icon: CheckCircle2 },
    { label: "Pipeline", to: "/admin-portal#crm", Icon: BarChart2 },
  ],
  supervisor: [
    { label: "Desk", to: "/supervisor-portal", Icon: FolderOpen },
    { label: "Reassign Leads", to: "/supervisor-portal#reassign", Icon: RefreshCcw },
    { label: "Team Activity", to: "/supervisor-portal#activity", Icon: Users },
  ],
  sales: [
    { label: "Field App", to: "/sales-portal", Icon: Smartphone },
    { label: "My Leads", to: "/sales-portal", Icon: Target },
    { label: "Today's Calls", to: "/sales-portal#call", Icon: Phone },
  ],
  user: [
    { label: "My Dashboard", to: "/user-portal", Icon: Home },
    { label: "Shortlist", to: "/user-portal#saved", Icon: Heart },
    { label: "Book a Visit", to: "/user-portal#visits", Icon: Calendar },
    { label: "EMI Calculator", to: "/user-portal#emi", Icon: Calculator },
    { label: "Talk to us", to: "/contact", Icon: MessageCircle },
  ],
  customer: [
    { label: "My Concierge", to: "/user-portal", Icon: Sparkles },
    { label: "My Visits", to: "/user-portal#visits", Icon: Calendar },
    { label: "Talk to advisor", to: "/contact", Icon: MessageCircle },
  ],
  "support-admin": [
    { label: "Support Portal", to: "/support-portal", Icon: MessageCircle },
    { label: "Ticket Queue", to: "/support-portal#queue", Icon: FolderOpen },
    { label: "TAT Report", to: "/support-portal#tat", Icon: BarChart2 },
  ],
};

/* ── per-role stats ─────────────────────────────────────────────── */
const roleStats: Record<Role, Array<{ label: string; value: string; sub?: string }>> = {
  "super-admin": [
    { label: "Tenants", value: "42", sub: "3 new this month" },
    { label: "Global Users", value: "12,480", sub: "+218 this week" },
    { label: "Uptime", value: "99.98%", sub: "Last 30 days" },
    { label: "Revenue YTD", value: "₹142 Cr", sub: "+18% vs last year" },
  ],
  admin: [
    { label: "Active Listings", value: "1,840", sub: "42 pending review" },
    { label: "Open Leads", value: "328", sub: "18 hot this week" },
    { label: "Team Size", value: "24", sub: "2 onboarding" },
    { label: "Conversion", value: "6.8%", sub: "+0.4% vs last month" },
  ],
  supervisor: [
    { label: "Team Size", value: "8", sub: "Active agents" },
    { label: "Open Leads", value: "62", sub: "9 due today" },
    { label: "MTD Closed", value: "14", sub: "Target: 20" },
    { label: "Avg Response", value: "11 min", sub: "Team average" },
  ],
  sales: [
    { label: "Open Leads", value: "14", sub: "3 hot" },
    { label: "Closed MTD", value: "4", sub: "Target: 6" },
    { label: "Target", value: "72%", sub: "8 days remaining" },
    { label: "Commission", value: "₹1.24 L", sub: "This month" },
  ],
  user: [
    { label: "Shortlisted", value: "6", sub: "2 new matches" },
    { label: "Site Visits", value: "3", sub: "1 upcoming" },
    { label: "Pre-approved EMI", value: "₹1.8 Cr", sub: "Valid 90 days" },
    { label: "KYC", value: "Verified", sub: "All docs OK" },
  ],
  customer: [
    { label: "Saved Homes", value: "9", sub: "4 new this week" },
    { label: "Visits Booked", value: "2", sub: "1 upcoming" },
    { label: "Concierge Tier", value: "Gold", sub: "Renews in 22 d" },
    { label: "KYC", value: "Verified", sub: "All docs OK" },
  ],
  "support-admin": [
    { label: "Open Tickets", value: "5", sub: "action needed" },
    { label: "Resolved", value: "11", sub: "this period" },
    { label: "Within TAT", value: "82%", sub: "TAT compliance" },
    { label: "Escalated", value: "1", sub: "SLA breach risk" },
  ],
};

/* ── activity feed ──────────────────────────────────────────────── */
const ACTIVITY_LABELS: Record<string, string> = {
  "auth.login": "Signed in",
  "profile.updated": "Updated profile details",
  "notifications.updated": "Updated notification preferences",
  "property.favorited": "Saved a property",
};

function activityText(action: string) {
  return ACTIVITY_LABELS[action] ?? action.replace(/[._]/g, " ");
}

function activityDot(action: string) {
  if (action === "property.favorited") return "bg-accent";
  if (action.startsWith("auth")) return "bg-emerald-500";
  return "bg-muted-foreground";
}

function relativeTime(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ── preference toggle ──────────────────────────────────────────── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 ${on ? "bg-accent" : "bg-border"}`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${on ? "left-6" : "left-1"}`}
      />
    </button>
  );
}

export default function ProfilePage() {
  const { session, signOut, updateProfile } = useAuth();
  const router = useRouter();

  const updateProfileMutation = trpc.users.updateProfile.useMutation();
  const activityQ = trpc.users.recentActivity.useQuery(undefined, { enabled: !!session });
  const prefsQ = trpc.users.notificationPrefs.useQuery(undefined, { enabled: !!session });
  const updatePrefs = trpc.users.updateNotificationPrefs.useMutation({
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [prefs, setPrefs] = useState({
    email: true,
    whatsapp: true,
    sms: false,
    marketing: false,
  });

  useEffect(() => {
    if (session) {
      setName(session.name);
      setPhone(session.phone);
    }
  }, [session]);

  useEffect(() => {
    if (prefsQ.data) setPrefs(prefsQ.data);
  }, [prefsQ.data]);

  if (!session) {
    return (
      <div className="min-h-screen bg-[oklch(0.97_0.01_260)] flex items-center justify-center px-4 pb-24 md:pb-0">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl font-black text-navy mb-3">
            Sign in to view profile
          </h1>
          <p className="text-muted-foreground mb-6">
            Access your account details, security settings, and more.
          </p>
          <div className="flex gap-3 flex-col">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-sm shadow-accent/20 transition hover:-translate-y-0.5 hover:opacity-95"
            >
              Sign in as Buyer
            </Link>
            <Link
              href="/admin-login"
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 py-3 text-sm font-bold text-foreground transition hover:bg-secondary"
            >
              Sign in as Staff
            </Link>
          </div>
          <Link href="/" className="block mt-4 text-sm text-accent hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const meta = ROLE_META[session.role];
  const stats = roleStats[session.role];
  const actions = roleActions[session.role];

  const saveProfile = async () => {
    const newName = name.trim() || session!.name;
    const newPhone = phone.trim() || session!.phone;
    setEditing(false);
    try {
      await updateProfileMutation.mutateAsync({ name: newName, phone: newPhone });
    } catch {
      // local update still succeeds if server fails transiently
    }
    updateProfile(newName, newPhone);
    toast.success("Profile updated");
  };

  const togglePref = (key: keyof typeof prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); // optimistic
    updatePrefs.mutate(next, {
      onSuccess: () =>
        toast.success(
          `${key.charAt(0).toUpperCase() + key.slice(1)} notifications ${next[key] ? "enabled" : "disabled"}`,
        ),
      onError: () => setPrefs(prefs), // revert on failure
    });
  };

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.01_260)] pb-24 md:pb-0">
      {/* Hero panel */}
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6 sm:pt-10">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-navy via-navy-deep to-navy p-6 shadow-xl sm:p-9">
          {/* dot-grid texture */}
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.45) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          {/* glow orbs + sheen */}
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-tr from-transparent via-white/[0.05] to-transparent" />

          <div className="relative z-10">
            {/* Identity row */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-linear-to-br from-accent to-cyan-500 font-display text-3xl font-black text-white shadow-2xl ring-4 ring-white/15">
                  {session.initials}
                </div>
                <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-navy">
                  <CheckCircle2 size={12} className="text-white" strokeWidth={3} />
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent ring-1 ring-accent/30">
                    {meta.label}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Active
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
                    {meta.portalName}
                  </span>
                </div>
                <h1 className="mt-2 font-display text-3xl font-black text-white sm:text-4xl">
                  {session.name}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-white/60">
                  <MapPin size={13} />
                  {session.city} · Member since {session.joined}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
                <Link
                  href={meta.portal}
                  className="flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent/25 transition hover:-translate-y-0.5 hover:opacity-95"
                >
                  Open Portal <ChevronRight size={14} />
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    router.push("/");
                    toast.success("Signed out");
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>

            {/* Stats as glass tiles */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {stats.map(({ label, value, sub }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-md transition hover:border-white/25 hover:bg-white/12"
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                    {label}
                  </div>
                  <div className="mt-1.5 font-display text-2xl font-black text-white sm:text-3xl">
                    {value}
                  </div>
                  {sub && <div className="mt-1 text-[11px] text-white/45">{sub}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        {/* Body */}
        <div className="mt-10 grid gap-8 lg:grid-cols-3 lg:items-start">
          {/* Left column */}
          <div className="space-y-5 lg:col-span-2">
            {/* Account details */}
            <div className="rounded-2xl border border-border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <h2 className="font-display text-lg font-bold text-navy">Account Details</h2>
                <button
                  onClick={() => (editing ? saveProfile() : setEditing(true))}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/5"
                >
                  <Edit2 size={13} />
                  {editing ? "Save" : "Edit"}
                </button>
              </div>

              <div className="px-6 py-6">
                {/* Contact section */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                    Contact
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Full Name
                      </label>
                      {editing ? (
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm font-medium text-navy focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        />
                      ) : (
                        <div className="text-sm font-medium text-navy">{session.name}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Email
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-navy">{session.email}</span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-bold text-emerald-700">
                          Verified
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Phone
                      </label>
                      {editing ? (
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm font-medium text-navy focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        />
                      ) : (
                        <div className="text-sm font-medium text-navy">{session.phone}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Organization section */}
                <div className="border-t border-border pt-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                    Organization
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Role
                      </label>
                      <div className="text-sm font-medium text-navy">{meta.label}</div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Workspace
                      </label>
                      <div className="text-sm font-medium text-navy">{meta.portalName}</div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        City
                      </label>
                      <div className="text-sm font-medium text-navy">{session.city}</div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Member Since
                      </label>
                      <div className="text-sm font-medium text-navy">{session.joined}</div>
                    </div>
                  </div>
                </div>
              </div>

              {editing && (
                <div className="border-t border-border px-6 py-4 flex gap-2">
                  <button
                    onClick={saveProfile}
                    className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Security */}
            <SecurityPanel />

            {/* Activity */}
            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
              <div className="border-b border-border px-6 py-5">
                <h2 className="font-display text-sm font-bold text-navy uppercase tracking-wide">
                  Recent Activity
                </h2>
              </div>
              {activityQ.isLoading ? (
                <p className="px-6 py-6 text-sm text-muted-foreground">Loading activity…</p>
              ) : (activityQ.data?.length ?? 0) === 0 ? (
                <p className="px-6 py-6 text-sm text-muted-foreground">No recent activity yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {activityQ.data!.map((a) => (
                    <li
                      key={a.id}
                      className="relative flex items-start gap-4 px-6 py-4 first:pt-0 last:pb-0"
                    >
                      <span
                        className={`relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white ${activityDot(a.action)}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-navy">
                          {activityText(a.action)}
                        </div>
                        <div className="mt-1 font-mono text-xs text-muted-foreground">
                          {relativeTime(a.createdAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right column */}
          <aside className="space-y-6">
            {/* Quick actions */}
            <div className="rounded-2xl bg-gradient-to-br from-navy via-navy-deep to-navy-deep p-6 text-white shadow-sm overflow-hidden relative">
              <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
              <div className="relative z-10">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-4">
                  Quick Access
                </h3>
                <div className="grid gap-2">
                  {actions.map(({ label, to, Icon }) => (
                    <Link
                      key={label}
                      href={to}
                      className="group flex items-center gap-3 rounded-lg bg-white/8 px-4 py-3 text-sm font-medium transition hover:bg-white/12"
                    >
                      <Icon
                        size={16}
                        strokeWidth={1.5}
                        className="text-white/70 group-hover:text-accent transition"
                      />
                      <span className="flex-1">{label}</span>
                      <ChevronRight
                        size={14}
                        className="text-white/40 group-hover:text-white/60 transition"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
              <div className="border-b border-border px-6 py-4 flex items-center gap-2">
                <Bell size={16} className="text-accent" />
                <h3 className="font-display text-sm font-bold text-navy">
                  Notification Preferences
                </h3>
              </div>
              <div className="px-6 py-5 space-y-4">
                {(
                  [
                    ["Email alerts", "email", Mail],
                    ["WhatsApp updates", "whatsapp", MessageCircle],
                    ["SMS alerts", "sms", Phone],
                    ["Marketing emails", "marketing", Star],
                  ] as [string, keyof typeof prefs, LucideIcon][]
                ).map(([label, key, Icon]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5 text-sm text-navy">
                      <Icon size={14} className="text-slate-400" />
                      {label}
                    </span>
                    <Toggle on={prefs[key]} onToggle={() => togglePref(key)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Switch role */}
            <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Switch Role
              </div>
              <p className="text-xs text-muted-foreground mb-4">Try another role and workspace.</p>
              <Link
                href="/admin-login"
                className="inline-flex items-center gap-2 rounded-lg border border-accent bg-white px-4 py-2 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white"
              >
                Change role <ChevronRight size={13} />
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <div className="mt-16" />
    </div>
  );
}

/* ─── Security panel (change password · 2FA · active sessions) ─── */
type SessionRow = {
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
};

function SecurityPanel() {
  const meQ = trpc.users.me.useQuery();
  const sessionsQ = trpc.users.sessions.useQuery();

  const changePassword = trpc.users.changePassword.useMutation({
    onSuccess: () => {
      setPw({ current: "", next: "", confirm: "" });
      setShowPw(false);
      toast.success("Password updated");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const terminate = trpc.users.terminateSession.useMutation({
    onSuccess: () => {
      sessionsQ.refetch();
      toast.success("Session signed out");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const toggle2FA = trpc.users.toggleTwoFactor.useMutation({
    onSuccess: () => {
      meQ.refetch();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showSessions, setShowSessions] = useState(false);

  const twoFA = meQ.data?.twoFactorEnabled ?? false;
  const sessions = (sessionsQ.data ?? []) as unknown as SessionRow[];

  const submitPw = () => {
    if (!pw.current) return toast.error("Enter your current password.");
    if (pw.next.length < 8) return toast.error("New password must be at least 8 characters.");
    if (pw.next !== pw.confirm) return toast.error("New passwords don't match.");
    changePassword.mutate({ currentPassword: pw.current, newPassword: pw.next });
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-base font-bold text-navy">Security</h2>
      <div className="mt-4 space-y-2">
        {/* Password */}
        <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white shadow-sm">
              <Shield size={14} className="text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-navy">Password</div>
              <div className="truncate text-xs text-muted-foreground">
                Update your account password
              </div>
            </div>
            <button
              onClick={() => setShowPw((v) => !v)}
              className="shrink-0 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white"
            >
              {showPw ? "Close" : "Change"}
            </button>
          </div>
          {showPw && (
            <div className="mt-3 space-y-2">
              {(["current", "next", "confirm"] as const).map((k) => (
                <input
                  key={k}
                  type="password"
                  value={pw[k]}
                  onChange={(e) => setPw((p) => ({ ...p, [k]: e.target.value }))}
                  placeholder={
                    k === "current"
                      ? "Current password"
                      : k === "next"
                        ? "New password"
                        : "Confirm new password"
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                />
              ))}
              <button
                onClick={submitPw}
                disabled={changePassword.isPending}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {changePassword.isPending ? "Updating…" : "Update password"}
              </button>
            </div>
          )}
        </div>

        {/* Two-factor */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white shadow-sm">
            <Smartphone size={14} className="text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-navy">Two-factor authentication</div>
            <div className="truncate text-xs text-muted-foreground">
              {twoFA
                ? "Enabled · OTP required at login"
                : "Disabled · add an extra layer of security"}
            </div>
          </div>
          <button
            onClick={() => toggle2FA.mutate({ enabled: !twoFA })}
            disabled={toggle2FA.isPending || meQ.isLoading}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
              twoFA
                ? "border-border bg-white text-rose-600 hover:bg-rose-50"
                : "border-accent bg-accent text-white hover:opacity-90"
            }`}
          >
            {twoFA ? "Disable" : "Enable"}
          </button>
        </div>

        {/* Active sessions */}
        <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white shadow-sm">
              <Clock size={14} className="text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-navy">Active sessions</div>
              <div className="truncate text-xs text-muted-foreground">
                {sessionsQ.isLoading
                  ? "Loading…"
                  : `${sessions.length} active device${sessions.length !== 1 ? "s" : ""}`}
              </div>
            </div>
            <button
              onClick={() => setShowSessions((v) => !v)}
              className="shrink-0 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white"
            >
              {showSessions ? "Hide" : "Review"}
            </button>
          </div>
          {showSessions && sessions.length > 0 && (
            <div className="mt-3 space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-navy">
                      {s.userAgent ?? "Unknown device"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {s.ipAddress ?? "—"} · since {fmt(s.createdAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => terminate.mutate({ sessionId: s.id })}
                    disabled={terminate.isPending}
                    className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Sign out
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
