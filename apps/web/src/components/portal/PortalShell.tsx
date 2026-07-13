"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, X, ChevronLeft, PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";
import { useActiveHash } from "@/lib/use-active-hash";
import { useAuth } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";
import { VerifyPhoneBanner } from "@/components/site/VerifyPhoneBanner";

export interface PortalNav {
  label: string;
  to: string;
  icon?: ReactNode;
  group?: string;   // section heading; first item in a new group renders the label
  badge?: number;   // pending-count bubble (hidden when 0)
}

interface Props {
  brand: string;
  role: string;
  accent?: "gold" | "red" | "green" | "amber" | "blue";
  user: { name: string; initials: string };
  nav: PortalNav[];
  basePath: string;
  children: ReactNode;
}

const accentMap: Record<string, { bg: string; text: string; ring: string; bar: string }> = {
  gold: { bg: "bg-gold", text: "text-navy-deep", ring: "ring-gold/40", bar: "bg-gold" },
  red: { bg: "bg-accent", text: "text-white", ring: "ring-accent/40", bar: "bg-accent" },
  green: {
    bg: "bg-emerald-500",
    text: "text-white",
    ring: "ring-emerald-400/40",
    bar: "bg-emerald-400",
  },
  amber: { bg: "bg-amber-500", text: "text-white", ring: "ring-amber-400/40", bar: "bg-amber-400" },
  blue: { bg: "bg-mid-blue", text: "text-white", ring: "ring-mid-blue/40", bar: "bg-mid-blue" },
};

