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
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <img src="/logo.png" alt="Nestiqo" className="h-20 w-auto object-contain transition group-hover:scale-105" />
            <div>
              <div className="font-display text-[17px] font-black leading-none tracking-tight text-navy">
                nest<TittleI />qo<span className="text-accent">.</span><TittleI />n
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) => {
              const active = l.to === '/' ? pathname === '/' : pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  href={l.to}
                  className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-secondary hover:text-foreground ${active ? 'text-accent bg-accent/8 font-semibold' : 'text-foreground/70'}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {session ? (
              <Link
                href="/profile"
                className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary md:inline-flex"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                  {session.initials}
                </span>
                <span className="max-w-[110px] truncate">{session.name}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary md:inline-block"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/properties"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90 hover:shadow-md hover:shadow-accent/35"
            >
              Browse Homes
            </Link>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground/70 hover:bg-secondary md:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="animate-fade-up border-t border-border bg-background px-5 py-4 md:hidden">
            <nav className="space-y-1">
              {navLinks.map((l) => {
                const active = l.to === '/' ? pathname === '/' : pathname.startsWith(l.to);
                return (
                  <Link
                    key={l.to}
                    href={l.to}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary hover:text-foreground ${active ? 'bg-accent/10 text-accent font-semibold' : 'text-foreground/80'}`}
                  >
                    {l.label}
                  </Link>
                );
              })}
              <div className="mt-3 border-t border-border pt-3">
                {session ? (
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-secondary"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      {session.initials}
                    </span>
                    {session.name}
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-secondary"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
