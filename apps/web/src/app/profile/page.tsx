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
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
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
const activity = [
  { time: "Today, 10:42", text: "Signed in from Mumbai", dot: "bg-accent" },
  { time: "Today, 09:18", text: "Updated notification preferences", dot: "bg-accent" },
  { time: "Yesterday", text: "Completed KYC verification", dot: "bg-emerald-500" },
  { time: "2 days ago", text: "Updated phone number", dot: "bg-muted-foreground" },
  { time: "5 days ago", text: "Saved 3 new properties in Mumbai", dot: "bg-accent" },
];

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
    if (!session) {
      router.push("/login");
      return;
    }
    setName(session.name);
    setPhone(session.phone);
  }, [session, router]);

  if (!session) return null;

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
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] };
      toast.success(
        `${key.charAt(0).toUpperCase() + key.slice(1)} notifications ${next[key] ? "enabled" : "disabled"}`,
      );
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.01_260)] pb-24 md:pb-0">
      <SiteHeader />

      {/* Cover */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-r from-navy via-navy-deep to-accent sm:h-56">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 50%, oklch(1 0 0 / 0.08) 0, transparent 50%), radial-gradient(circle at 85% 30%, oklch(0.85 0.13 220 / 0.15) 0, transparent 50%)",
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />
      </div>

      <div className="mx-auto -mt-16 w-full max-w-5xl px-4 sm:-mt-20 sm:px-6">
        {/* Identity card */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xl sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            {/* Avatar */}
            <div className="relative -mt-14 sm:-mt-16">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent to-navy font-display text-2xl font-black text-white shadow-xl ring-4 ring-white sm:h-24 sm:w-24 sm:text-3xl">
                {session.initials}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                <CheckCircle2 size={11} className="text-white" strokeWidth={3} />
              </span>
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                  {meta.label}
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Active
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {meta.portalName}
                </span>
              </div>
              <h1 className="mt-1.5 font-display text-2xl font-black text-navy sm:text-3xl">
                {session.name}
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin size={12} />
                {session.city} · Member since {session.joined}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <Link
                href={meta.portal}
                className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-accent/20 transition hover:-translate-y-0.5 hover:opacity-95 hover:shadow-md"
              >
                Open Portal <ChevronRight size={14} />
              </Link>
              <button
                onClick={() => {
                  signOut();
                  router.push("/");
                  toast.success("Signed out");
                }}
                className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground/70 transition hover:bg-secondary hover:text-red-500"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(({ label, value, sub }) => (
            <div
              key={label}
              className="stat-card-hover rounded-xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {label}
              </div>
              <div className="mt-1.5 font-display text-2xl font-black text-navy">{value}</div>
              {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="mt-5 grid gap-5 lg:grid-cols-3 lg:items-start">
          {/* Left column */}
          <div className="space-y-5 lg:col-span-2">
            {/* Account details */}
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-navy">Account Details</h2>
                <button
                  onClick={() => (editing ? saveProfile() : setEditing(true))}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white"
                >
                  <Edit2 size={12} />
                  {editing ? "Save changes" : "Edit"}
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {/* Editable name */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Full Name
                  </label>
                  {editing ? (
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  ) : (
                    <div className="mt-1 font-medium text-navy">{session.name}</div>
                  )}
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Email
                  </label>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="font-medium text-navy">{session.email}</span>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                      Verified
                    </span>
                  </div>
                </div>

                {/* Editable phone */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Phone
                  </label>
                  {editing ? (
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  ) : (
                    <div className="mt-1 font-medium text-navy">{session.phone}</div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    City
                  </label>
                  <div className="mt-1 font-medium text-navy">{session.city}</div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Role
                  </label>
                  <div className="mt-1 font-medium text-navy">{meta.label}</div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Workspace
                  </label>
                  <div className="mt-1 font-medium text-navy">{meta.portalName}</div>
                </div>
              </div>

              {editing && (
                <button
                  onClick={() => setEditing(false)}
                  className="mt-4 text-xs font-semibold text-muted-foreground hover:text-red-500 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Security */}
            <SecurityPanel />

            {/* Activity */}
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-display text-base font-bold text-navy">Recent Activity</h2>
              <ul className="mt-4 space-y-0">
                {activity.map(({ time, text, dot }, i) => (
                  <li key={i} className="relative flex items-start gap-4 pb-5 last:pb-0">
                    {/* timeline line */}
                    {i < activity.length - 1 && (
                      <span className="absolute left-[7px] top-5 h-full w-px bg-border" />
                    )}
                    <span
                      className={`relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white ${dot}`}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-navy">{text}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {time}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right column */}
          <aside className="space-y-5">
            {/* Quick actions */}
            <div className="rounded-2xl bg-gradient-to-br from-navy to-navy-deep p-5 text-white shadow-sm">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/50">
                Quick Actions
              </div>
              <div className="mt-3 space-y-1.5">
                {actions.map(({ label, to, Icon }) => (
                  <Link
                    key={label}
                    href={to}
                    className="flex items-center justify-between rounded-xl bg-white/6 px-4 py-2.5 text-sm font-medium transition hover:bg-white/12"
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={14} strokeWidth={1.75} className="text-white/70" />
                      {label}
                    </span>
                    <ChevronRight size={13} className="text-white/40" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-accent" />
                <h3 className="font-display text-sm font-bold text-navy">Notifications</h3>
              </div>
              <div className="mt-4 space-y-3">
                {(
                  [
                    ["Email alerts", "email", Mail],
                    ["WhatsApp updates", "whatsapp", MessageCircle],
                    ["SMS alerts", "sms", Phone],
                    ["Marketing emails", "marketing", Star],
                  ] as [string, keyof typeof prefs, LucideIcon][]
                ).map(([label, key, Icon]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-navy">
                      <Icon size={13} className="text-muted-foreground" />
                      {label}
                    </span>
                    <Toggle on={prefs[key]} onToggle={() => togglePref(key)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Sign in as different role */}
            <div className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Switch Portal
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Demo any other role in one click.
              </p>
              <Link
                href="/admin-login"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-accent px-4 py-2 text-xs font-bold text-accent transition hover:bg-accent hover:text-white"
              >
                Change role <ChevronRight size={12} />
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <div className="mt-16" />
      <SiteFooter />
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
    onSuccess: () => { sessionsQ.refetch(); toast.success("Session signed out"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const toggle2FA = trpc.users.toggleTwoFactor.useMutation({
    onSuccess: () => { meQ.refetch(); },
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

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

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
              <div className="truncate text-xs text-muted-foreground">Update your account password</div>
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
                  placeholder={k === "current" ? "Current password" : k === "next" ? "New password" : "Confirm new password"}
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
              {twoFA ? "Enabled · OTP required at login" : "Disabled · add an extra layer of security"}
            </div>
          </div>
          <button
            onClick={() => toggle2FA.mutate({ enabled: !twoFA })}
            disabled={toggle2FA.isPending || meQ.isLoading}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
              twoFA ? "border-border bg-white text-rose-600 hover:bg-rose-50" : "border-accent bg-accent text-white hover:opacity-90"
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
                {sessionsQ.isLoading ? "Loading…" : `${sessions.length} active device${sessions.length !== 1 ? "s" : ""}`}
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
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-navy">{s.userAgent ?? "Unknown device"}</div>
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
