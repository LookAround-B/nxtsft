'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, Building2, Home, MapPin, Briefcase, Users,
  Star as StarIcon, ArrowRight, CheckCircle2, TrendingUp, ShieldCheck,
} from 'lucide-react';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { properties, portals } from '@/data/static';

const STATS = [
  { v: '10K+',  l: 'Properties' },
  { v: '2K+',   l: 'Projects' },
  { v: '50+',   l: 'Cities' },
  { v: '100K+', l: 'Customers' },
];

const CATEGORIES = [
  { label: 'Apartments',     Icon: Building2, type: 'Apartment' },
  { label: 'Villas',         Icon: Home,      type: 'Villa' },
  { label: 'Plots',          Icon: MapPin,    type: 'Plot' },
  { label: 'Commercial',     Icon: Briefcase, type: 'Commercial' },
  { label: 'PG / Co-living', Icon: Users,     type: 'PG' },
  { label: 'New Projects',   Icon: TrendingUp, type: 'New' },
];

const WHY = [
  { Icon: CheckCircle2, t: 'Verified Properties',  d: '100% RERA-verified listings with zero fraud.' },
  { Icon: TrendingUp,   t: 'Expert Guidance',       d: 'Dedicated relationship managers at every step.' },
  { Icon: ShieldCheck,  t: 'Seamless Transactions', d: 'End-to-end support from search to possession.' },
];

function portalInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const PORTAL_COLORS: Record<string, string> = {
  Gold:  'bg-amber-100 text-amber-700',
  Red:   'bg-rose-100 text-rose-600',
  Green: 'bg-emerald-100 text-emerald-700',
  Amber: 'bg-orange-100 text-orange-600',
};

