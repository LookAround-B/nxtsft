import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

export interface PortalNav {
  label: string;
  to: string;
  icon?: string;
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

const accentMap: Record<string, string> = {
  gold: "bg-gold text-navy-deep",
  red: "bg-accent text-accent-foreground",
  green: "bg-emerald-500 text-white",
  amber: "bg-amber-500 text-white",
  blue: "bg-mid-blue text-white",
};

export function PortalShell({ brand, role, accent = "red", user, nav, basePath, children }: Props) {
  const loc = useLocation();
  const accentCls = accentMap[accent];
  // Hash isn't sent to the server, so any hash-based active state must wait
  // until after hydration to avoid SSR/client mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const currentHash = mounted ? (loc.hash ?? "") : "";
  return (
    <div className="flex h-screen overflow-hidden bg-[oklch(0.97_0.01_260)] text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col overflow-y-auto bg-navy-deep text-white lg:flex">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className={`grid h-10 w-10 place-items-center rounded-lg font-display text-lg font-bold ${accentCls}`}>N</div>
          <div>
            <div className="font-display text-base font-bold tracking-tight">{brand}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">{role}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-6">
          {nav.map((n) => {
            const [navPath, navHash = ""] = n.to.split("#");
            const active = navPath === loc.pathname && navHash === currentHash;
            return (
              <Link
                key={n.to}
                to={navPath}
                hash={navHash || undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active ? "bg-white/10 text-white font-semibold" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="grid h-6 w-6 place-items-center text-xs">{n.icon ?? "•"}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-4 py-4">
          <Link to="/" className="block text-xs text-white/50 hover:text-gold">← Back to NestIQ.in</Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex flex-shrink-0 items-center justify-between border-b border-border bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{role} Portal</div>
            <div className="font-display text-xl font-bold text-navy">{brand}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-sm font-semibold text-foreground">{user.name}</div>
              <div className="text-xs text-muted-foreground">{role}</div>
            </div>
            <div className={`grid h-10 w-10 place-items-center rounded-full font-display text-sm font-bold ${accentCls}`}>
              {user.initials}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-10">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold text-navy">{value}</div>
      {sub && <div className={`mt-1 text-xs ${accent ?? "text-emerald-600"}`}>{sub}</div>}
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-8 rounded-xl border border-border bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-navy">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "hot" | "warm" | "cold" | "new" | "success" }) {
  const map: Record<string, string> = {
    default: "bg-secondary text-secondary-foreground",
    hot: "bg-accent/10 text-accent",
    warm: "bg-amber-100 text-amber-700",
    cold: "bg-slate-200 text-slate-600",
    new: "bg-mid-blue/10 text-mid-blue",
    success: "bg-emerald-100 text-emerald-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${map[tone]}`}>{children}</span>;
}
