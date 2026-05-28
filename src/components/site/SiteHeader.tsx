import { Link } from "@tanstack/react-router";
import { navLinks } from "@/data/static";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-navy text-gold font-display text-lg font-bold">N</div>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-tight text-navy">NestIQ</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">India ka Smart Ghar</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm font-medium text-foreground/80 transition-colors hover:text-accent" activeProps={{ className: "text-accent" }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/user-portal" className="hidden rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary md:inline-block">Sign in</Link>
          <Link to="/properties" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90">Browse Homes</Link>
        </div>
      </div>
    </header>
  );
}