export default function HomePage() {
  const router = useRouter();
  const featured = properties.filter((p) => p.featured).slice(0, 3);
  const [tab,   setTab]   = useState<'Buy' | 'Rent' | 'Commercial' | 'PG'>('Buy');
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    const q = query.trim();
    router.push(q ? `/properties?q=${encodeURIComponent(q)}` : '/properties');
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white pb-10 pt-10 sm:pb-16 sm:pt-20">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-40" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-accent sm:text-[11px]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Verified · AI Matched · Zero Brokerage
          </span>

          <h1 className="mt-5 font-display text-3xl font-black leading-[1.1] tracking-tight text-navy sm:text-5xl md:text-[3.75rem]">
            Find a home
            <span className="text-accent"> that fits your life.</span>
          </h1>

          <p className="mt-4 text-sm text-muted-foreground sm:text-lg">
            Verified properties. Trusted experts. Seamless experience.
          </p>

          {/* Search widget */}
          <div className="mx-auto mt-6 max-w-2xl overflow-hidden rounded-2xl border border-border bg-white shadow-xl shadow-navy/8 sm:mt-8">
            {/* Purpose tabs — scrollable on mobile */}
            <div className="flex overflow-x-auto border-b border-border px-3 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-4">
              {(['Buy', 'Rent', 'Commercial', 'PG'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`shrink-0 rounded-t-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition sm:px-4
                    ${tab === t ? 'border-b-2 border-accent text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {/* Input row */}
            <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by locality, project or builder"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <button
                onClick={handleSearch}
                className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:-translate-y-0.5 hover:opacity-90 sm:px-6 sm:py-2.5"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="relative mx-auto mt-8 max-w-3xl px-4 sm:mt-10 sm:px-6">
          <div className="grid grid-cols-4 gap-3">
            {STATS.map(({ v, l }, i) => (
              <div
                key={l}
                className="animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-3 text-center shadow-sm sm:p-5"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="font-display text-lg font-black text-navy sm:text-2xl lg:text-3xl">{v}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      <section className="bg-secondary/50 py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="animate-fade-up text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-accent">Browse by Type</div>
            <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">Top Categories</h2>
          </div>
          {/* 3 cols mobile → 6 desktop (even grid, no orphan) */}
          <div className="mt-6 grid grid-cols-3 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-6">
            {CATEGORIES.map(({ label, Icon, type }, i) => (
              <Link
                key={label}
                href={`/properties?type=${encodeURIComponent(type)}`}
                className="group animate-fade-up flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 text-center transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10 sm:gap-3 sm:p-6"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white sm:h-12 sm:w-12">
                  <Icon size={18} strokeWidth={1.75} className="sm:hidden" />
                  <Icon size={22} strokeWidth={1.75} className="hidden sm:block" />
                </span>
                <span className="font-display text-[11px] font-bold leading-tight text-navy sm:text-sm">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Homes ───────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-accent">Hand Picked</div>
            <h2 className="mt-1 font-display text-2xl font-black text-navy sm:text-3xl">Featured Homes</h2>
          </div>
          <Link
            href="/properties"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:border-accent hover:text-accent"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p, i) => (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="group animate-fade-up overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-navy/8"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={p.image} alt={p.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-navy-deep shadow">
                  <StarIcon size={9} className="fill-current" /> Featured
                </span>
                <span className="absolute right-3 top-3 rounded-lg bg-navy-deep/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                  {p.matchScore}% match
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.locality}, {p.city}</div>
                <h3 className="mt-1 font-display text-sm font-bold text-navy sm:text-base">{p.title}</h3>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="font-display text-lg font-black text-accent sm:text-xl">{p.priceLabel}</div>
                    <div className="text-xs text-muted-foreground">{p.bhk} · {p.area} sqft</div>
                  </div>
                  <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-navy">{p.builder}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Why Nestiqo ──────────────────────────────────────── */}
      <section className="bg-secondary/50 py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="animate-fade-up text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-accent">Why Nestiqo?</div>
            <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">Built for every journey</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 sm:grid-cols-3">
            {WHY.map(({ Icon, t, d }, i) => (
              <div
                key={t}
                className="animate-fade-up flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-7"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Icon size={22} strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-navy">{t}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portals ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="animate-fade-up text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-accent">For Every Stakeholder</div>
          <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">Five purpose-built portals</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:mt-3">
            From super-admin command to first-time buyers — everyone gets a dedicated workspace.
          </p>
        </div>
        {/* 5 items: 1 col → 3 cols → 5 cols. Middle row on 3-col: 2 items, centred with col-start trick. */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {portals.map((p, i) => {
            const colorClass = PORTAL_COLORS[p.accent] ?? 'bg-accent/10 text-accent';
            return (
              <Link
                key={p.path}
                href={p.path}
                className={`spotlight group animate-fade-up relative overflow-hidden rounded-2xl border border-border bg-white p-5 text-center transition hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10
                  ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-sm font-black tracking-tight transition group-hover:scale-110 sm:h-14 sm:w-14 sm:text-base ${colorClass}`}>
                  {portalInitials(p.name)}
                </div>
                <div className="mt-3 font-display text-sm font-bold text-navy">{p.name}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{p.role}</div>
                <div className="mt-2 text-[11px] font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">Enter →</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-16">
        <div className="animate-fade-up overflow-hidden rounded-3xl bg-navy px-5 py-10 text-center text-white shadow-2xl sm:px-14 sm:py-16">
          <h2 className="font-display text-2xl font-black sm:text-3xl md:text-4xl">
            Ready to find your perfect home?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/70 sm:mt-4 sm:text-base">
            Join over 1 lakh buyers who discovered their dream home on Nestiqo.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/properties"
              className="w-full rounded-xl bg-accent px-8 py-3.5 font-display text-sm font-bold text-white shadow-lg shadow-accent/40 transition hover:-translate-y-0.5 hover:opacity-90 sm:w-auto"
            >
              Browse Properties
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border border-white/25 bg-white/10 px-8 py-3.5 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 sm:w-auto"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
