import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { properties } from "@/data/static";

export const Route = createFileRoute("/properties/$id")({
  component: PropertyDetail,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-accent">404</div>
        <h1 className="mt-3 font-display text-4xl font-bold text-navy">Property not found</h1>
        <p className="mt-3 text-muted-foreground">The listing you're looking for may have been sold or removed.</p>
        <Link to="/properties" className="mt-6 inline-block rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground">Browse all properties</Link>
      </div>
      <SiteFooter />
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-12 text-center text-destructive">{error.message}</div>,
  loader: ({ params }) => {
    const p = properties.find((x) => x.id === params.id);
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — ${loaderData.locality}, ${loaderData.city} | NestIQ` },
          { name: "description", content: loaderData.description },
          { property: "og:title", content: loaderData.title },
          { property: "og:description", content: loaderData.description },
          { property: "og:image", content: loaderData.image },
        ]
      : [],
  }),
});

function estimateEMI(principal: number) {
  // 80% loan, 20yr, 8.6%
  const P = principal * 0.8;
  const r = 0.086 / 12;
  const n = 240;
  const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi).toLocaleString("en-IN");
}

function PropertyDetail() {
  const p = Route.useLoaderData();
  const [active, setActive] = useState(0);
  const similar = properties.filter((x) => x.id !== p.id && x.city === p.city).slice(0, 3);
  const similarFallback = similar.length ? similar : properties.filter((x) => x.id !== p.id).slice(0, 3);

  const specs: Array<[string, string | number]> = [
    ["Configuration", p.bhk],
    ["Carpet Area", `${p.area} sqft`],
    ["Bedrooms", p.bedrooms || "—"],
    ["Bathrooms", p.bathrooms],
    ["Balconies", p.balconies],
    ["Parking", `${p.parking} spots`],
    ["Furnishing", p.furnishing],
    ["Facing", p.facing],
    ["Floor", p.floor],
    ["Age", p.age],
    ["Possession", p.possession],
    ["Type", p.type],
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link to="/" className="text-muted-foreground hover:text-accent">Home</Link>
          <span className="text-muted-foreground">/</span>
          <Link to="/properties" className="text-muted-foreground hover:text-accent">Properties</Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-navy">{p.locality}, {p.city}</span>
        </div>

        {/* Hero gallery */}
        <div className="mt-5 grid gap-3 lg:grid-cols-4 lg:grid-rows-2 lg:h-[520px]">
          <button
            onClick={() => setActive(0)}
            className="relative col-span-1 row-span-2 overflow-hidden rounded-2xl border border-border lg:col-span-2 group"
          >
            <img src={p.gallery[active]} alt={p.title} className="h-72 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-96 lg:h-full" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <span className="rounded-md bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">{p.purpose}</span>
              {p.featured && <span className="rounded-md bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-navy-deep">★ Featured</span>}
              <span className="rounded-md bg-navy-deep/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold backdrop-blur">{p.matchScore}% match</span>
            </div>
          </button>
          {p.gallery.slice(1, 5).map((src: string, i: number) => (
            <button
              key={src + i}
              onClick={() => setActive(i + 1)}
              className={`relative hidden overflow-hidden rounded-2xl border lg:block ${active === i + 1 ? "border-accent ring-2 ring-accent/40" : "border-border"}`}
            >
              <img src={src} alt={`${p.title} ${i + 2}`} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
              {i === 3 && p.gallery.length > 5 && (
                <div className="absolute inset-0 grid place-items-center bg-navy-deep/60 font-display text-lg font-bold text-white backdrop-blur-sm">
                  +{p.gallery.length - 5} photos
                </div>
              )}
            </button>
          ))}
        </div>
        {/* Mobile thumbnails */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {p.gallery.map((src: string, i: number) => (
            <button key={src + i} onClick={() => setActive(i)} className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${active === i ? "border-accent" : "border-border"}`}>
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{p.locality}, {p.city}</div>
              <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-navy sm:text-4xl">{p.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-navy">✓ RERA {p.rera.slice(0, 14)}…</span>
                <span className="rounded-md bg-gold/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-navy">{p.matchScore}% AI Match</span>
                <span className="rounded-md bg-mid-blue/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-navy">{p.builder}</span>
              </div>
              {/* Mobile price */}
              <div className="mt-4 flex items-baseline justify-between rounded-xl bg-navy p-4 text-white lg:hidden">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/60">Asking</div>
                  <div className="font-display text-3xl font-bold text-gold">{p.priceLabel}</div>
                </div>
                <div className="text-right text-[11px] text-white/70">
                  <div>{p.pricePerSqft}/sqft</div>
                  <div>EMI ₹{p.purpose === "Sale" ? estimateEMI(p.price) : "—"}/mo</div>
                </div>
              </div>
            </div>

            {/* Key specs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {specs.map(([l, v]) => (
                <div key={l} className="rounded-lg border border-border bg-white p-3 sm:p-4">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
                  <div className="mt-1 font-display text-sm font-bold text-navy sm:text-base">{v}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold text-navy">About this property</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80 sm:text-base">{p.description}</p>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-5 text-center">
                <div>
                  <div className="font-display text-lg font-bold text-accent">+6.4%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">12-mo forecast</div>
                </div>
                <div>
                  <div className="font-display text-lg font-bold text-accent">{p.matchScore}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">AI lifestyle match</div>
                </div>
                <div>
                  <div className="font-display text-lg font-bold text-accent">{p.pricePerSqft}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Per sqft</div>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold text-navy">Amenities ({p.amenities.length})</h2>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {p.amenities.map((a: string) => (
                  <div key={a} className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs font-medium text-navy">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-accent/20 text-accent">✓</span>
                    {a}
                  </div>
                ))}
              </div>
            </div>

            {/* Nearby */}
            <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold text-navy">What's nearby</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {p.nearby.map(([name, dist]: [string, string]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-mid-blue/30 text-navy">📍</span>
                      <span className="text-sm font-medium text-navy">{name}</span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{dist}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* EMI estimator */}
            {p.purpose === "Sale" && (
              <div className="rounded-xl border border-border bg-gradient-to-br from-secondary to-muted p-5 sm:p-6">
                <h2 className="font-display text-xl font-bold text-navy">EMI Estimator</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-4">
                  {[
                    ["Down Payment (20%)", `₹${(p.price * 0.2 / 100000).toFixed(1)} L`],
                    ["Loan Amount", `₹${(p.price * 0.8 / 10000000).toFixed(2)} Cr`],
                    ["Tenure", "20 years"],
                    ["Monthly EMI", `₹${estimateEMI(p.price)}`],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
                      <div className="mt-1 font-display text-base font-bold text-navy">{v}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground">* Indicative at 8.6% p.a. interest. Actuals vary by bank, profile and tenure.</p>
              </div>
            )}
          </div>

          {/* Sticky sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            <div className="hidden rounded-xl border border-border bg-navy p-6 text-white lg:block">
              <div className="text-xs uppercase tracking-widest text-white/60">Asking Price</div>
              <div className="mt-1 font-display text-4xl font-bold text-gold">{p.priceLabel}</div>
              <div className="mt-1 text-xs text-white/60">
                {p.pricePerSqft}/sqft
                {p.purpose === "Sale" && ` · EMI ₹${estimateEMI(p.price)}/mo`}
              </div>
              <button className="mt-5 w-full rounded-md bg-accent py-3 font-display text-sm font-bold text-accent-foreground hover:opacity-90">Schedule Site Visit</button>
              <button className="mt-2 w-full rounded-md border border-white/20 py-3 font-display text-sm font-bold text-white hover:bg-white/5">Request Callback</button>
            </div>

            <div className="rounded-xl border border-border bg-white p-6">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Listed By</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-mid-blue text-white font-display text-lg font-bold">{p.owner.initials}</div>
                <div>
                  <div className="font-display font-bold text-navy">{p.owner.name}</div>
                  <div className="text-xs text-muted-foreground">{p.owner.role}</div>
                  <div className="mt-0.5 text-xs font-semibold text-accent">★ {p.owner.rating} · {p.owner.deals} deals</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[11px]">
                <div className="rounded-md bg-secondary px-3 py-2">
                  <div className="text-muted-foreground">Since</div>
                  <div className="font-display font-bold text-navy">{p.owner.since}</div>
                </div>
                <div className="rounded-md bg-secondary px-3 py-2">
                  <div className="text-muted-foreground">Response</div>
                  <div className="font-display font-bold text-navy">&lt; 30 min</div>
                </div>
              </div>
              <a href={`tel:${p.owner.phone.replace(/\s/g, "")}`} className="mt-4 block w-full rounded-md bg-navy py-2.5 text-center text-sm font-semibold text-white hover:opacity-90">📞 Call {p.owner.phone}</a>
              <button className="mt-2 w-full rounded-md bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:opacity-90">💬 WhatsApp Agent</button>
            </div>

            <form className="rounded-xl border border-border bg-white p-6">
              <div className="font-display text-base font-bold text-navy">Send an enquiry</div>
              <div className="mt-3 space-y-2">
                <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Your name" />
                <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Phone (+91)" />
                <textarea rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder={`I'm interested in ${p.title.split("—")[0].trim()}…`} />
              </div>
              <button type="button" className="mt-3 w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-accent-foreground">Send enquiry</button>
            </form>
          </aside>
        </div>

        {/* Similar */}
        <div className="mt-16">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">Similar properties</h2>
            <Link to="/properties" className="text-sm font-semibold text-accent hover:underline">View all →</Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similarFallback.map((sp) => (
              <Link key={sp.id} to="/properties/$id" params={{ id: sp.id }} className="group overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-2xl">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={sp.image} alt={sp.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                  <span className="absolute right-3 top-3 rounded-md bg-navy-deep/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">{sp.matchScore}%</span>
                </div>
                <div className="p-4">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{sp.locality}, {sp.city}</div>
                  <h3 className="mt-1 font-display text-base font-bold text-navy">{sp.title}</h3>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-display text-lg font-bold text-accent">{sp.priceLabel}</span>
                    <span className="text-xs text-muted-foreground">{sp.bhk} · {sp.area}sqft</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}