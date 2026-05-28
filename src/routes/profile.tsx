import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ROLE_META, useAuth, type Role } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My Profile — NestIQ" }] }),
  component: ProfilePage,
});

const roleStats: Record<Role, Array<[string, string]>> = {
  "super-admin": [["Tenants", "42"], ["Global Users", "12,480"], ["Uptime", "99.98%"], ["Revenue YTD", "₹142 Cr"]],
  admin: [["Active Listings", "1,840"], ["Open Leads", "328"], ["Team Size", "24"], ["Conversion", "6.8%"]],
  supervisor: [["Team Size", "8"], ["Open Leads", "62"], ["MTD Closed", "14"], ["Avg Response", "11 min"]],
  sales: [["Open Leads", "14"], ["Closed MTD", "4"], ["Target", "72%"], ["Commission", "₹1.24 L"]],
  user: [["Shortlisted", "6"], ["Site Visits", "3"], ["EMI Pre-approved", "₹1.8 Cr"], ["KYC", "Verified"]],
};

const roleActions: Record<Role, Array<{ label: string; to: string; icon: string }>> = {
  "super-admin": [
    { label: "Open Command Deck", to: "/sa-portal", icon: "🛰" },
    { label: "Tenants", to: "/sa-portal", icon: "🏢" },
    { label: "Billing", to: "/sa-portal", icon: "💳" },
  ],
  admin: [
    { label: "Open Control Panel", to: "/admin-portal", icon: "⚙" },
    { label: "Approve Listings", to: "/admin-portal", icon: "✓" },
    { label: "Pipeline", to: "/admin-portal", icon: "📊" },
  ],
  supervisor: [
    { label: "Open Desk", to: "/supervisor-portal", icon: "🗂" },
    { label: "Reassign Leads", to: "/supervisor-portal", icon: "↻" },
    { label: "Team Activity", to: "/supervisor-portal", icon: "👥" },
  ],
  sales: [
    { label: "Open Field", to: "/sales-portal", icon: "📱" },
    { label: "My Leads", to: "/sales-portal", icon: "🎯" },
    { label: "Today's Calls", to: "/sales-portal", icon: "📞" },
  ],
  user: [
    { label: "Open My Dashboard", to: "/user-portal", icon: "🏠" },
    { label: "Shortlist", to: "/user-portal", icon: "❤" },
    { label: "EMI Calculator", to: "/user-portal", icon: "🧮" },
  ],
};

function ProfilePage() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) navigate({ to: "/login" });
  }, [session, navigate]);

  if (!session) return null;

  const meta = ROLE_META[session.role];
  const stats = roleStats[session.role];
  const actions = roleActions[session.role];

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SiteHeader />

      {/* Cover banner */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-r from-navy via-navy-deep to-accent sm:h-56">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 0, transparent 35%), radial-gradient(circle at 80% 70%, oklch(0.85 0.13 220) 0, transparent 35%)" }} />
      </div>

      <div className="mx-auto -mt-16 max-w-7xl px-5 sm:-mt-20 sm:px-6">
        {/* Identity card */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xl sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent to-navy font-display text-2xl font-bold text-white shadow-lg sm:h-24 sm:w-24">
              {session.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">{meta.label}</span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">● Active</span>
              </div>
              <h1 className="mt-2 font-display text-2xl font-bold text-navy sm:text-3xl">{session.name}</h1>
              <div className="mt-1 text-sm text-muted-foreground">{meta.portalName} · {session.city} · Member since {session.joined}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={meta.portal} className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:opacity-90">Open Portal →</Link>
              <button onClick={() => { signOut(); navigate({ to: "/" }); }} className="rounded-md border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:bg-secondary">Sign out</button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map(([l, v]) => (
            <div key={l} className="rounded-xl border border-border bg-white p-4 sm:p-5">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
              <div className="mt-2 font-display text-2xl font-bold text-navy sm:text-3xl">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-navy">Account details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[
                  ["Full name", session.name],
                  ["Email", session.email],
                  ["Phone", session.phone],
                  ["City", session.city],
                  ["Role", meta.label],
                  ["Workspace", meta.portalName],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
                    <div className="mt-1 font-medium text-navy">{v}</div>
                  </div>
                ))}
              </div>
              <button className="mt-5 rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-secondary">Edit profile</button>
            </div>

            <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-navy">Security</h2>
              <div className="mt-4 space-y-3">
                {[
                  ["Password", "Last changed 14 days ago", "Change"],
                  ["Two-factor auth", "OTP via +91 ●●●●● 4291", "Manage"],
                  ["Active sessions", "2 devices · Mumbai, Pune", "Review"],
                ].map(([l, sub, btn]) => (
                  <div key={l} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-navy">{l}</div>
                      <div className="truncate text-xs text-muted-foreground">{sub}</div>
                    </div>
                    <button className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-accent hover:bg-secondary">{btn}</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-navy">Recent activity</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  ["10:42", `Signed in to ${meta.portalName}`],
                  ["09:18", "Updated notification preferences"],
                  ["Yesterday", "Completed KYC verification"],
                  ["2 days ago", "Updated phone number"],
                ].map(([ts, msg]) => (
                  <li key={ts + msg} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    <div className="flex-1">
                      <div className="text-navy">{msg}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{ts}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Side */}
          <aside className="space-y-6">
            <div className="rounded-xl border border-border bg-gradient-to-br from-navy to-navy-deep p-6 text-white">
              <div className="text-[10px] uppercase tracking-widest text-white/60">Quick Actions</div>
              <div className="mt-4 space-y-2">
                {actions.map((a) => (
                  <Link key={a.label} to={a.to} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10">
                    <span className="flex items-center gap-3"><span>{a.icon}</span>{a.label}</span>
                    <span>→</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-white p-6">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Preferences</div>
              <div className="mt-4 space-y-3 text-sm">
                {[
                  ["Email notifications", true],
                  ["WhatsApp updates", true],
                  ["SMS alerts", false],
                  ["Marketing emails", false],
                ].map(([l, on]) => (
                  <label key={l as string} className="flex items-center justify-between">
                    <span className="text-navy">{l as string}</span>
                    <span className={`relative h-5 w-9 rounded-full ${on ? "bg-accent" : "bg-border"}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${on ? "left-[18px]" : "left-0.5"}`} />
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-white p-6 text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Switch role</div>
              <p className="mt-2 text-xs text-muted-foreground">Demo any other portal in one click.</p>
              <Link to="/login" className="mt-3 inline-block rounded-md border border-accent px-4 py-2 text-xs font-semibold text-accent hover:bg-accent hover:text-accent-foreground">Change role →</Link>
            </div>
          </aside>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}