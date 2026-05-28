'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, BrainCircuit, BarChart3, Briefcase, Star as StarIcon } from 'lucide-react';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { properties, portals } from '@/data/static';

const PILLARS = [
  { t: 'Property Discovery', d: 'Verified listings, 3D tours, neighbourhood insights.', Icon: Building2 },
  { t: 'AI & ML Engine',     d: 'Match scores, price forecasting, fraud detection.',   Icon: BrainCircuit },
  { t: 'CRM & Sales Ops',    d: 'Full lead lifecycle, kanban pipeline, call logging.', Icon: BarChart3 },
  { t: 'ERP & Finance',      d: 'Inventory, billing, payroll, projects, GST.',         Icon: Briefcase },
];

const STATS = [['18,420', 'Live Listings'], ['3.2K+', 'Verified Agents'], ['₹142Cr', 'Closed YTD']];

export default function HomePage() {
  const featured = properties.filter((p) => p.featured).slice(0, 3);
  const slides = properties.slice(0, 5);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0">
          {slides.map((s, i) => (
            <div key={s.id} className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: i === active ? 1 : 0 }}>
              <img src={s.image} alt={s.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-navy-deep/96 via-navy/85 to-navy/50" />
            </div>
          ))}
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 sm:py-24 md:grid-cols-2 md:py-32">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-gold sm:text-xs">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              Verified · AI Matched · Zero Brokerage
            </span>
            <h1 className="mt-6 font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-[4.5rem]">
              Find. Own.<br /><span className="text-gold">Live Smarter.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-white/75 sm:text-lg">
              India's most comprehensive real estate platform — engineered to surpass the rest in feature depth, transparency and AI intelligence.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/properties" className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-lg shadow-accent/30 transition hover:-translate-y-0.5 hover:opacity-90">
                Explore Properties
              </Link>
              <Link href="/user-portal" className="rounded-xl border border-white/20 bg-white/8 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/14">
                Post Your Property
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 sm:gap-6 sm:pt-8">
              {STATS.map(([v, l], i) => (
                <div key={l} className="animate-fade-up" style={{ animationDelay: `${i * 100 + 200}ms` }}>
                  <div className="font-display text-2xl font-black text-gold sm:text-3xl">{v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/55 sm:text-xs">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative hidden animate-fade-up delay-150 md:block">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-widest">
                {['Buy', 'Rent', 'Commercial', 'PG'].map((t, i) => (
                  <button key={t} className={`rounded-lg px-3 py-1.5 transition ${i === 0 ? 'bg-accent text-white shadow-sm shadow-accent/30' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}>{t}</button>
                ))}
              </div>
              <div className="mt-5 grid gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/55">City</label>
                  <div className="mt-1 rounded-xl border border-white/15 bg-navy-deep/60 px-4 py-3 text-sm text-white">{slides[active].city}, India</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/55">Type</label>
                    <div className="mt-1 truncate rounded-xl border border-white/15 bg-navy-deep/60 px-4 py-3 text-sm">{slides[active].bhk}</div>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/55">Asking</label>
                    <div className="mt-1 truncate rounded-xl border border-white/15 bg-navy-deep/60 px-4 py-3 text-sm">{slides[active].priceLabel}</div>
                  </div>
                </div>
                <Link href={`/properties/${slides[active].id}`} className="mt-1 rounded-xl bg-gold px-4 py-3 text-center font-display text-sm font-bold text-navy-deep shadow-md shadow-gold/30 transition hover:opacity-90">
                  View {slides[active].title.split('—')[0].trim()} →
                </Link>
              </div>
              <div className="mt-5 flex items-center gap-2 text-[11px] text-white/55">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                AI matched in 0.4s · Powered by NestIt Intelligence
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 pb-8 sm:px-6">
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button key={i} aria-label={`Slide ${i + 1}`} onClick={() => setActive(i)} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-10 bg-gold' : 'w-4 bg-white/30 hover:bg-white/55'}`} />
            ))}
          </div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/50">{String(active + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20">
        <div className="max-w-2xl animate-fade-up">
          <div className="text-xs font-bold uppercase tracking-widest text-accent">Core Pillars</div>
          <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-navy sm:text-4xl">A full-stack real estate operating system.</h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <div key={p.t} className="spotlight glow-accent group rounded-2xl border border-border bg-white p-6 transition hover:-translate-y-1.5 hover:shadow-xl hover:shadow-accent/8 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white">
                <p.Icon size={20} strokeWidth={1.75} />
              </div>
              <div className="mt-3 font-mono text-xs text-muted-foreground">0{i + 1}</div>
              <h3 className="mt-2 font-display text-base font-bold text-navy">{p.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Homes */}
      <section className="bg-secondary/50 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3 animate-fade-up">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-accent">Hand Picked</div>
              <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-navy sm:text-4xl">Featured Homes</h2>
            </div>
            <Link href="/properties" className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent">View all →</Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p, i) => (
              <Link key={p.id} href={`/properties/${p.id}`} className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-navy/10 animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={p.image} alt={p.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-navy-deep shadow">
                    <StarIcon size={9} className="fill-current" /> Featured
                  </span>
                  <span className="absolute right-3 top-3 rounded-lg bg-navy-deep/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold backdrop-blur">{p.matchScore}% match</span>
                </div>
                <div className="p-5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.locality}, {p.city}</div>
                  <h3 className="mt-1 font-display text-lg font-bold text-navy">{p.title}</h3>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="font-display text-xl font-black text-accent">{p.priceLabel}</div>
                      <div className="text-xs text-muted-foreground">{p.bhk} · {p.area} sqft</div>
                    </div>
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-navy">{p.builder}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Portals */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20">
        <div className="text-center animate-fade-up">
          <div className="text-xs font-bold uppercase tracking-widest text-accent">For Every Stakeholder</div>
          <h2 className="mt-3 font-display text-3xl font-black text-navy sm:text-4xl">Five purpose-built portals.</h2>
          <p className="mt-3 max-w-lg mx-auto text-muted-foreground text-sm">From Super Admin command to first-time home buyers — everyone gets a dedicated workspace.</p>
        </div>
        <div className="mt-10 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {portals.map((p, i) => (
            <Link key={p.path} href={p.path} className="spotlight glow-accent group relative overflow-hidden rounded-2xl border border-border bg-white p-6 text-center transition hover:-translate-y-1.5 hover:shadow-xl hover:shadow-accent/10 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-navy text-white font-display text-xl font-black shadow-md shadow-navy/30 transition group-hover:scale-110 group-hover:bg-accent">N</div>
              <div className="mt-4 font-display text-sm font-bold text-navy">{p.name}</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{p.role}</div>
              <div className="mt-3 text-[11px] font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">Enter Portal →</div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
        <div className="animate-fade-up overflow-hidden rounded-3xl bg-gradient-to-r from-navy-deep via-navy to-mid-blue p-10 text-center text-white shadow-2xl sm:p-14">
          <h2 className="font-display text-2xl font-black sm:text-3xl md:text-4xl">Ready to find your perfect home?</h2>
          <p className="mt-4 text-white/70 max-w-md mx-auto text-sm sm:text-base">Join over 4 lakh buyers who discovered their dream home on NestIt.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/properties" className="rounded-xl bg-gold px-8 py-3.5 font-display text-sm font-bold text-navy-deep shadow-lg shadow-gold/30 transition hover:-translate-y-0.5 hover:opacity-90">Browse Properties</Link>
            <Link href="/login" className="rounded-xl border border-white/25 bg-white/10 px-8 py-3.5 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">Create Free Account</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