export function PortalShell({ brand, role, accent = "red", user, nav, basePath, children }: Props) {
  const pathname = usePathname();
  const currentHash = useActiveHash();
  const ac = accentMap[accent];
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.push("/");
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[oklch(0.97_0.01_260)] text-foreground">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex h-[100dvh] flex-shrink-0 flex-col
          bg-navy-deep text-white shadow-2xl
          transition-all duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0 lg:shadow-none
          ${collapsed ? "w-[64px]" : "w-[240px]"}
        `}
      >
        {/* Brand */}
        <div
          className={`flex items-center border-b border-white/8 py-4 ${collapsed ? "justify-center px-0" : "gap-3 px-4"}`}
        >
          <img
            src="/logo.png"
            alt="NxtSft.com"
            className="h-16 w-auto flex-shrink-0 object-contain brightness-0 invert"
          />
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate font-display text-[14px] font-bold tracking-tight text-white">
                {brand}
              </div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-white/40">{role}</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
          {nav.map((n, idx) => {
            const [navPath, navHash = ""] = n.to.split("#");
            const active = navPath === pathname && navHash === currentHash;
            const href = navHash ? `${navPath}#${navHash}` : navPath;
            const prevGroup = idx > 0 ? nav[idx - 1]?.group : undefined;
            const showGroupHeader = !collapsed && n.group !== undefined && n.group !== prevGroup;

            const handleClick = (e: React.MouseEvent) => {
              // Only intercept same-page hash tabs (e.g. /user-portal#saved). A
              // nav item pointing at a different page (e.g. /list) must go
              // through Link's real navigation, not have its click swallowed.
              if (navPath !== pathname) return;
              e.preventDefault();
              setSidebarOpen(false);
              window.location.hash = navHash || "";
            };

            return (
              <div key={n.to}>
                {showGroupHeader && (
                  <div className={`px-3 text-[9px] font-bold uppercase tracking-[0.15em] text-white/30 ${idx === 0 ? "mb-1" : "mb-1 mt-5"}`}>
                    {n.group}
                  </div>
                )}
                <Link
                  href={href}
                  scroll={false}
                  onClick={handleClick}
                  title={collapsed ? n.label : undefined}
                  className={`
                    sidebar-nav-item group relative flex items-center rounded-xl py-2.5 text-sm transition-all duration-150
                    ${collapsed ? "justify-center px-0" : "gap-3 px-3"}
                    ${
                      active
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/55 hover:bg-white/6 hover:text-white/90"
                    }
                  `}
                >
                  {active && (
                    <span
                      className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full ${ac.bar}`}
                    />
                  )}
                  <span
                    className={`relative grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-[13px] transition-colors
                    ${active ? "bg-white/12 text-white" : "bg-white/5 text-white/50 group-hover:bg-white/10 group-hover:text-white/80"}`}
                  >
                    {n.icon ?? <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    {collapsed && !!n.badge && n.badge > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent ring-1 ring-navy-deep" />
                    )}
                  </span>
                  {!collapsed && <span className="min-w-0 flex-1 truncate">{n.label}</span>}
                  {!collapsed && !!n.badge && n.badge > 0 && (
                    <span className="ml-auto shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold leading-none text-accent">
                      {n.badge}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/8 px-2 py-3 space-y-1">
          {!collapsed && (
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/35 transition hover:bg-white/6 hover:text-gold"
            >
              <ChevronLeft size={12} />
              Back to nxtsft.com
            </Link>
          )}
          {collapsed && (
            <Link
              href="/"
              title="Back to nxtsft.com"
              className="flex justify-center rounded-xl py-2 text-white/35 transition hover:bg-white/6 hover:text-gold"
            >
              <ChevronLeft size={14} />
            </Link>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white/40 transition hover:bg-white/6 hover:text-red-400"
            >
              <LogOut size={12} />
              Sign out
            </button>
          )}
          {collapsed && (
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="flex w-full justify-center rounded-xl py-2 text-white/40 transition hover:bg-white/6 hover:text-red-400"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Verify-WhatsApp nudge (self-gates to unverified end-users) */}
        <VerifyPhoneBanner />
        {/* Header */}
        <header className="flex flex-shrink-0 items-center justify-between border-b border-border bg-white/95 px-4 py-3 shadow-sm sm:px-6 transition-shadow duration-200">
          <div className="flex items-center gap-3">
            {/* Mobile toggle */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-border text-foreground/60 transition hover:bg-secondary lg:hidden"
              aria-label="Open sidebar"
            >
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            {/* Desktop collapse toggle */}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="hidden h-9 w-9 place-items-center rounded-xl border border-border text-foreground/60 transition hover:bg-secondary lg:grid"
              aria-label="Toggle sidebar"
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {role} Portal
              </div>
              <div className="font-display text-lg font-bold leading-tight text-navy">{brand}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-foreground">{user.name}</div>
              <div className="text-xs text-muted-foreground">{role}</div>
            </div>
            {/* Avatar with sign-out dropdown */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={`grid h-10 w-10 place-items-center rounded-full font-display text-sm font-bold ring-2 transition hover:opacity-85 ${ac.ring} ${ac.bg} ${ac.text}`}
                aria-label="User menu"
              >
                {user.initials}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-border bg-white shadow-xl">
                  <div className="border-b border-border px-4 py-3">
                    <div className="font-semibold text-navy text-sm truncate">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{role}</div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/6"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content — scroll is locked while the mobile drawer is open so only
            the sidebar scrolls, not the dashboard behind it. */}
        <main
          className={`flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-10 ${
            sidebarOpen ? "overflow-hidden" : "overflow-y-auto"
          }`}
        >
          <div
            key={currentHash}
            className="mx-auto w-full max-w-7xl animate-fade-up animate-scale-in transition-all duration-300"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="stat-card-hover stat-accent-bar spotlight group relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-md hover:shadow-black/5">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-black text-navy">{value}</div>
      {sub && (
        <div className={`mt-1.5 text-xs font-medium ${accent ?? "text-emerald-600"}`}>{sub}</div>
      )}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="gradient-border mt-6 rounded-2xl bg-white p-4 sm:p-6 shadow-sm border-l-2 border-l-accent/0 hover:border-l-accent/40 transition-all duration-200">
      <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <h3 className="font-display text-base font-bold text-navy">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "hot" | "warm" | "cold" | "new" | "success";
}) {
  const map: Record<string, string> = {
    default: "bg-secondary text-secondary-foreground",
    hot: "bg-accent/10 text-accent border border-accent/20",
    warm: "bg-amber-100 text-amber-700 border border-amber-200",
    cold: "bg-slate-100 text-slate-600 border border-slate-200",
    new: "bg-mid-blue/10 text-mid-blue border border-mid-blue/20",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-150 ${map[tone]}`}
    >
      {children}
    </span>
  );
}
