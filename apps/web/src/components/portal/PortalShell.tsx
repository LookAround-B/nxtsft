"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X, ChevronLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useActiveHash } from "@/lib/use-active-hash";
import { NotificationBell } from "@/components/NotificationBell";

export interface PortalNav {
  label: string;
  to: string;
  icon?: ReactNode;
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

  return (
    <div className="flex h-screen overflow-hidden bg-[oklch(0.97_0.01_260)] text-foreground">
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
          fixed inset-y-0 left-0 z-40 flex h-screen flex-shrink-0 flex-col
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
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
          {nav.map((n) => {
            const [navPath, navHash = ""] = n.to.split("#");
            const active = navPath === pathname && navHash === currentHash;
            const href = navHash ? `${navPath}#${navHash}` : navPath;

            const handleClick = (e: React.MouseEvent) => {
              e.preventDefault();
              setSidebarOpen(false);
              window.location.hash = navHash || "";
            };

            return (
              <Link
                key={n.to}
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
                  className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-[13px] transition-colors
                  ${active ? "bg-white/12 text-white" : "bg-white/5 text-white/50 group-hover:bg-white/10 group-hover:text-white/80"}`}
                >
                  {n.icon ?? <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </span>
                {!collapsed && <span className="truncate">{n.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/8 px-2 py-3">
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
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex flex-shrink-0 items-center justify-between border-b border-border bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm sm:px-6 transition-shadow duration-200">
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
            <div
              className={`grid h-10 w-10 place-items-center rounded-full font-display text-sm font-bold ring-2 ${ac.ring} ${ac.bg} ${ac.text}`}
            >
              {user.initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-10">
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
    <section className="gradient-border mt-6 rounded-2xl bg-white p-6 shadow-sm border-l-2 border-l-accent/0 hover:border-l-accent/40 transition-all duration-200">
      <div className="mb-5 flex items-center justify-between">
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
