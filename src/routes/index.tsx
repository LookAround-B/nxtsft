import { createFileRoute, Link } from "@tanstack/react-router";
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
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, oklch(0.63 0.22 18) 0, transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.78 0.15 75) 0, transparent 40%)" }} />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-2 md:py-32">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold">
              ● Verified · AI Matched · Zero Brokerage
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              Find. Own. <span className="text-accent">Live Smarter.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-white/70">
              India's most comprehensive real estate platform — engineered to surpass the rest in feature depth, transparency and AI intelligence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/properties" className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/30 hover:opacity-90">Explore Properties</Link>
              <Link to="/user-portal" className="rounded-md border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10">Post Your Property</Link>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
              {[["18,420", "Live Listings"], ["3.2K+", "Verified Agents"], ["₹142Cr", "Closed YTD"]].map(([v, l]) => (
                <div key={l}>
                  <div className="font-display text-2xl font-bold text-gold">{v}</div>
                  <div className="text-xs uppercase tracking-wider text-white/50">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex gap-2 text-xs font-semibold uppercase tracking-widest">
                {["Buy", "Rent", "Commercial", "PG"].map((t, i) => (
                  <button key={t} className={`rounded-md px-3 py-1.5 ${i === 0 ? "bg-accent text-accent-foreground" : "text-white/60 hover:text-white"}`}>{t}</button>
                ))}
              </div>
              <div className="mt-5 grid gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/50">City</label>
                  <div className="mt-1 rounded-lg border border-white/10 bg-navy-deep/60 px-4 py-3 text-sm text-white">Mumbai, Maharashtra</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/50">Property Type</label>
                    <div className="mt-1 rounded-lg border border-white/10 bg-navy-deep/60 px-4 py-3 text-sm">Apartment</div>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/50">Budget</label>
                    <div className="mt-1 rounded-lg border border-white/10 bg-navy-deep/60 px-4 py-3 text-sm">₹2 Cr — 5 Cr</div>
                  </div>
                </div>
                <Link to="/properties" className="mt-2 rounded-lg bg-gold px-4 py-3 text-center font-display text-sm font-bold text-navy-deep hover:opacity-90">
                  Search 4,210 matches →
                </Link>
              </div>
              <div className="mt-5 flex items-center gap-2 text-[11px] text-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI matched in 0.4s · Powered by NestIQ Intelligence
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-accent">Core Pillars</div>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-navy">A full-stack real estate operating system.</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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

      <section className="bg-secondary/40 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-accent">Hand Picked</div>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-navy">Featured Homes</h2>
            </div>
            <Link to="/properties" className="text-sm font-semibold text-accent hover:underline">View all →</Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
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

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-accent">For Every Stakeholder</div>
          <h2 className="mt-3 font-display text-4xl font-bold text-navy">Five purpose-built portals.</h2>
          <p className="mt-3 text-muted-foreground">From Super Admin command to first-time home buyers — everyone has a dedicated workspace.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-5">
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