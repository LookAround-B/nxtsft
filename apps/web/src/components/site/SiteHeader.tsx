"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Menu,
  X,
  ChevronDown,
  Plus,
  Minus,
  Building2,
  Home,
  MapPin,
  Briefcase,
  Users,
  TrendingUp,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";

const PROPERTY_TYPES = [
  { label: "Apartments", Icon: Building2, type: "Apartment" },
  { label: "Villas", Icon: Home, type: "Villa" },
  { label: "Plots & Land", Icon: MapPin, type: "Plot" },
  { label: "Commercial", Icon: Briefcase, type: "Office" },
  { label: "PG / Co-living", Icon: Users, type: "PG" },
  { label: "Studios", Icon: TrendingUp, type: "Studio" },
];

const PROPERTY_CITIES = [
  "Mumbai",
  "Bengaluru",
  "Delhi NCR",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
];

const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/properties", label: "Properties", hasMega: true },
  { to: "/builders", label: "Builders" },
  { to: "/agents", label: "Agents" },
  { to: "/nri-guide", label: "NRI Guide" },
  { to: "/pricing", label: "Pricing" },
  { to: "/refer", label: "Refer & Earn" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleSignOut() {
    setAccountOpen(false);
    setMobileOpen(false);
    await signOut();
    router.push("/");
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="group flex shrink-0 items-center">
            <img
              src="/logo.png"
              alt="NxtSft.com"
              className="h-9 w-auto object-contain transition group-hover:opacity-90 sm:h-10"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="mx-auto hidden items-center gap-0.5 md:flex">
            {NAV_ITEMS.map((l) => {
              const active = l.to === "/" ? pathname === "/" : pathname.startsWith(l.to);

              if (l.hasMega) {
                return (
                  <div key={l.to} className="group relative">
                    <button
                      className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-secondary hover:text-foreground
                        ${active ? "bg-accent/8 font-semibold text-accent" : "text-foreground/70"}`}
                    >
                      {l.label}
                      <ChevronDown
                        size={13}
                        className="transition-transform duration-200 group-hover:rotate-180"
                      />
                    </button>

                    {/* Mega-menu panel */}
                    <div className="invisible absolute left-1/2 top-full z-50 mt-1.5 w-[480px] -translate-x-1/2 scale-95 rounded-2xl border border-border bg-white opacity-0 shadow-2xl shadow-navy/10 transition-all duration-200 group-hover:visible group-hover:scale-100 group-hover:opacity-100">
                      <div className="grid grid-cols-2">
                        {/* By Type */}
                        <div className="p-5 border-r border-border/60">
                          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-accent">
                            By Property Type
                          </div>
                          <ul className="space-y-0.5">
                            {PROPERTY_TYPES.map((t) => (
                              <li key={t.type}>
                                <Link
                                  href={`/properties?type=${encodeURIComponent(t.type)}`}
                                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground/70 transition hover:bg-secondary hover:text-accent"
                                >
                                  <t.Icon size={14} className="shrink-0 text-accent/50" />
                                  {t.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* By City */}
                        <div className="p-5">
                          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-accent">
                            By City
                          </div>
                          <ul className="space-y-0.5">
                            {PROPERTY_CITIES.map((city) => (
                              <li key={city}>
                                <Link
                                  href={`/properties?city=${encodeURIComponent(city)}`}
                                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground/70 transition hover:bg-secondary hover:text-accent"
                                >
                                  <span className="text-xs text-muted-foreground/40">→</span>
                                  {city}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="border-t border-border/60 px-5 py-3">
                        <Link
                          href="/properties"
                          className="text-sm font-semibold text-accent hover:underline"
                        >
                          View all properties in India →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={l.to}
                  href={l.to}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-secondary hover:text-foreground
                    ${active ? "bg-accent/8 font-semibold text-accent" : "text-foreground/70"}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
            {session && <NotificationBell />}
            {session ? (
              <div ref={accountRef} className="relative hidden md:block">
                <button
                  onClick={() => setAccountOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-secondary"
                  aria-label="Account menu"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                    {session.initials}
                  </span>
                  <span className="max-w-[100px] truncate">{session.name}</span>
                  <ChevronDown
                    size={13}
                    className={`text-muted-foreground transition-transform ${accountOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-border bg-white shadow-xl">
                    <div className="border-b border-border px-4 py-3">
                      <div className="truncate text-sm font-semibold text-navy">{session.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{session.email}</div>
                    </div>
                    <div className="p-1.5">
                      <Link
                        href="/profile"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-navy transition hover:bg-secondary"
                      >
                        <UserIcon size={14} /> My Profile
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-accent transition hover:bg-accent/6"
                      >
                        <LogOut size={14} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary md:inline-block"
              >
                Sign in
              </Link>
            )}

            {(!session || session.role === "home-seller") && (
              <Link
                href="/list"
                className="hidden whitespace-nowrap rounded-lg border border-navy/20 bg-navy/5 px-3 py-2 text-sm font-semibold text-navy transition hover:bg-navy/10 lg:inline-block sm:px-4"
              >
                List Property
              </Link>
            )}

            <Link
              href="/properties"
              className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90 sm:px-4"
            >
              <span className="sm:hidden">Browse</span>
              <span className="hidden sm:inline">Browse Homes</span>
            </Link>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground/70 transition hover:bg-secondary md:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="animate-slide-up border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl md:hidden">
            <nav className="space-y-0.5">
              {NAV_ITEMS.map((l) => {
                const active = l.to === "/" ? pathname === "/" : pathname.startsWith(l.to);
                const isExpanded = mobileExpanded === l.to;

                if (l.hasMega) {
                  return (
                    <div key={l.to}>
                      <button
                        onClick={() => setMobileExpanded(isExpanded ? null : l.to)}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-secondary
                          ${active ? "bg-accent/10 font-semibold text-accent" : "text-foreground/80"}`}
                      >
                        {l.label}
                        {isExpanded ? (
                          <Minus size={15} className="text-accent" />
                        ) : (
                          <Plus size={15} className="text-muted-foreground" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="ml-4 mt-1 mb-2 space-y-3 rounded-xl border border-border/60 bg-secondary/40 p-3">
                          {/* By Type */}
                          <div>
                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
                              By Type
                            </div>
                            <div className="mt-1 space-y-0.5">
                              {PROPERTY_TYPES.map((t) => (
                                <Link
                                  key={t.type}
                                  href={`/properties?type=${encodeURIComponent(t.type)}`}
                                  onClick={() => setMobileOpen(false)}
                                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/70 transition hover:bg-secondary hover:text-accent"
                                >
                                  <t.Icon size={13} className="shrink-0 text-accent/60" />
                                  {t.label}
                                </Link>
                              ))}
                            </div>
                          </div>

                          {/* By City */}
                          <div className="border-t border-border/60 pt-2">
                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
                              By City
                            </div>
                            <div className="mt-1 grid grid-cols-2 gap-0.5">
                              {PROPERTY_CITIES.map((city) => (
                                <Link
                                  key={city}
                                  href={`/properties?city=${encodeURIComponent(city)}`}
                                  onClick={() => setMobileOpen(false)}
                                  className="rounded-lg px-3 py-2 text-sm text-foreground/70 transition hover:bg-secondary hover:text-accent"
                                >
                                  {city}
                                </Link>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-border/60 pt-1">
                            <Link
                              href="/properties"
                              onClick={() => setMobileOpen(false)}
                              className="block rounded-lg px-3 py-2 text-sm font-semibold text-accent"
                            >
                              View all properties →
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={l.to}
                    href={l.to}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-secondary hover:text-foreground
                      ${active ? "bg-accent/10 font-semibold text-accent" : "text-foreground/80"}`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-3 border-t border-border pt-3">
              {(!session || session.role === "home-seller") && (
                <Link
                  href="/list"
                  onClick={() => setMobileOpen(false)}
                  className="mb-2 flex items-center justify-center gap-2 rounded-xl border border-navy/20 bg-navy/5 px-4 py-3 text-sm font-semibold text-navy transition hover:bg-navy/10"
                >
                  List Your Property
                </Link>
              )}
              {session ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground/80 transition hover:bg-secondary"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      {session.initials}
                    </span>
                    <div>
                      <div className="font-semibold text-navy">{session.name}</div>
                      <div className="text-xs text-muted-foreground">View profile</div>
                    </div>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/6"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-foreground/80 transition hover:bg-secondary"
                >
                  Sign in →
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
