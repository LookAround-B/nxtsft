import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { properties } from "@/data/static";

export const Route = createFileRoute("/properties/$id")({
  component: PropertyDetail,
  notFoundComponent: () => <div className="p-12 text-center">Property not found</div>,
  errorComponent: ({ error }) => <div className="p-12 text-center text-destructive">{error.message}</div>,
  loader: ({ params }) => {
    const p = properties.find((x) => x.id === params.id);
    if (!p) throw notFound();
    return p;
  },
});

function PropertyDetail() {
  const p = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/properties" className="text-xs font-semibold uppercase tracking-widest text-accent hover:underline">← All Properties</Link>
        <div className="mt-4 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-border">
              <img src={p.image} alt={p.title} className="h-[480px] w-full object-cover" />
            </div>
            <div className="mt-6">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{p.locality}, {p.city}</div>
              <h1 className="mt-1 font-display text-4xl font-bold text-navy">{p.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="rounded-md bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">{p.purpose}</span>
                <span className="rounded-md bg-gold/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-navy">{p.matchScore}% AI Match</span>
                <span className="rounded-md bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-navy">RERA Verified</span>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                {[["Configuration", p.bhk], ["Carpet Area", `${p.area} sqft`], ["Type", p.type], ["Builder", p.builder]].map(([l, v]) => (
                  <div key={l} className="rounded-lg border border-border bg-white p-4">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
                    <div className="mt-1 font-display text-base font-bold text-navy">{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-xl border border-border bg-white p-6">
                <h3 className="font-display text-lg font-bold text-navy">Overview</h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                  A premium {p.type.toLowerCase()} in the heart of {p.locality}, {p.city}. Floor-to-ceiling windows, imported finishes, dedicated concierge and a clubhouse with infinity pool. NestIQ AI estimates a {p.matchScore}% lifestyle match based on your saved preferences. Price forecast shows a +6.4% upward trend over 12 months.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {["Modular Kitchen", "Power Backup", "Smart Locks", "Clubhouse", "Reserved Parking", "24x7 Security", "Vaastu Compliant", "Pet Friendly"].map((a) => (
                    <div key={a} className="rounded-md bg-secondary px-3 py-2 text-xs font-medium text-navy">✓ {a}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <aside className="space-y-5">
            <div className="rounded-xl border border-border bg-navy p-6 text-white">
              <div className="text-xs uppercase tracking-widest text-white/60">Asking Price</div>
              <div className="mt-1 font-display text-4xl font-bold text-gold">{p.priceLabel}</div>
              <div className="mt-1 text-xs text-white/60">EMI from ₹2,14,800/mo · 20yr @ 8.6%</div>
              <button className="mt-5 w-full rounded-md bg-accent py-3 font-display text-sm font-bold text-accent-foreground hover:opacity-90">Schedule Site Visit</button>
              <button className="mt-2 w-full rounded-md border border-white/20 py-3 font-display text-sm font-bold text-white hover:bg-white/5">Request Callback</button>
            </div>
            <div className="rounded-xl border border-border bg-white p-6">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Listed By</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-mid-blue text-white font-display font-bold">PS</div>
                <div>
                  <div className="font-semibold text-navy">Priya Sharma</div>
                  <div className="text-xs text-muted-foreground">NestIQ Verified · 4.9 ★</div>
                </div>
              </div>
              <button className="mt-4 w-full rounded-md bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:opacity-90">WhatsApp Agent</button>
            </div>
          </aside>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}