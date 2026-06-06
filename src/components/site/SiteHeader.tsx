'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { navLinks } from '@/data/static';
import { useAuth } from '@/lib/auth';

function TittleI() {
  return (
    <span className="relative inline-block">
      ı
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-accent"
        style={{ top: '0.05em', width: '0.2em', height: '0.2em' }}
      />
    </span>
  );
}

export function SiteHeader() {
  const { session } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6">

          {/* Logo */}
          <Link href="/" className="group flex shrink-0 items-center gap-2 sm:gap-3">
            <img
              src="/logo.png"
              alt="Nestiqo"
              className="h-9 w-auto object-contain transition group-hover:scale-105 sm:h-14"
            />
            {/* Wordmark — hidden on smallest screens to prevent overflow */}
            <div className="hidden min-[420px]:block">
              <div className="font-display text-[15px] font-black leading-none tracking-tight text-navy sm:text-[17px]">
                nest<TittleI />qo<span className="text-accent">.</span><TittleI />n
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {navLinks.map((l) => {
              const active = l.to === '/' ? pathname === '/' : pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  href={l.to}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-secondary hover:text-foreground
                    ${active ? 'bg-accent/8 font-semibold text-accent' : 'text-foreground/70'}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Sign-in / avatar — desktop only */}
            {session ? (
              <Link
                href="/profile"
                className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-secondary md:inline-flex"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                  {session.initials}
                </span>
                <span className="max-w-[100px] truncate">{session.name}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary md:inline-block"
              >
                Sign in
              </Link>
            )}

            {/* Browse Homes CTA — always visible, shorter on mobile */}
            <Link
              href="/properties"
              className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90 sm:px-4"
            >
              <span className="sm:hidden">Browse</span>
              <span className="hidden sm:inline">Browse Homes</span>
            </Link>

            {/* Mobile hamburger */}
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
              {navLinks.map((l) => {
                const active = l.to === '/' ? pathname === '/' : pathname.startsWith(l.to);
                return (
                  <Link
                    key={l.to}
                    href={l.to}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-secondary hover:text-foreground
                      ${active ? 'bg-accent/10 font-semibold text-accent' : 'text-foreground/80'}`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-3 border-t border-border pt-3">
              {session ? (
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
