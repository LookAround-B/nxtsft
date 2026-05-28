import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

const items = [
  { to: "/", label: "Home", icon: "⌂" },
  { to: "/properties", label: "Search", icon: "⌕" },
  { to: "/about", label: "About", icon: "ⓘ" },
  { to: "/contact", label: "Contact", icon: "✉" },
];

export function BottomNav() {
  const loc = useLocation();
  const { session } = useAuth();
  const accountTo = session ? "/profile" : "/login";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur-xl md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((it) => {
          const active = loc.pathname === it.to || (it.to !== "/" && loc.pathname.startsWith(it.to));
          return (
            <li key={it.to}>
              <Link to={it.to} className={`flex flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider ${active ? "text-accent" : "text-muted-foreground"}`}>
                <span className="text-lg leading-none">{it.icon}</span>
                {it.label}
              </Link>
            </li>
          );
        })}
        <li>
          <Link to={accountTo} className={`flex flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider ${loc.pathname.startsWith("/profile") || loc.pathname === "/login" ? "text-accent" : "text-muted-foreground"}`}>
            {session ? (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">{session.initials}</span>
            ) : (
              <span className="text-lg leading-none">◉</span>
            )}
            {session ? "Me" : "Sign in"}
          </Link>
        </li>
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}