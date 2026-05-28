import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { properties, portals } from "@/data/static";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NestIQ — India ka Smart Ghar | Find. Own. Live Smarter." },
      { name: "description", content: "NestIQ is India's next-generation real estate ecosystem unifying property discovery, CRM, ERP and AI-driven analytics." },
      { property: "og:title", content: "NestIQ — India's Smart Real Estate Ecosystem" },
      { property: "og:description", content: "Verified listings, AI matching, zero-brokerage and integrated CRM+ERP." },
    ],
  }),
  component: Index,
});

function Index() {
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

      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0">
          {slides.map((s, i) => (
            <div
              key={s.id}
              className="absolute inset-0 transition-opacity duration-1000"
              style={{ opacity: i === active ? 1 : 0 }}
            >
              <img src={s.image} alt={s.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-navy-deep/95 via-navy/80 to-navy/40" />
            </div>
          ))}
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 sm:py-24 md:grid-cols-2 md:py-32">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-gold sm:text-xs">
              ● Verified · AI Matched · Zero Brokerage
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-7xl">
              Find. Own. <span className="text-accent">Live Smarter.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-white/80 sm:text-lg">
              India's most comprehensive real estate platform — engineered to surpass the rest in feature depth, transparency and AI intelligence.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/properties" className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/30 hover:opacity-90">Explore Properties</Link>
              <Link to="/user-portal" className="rounded-md border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10">Post Your Property</Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 sm:gap-6 sm:pt-8">
              {[["18,420", "Live Listings"], ["3.2K+", "Verified Agents"], ["₹142Cr", "Closed YTD"]].map(([v, l]) => (
                <div key={l}>
                  <div className="font-display text-xl font-bold text-gold sm:text-2xl">{v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/60 sm:text-xs">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
              <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-widest">
                {["Buy", "Rent", "Commercial", "PG"].map((t, i) => (
                  <button key={t} className={`rounded-md px-3 py-1.5 ${i === 0 ? "bg-accent text-accent-foreground" : "text-white/70 hover:text-white"}`}>{t}</button>
                ))}
              </div>
              <div className="mt-5 grid gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/60">City</label>
                  <div className="mt-1 rounded-lg border border-white/15 bg-navy-deep/60 px-4 py-3 text-sm text-white">{slides[active].city}, India</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/60">Now Featuring</label>
                    <div className="mt-1 truncate rounded-lg border border-white/15 bg-navy-deep/60 px-4 py-3 text-sm">{slides[active].bhk}</div>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/60">Asking</label>
                    <div className="mt-1 truncate rounded-lg border border-white/15 bg-navy-deep/60 px-4 py-3 text-sm">{slides[active].priceLabel}</div>
                  </div>
                </div>
                <Link to="/properties/$id" params={{ id: slides[active].id }} className="mt-2 rounded-lg bg-gold px-4 py-3 text-center font-display text-sm font-bold text-navy-deep hover:opacity-90">
                  View {slides[active].title.split("—")[0].trim()} →
                </Link>
              </div>
              <div className="mt-5 flex items-center gap-2 text-[11px] text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI matched in 0.4s · Powered by NestIQ Intelligence
              </div>
            </div>
          </div>
        </div>
        {/* Carousel controls */}
        <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 pb-8 sm:px-6">
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all ${i === active ? "w-10 bg-gold" : "w-5 bg-white/30 hover:bg-white/50"}`}
              />
            ))}
          </div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-white/60">
            {String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-accent">Core Pillars</div>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">A full-stack real estate operating system.</h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Property Discovery", d: "Verified listings, 3D tours, neighbourhood insights." },
            { t: "AI & ML Engine", d: "Match scores, price forecasting, fraud detection." },
            { t: "CRM & Sales Ops", d: "Full lead lifecycle, kanban pipeline, call logging." },
            { t: "ERP & Finance", d: "Inventory, billing, payroll, projects, GST." },
          ].map((p, i) => (
            <div key={p.t} className="group rounded-xl border border-border bg-white p-6 transition hover:-translate-y-1 hover:border-accent hover:shadow-xl">
              <div className="font-mono text-xs text-muted-foreground">0{i + 1}</div>
              <h3 className="mt-3 font-display text-lg font-bold text-navy">{p.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/60 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-accent">Hand Picked</div>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">Featured Homes</h2>
            </div>
            <Link to="/properties" className="text-sm font-semibold text-accent hover:underline">View all →</Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <Link key={p.id} to="/properties/$id" params={{ id: p.id }} className="group overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-2xl">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={p.image} alt={p.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                  <span className="absolute left-3 top-3 rounded-md bg-gold px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-navy-deep">★ Featured</span>
                  <span className="absolute right-3 top-3 rounded-md bg-navy-deep/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gold backdrop-blur">{p.matchScore}% match</span>
                </div>
                <div className="p-5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.locality}, {p.city}</div>
                  <h3 className="mt-1 font-display text-lg font-bold text-navy">{p.title}</h3>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="font-display text-xl font-bold text-accent">{p.priceLabel}</div>
                      <div className="text-xs text-muted-foreground">{p.bhk} · {p.area} sqft</div>
                    </div>
                    <span className="text-xs font-semibold text-mid-blue">{p.builder}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-accent">For Every Stakeholder</div>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">Five purpose-built portals.</h2>
          <p className="mt-3 text-muted-foreground">From Super Admin command to first-time home buyers — everyone has a dedicated workspace.</p>
        </div>
        <div className="mt-10 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {portals.map((p) => (
            <Link key={p.path} to={p.path} className="group rounded-xl border border-border bg-white p-6 text-center transition hover:-translate-y-1 hover:border-accent hover:shadow-xl">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-navy text-gold font-display text-lg font-bold">N</div>
              <div className="mt-4 font-display text-sm font-bold text-navy">{p.name}</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{p.role}</div>
              <div className="mt-3 text-[11px] font-semibold text-accent opacity-0 transition group-hover:opacity-100">Enter Portal →</div>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}