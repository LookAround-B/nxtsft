import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { properties } from "@/data/static";

export const Route = createFileRoute("/properties")({
  head: () => ({
    meta: [
      { title: "Properties — NestIQ" },
      { name: "description", content: "Browse verified residential and commercial properties across India on NestIQ." },
    ],
  }),
  component: PropertiesPage,
});

function PropertiesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="bg-navy text-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="text-xs font-semibold uppercase tracking-widest text-gold">Listings</div>
          <h1 className="mt-2 font-display text-4xl font-bold">{properties.length.toString().padStart(2, "0")} verified properties</h1>
          <p className="mt-2 text-white/60">AI-matched, RERA-tagged and ready for site visit.</p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-wrap gap-2 text-xs font-semibold">
          {["All", "Sale", "Rent", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Delhi", "Featured"].map((f, i) => (
            <button key={f} className={`rounded-full border px-4 py-1.5 ${i === 0 ? "border-accent bg-accent text-accent-foreground" : "border-border bg-white text-foreground hover:border-accent"}`}>{f}</button>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Link key={p.id} to="/properties/$id" params={{ id: p.id }} className="group overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-2xl">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={p.image} alt={p.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                {p.featured && <span className="absolute left-3 top-3 rounded-md bg-gold px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-navy-deep">★ Featured</span>}
                <span className="absolute right-3 top-3 rounded-md bg-navy-deep/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gold backdrop-blur">{p.matchScore}% match</span>
                <span className="absolute bottom-3 right-3 rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-navy">{p.purpose}</span>
              </div>
              <div className="p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.locality}, {p.city}</div>
                <h3 className="mt-1 font-display text-lg font-bold text-navy">{p.title}</h3>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="font-display text-xl font-bold text-accent">{p.priceLabel}</div>
                    <div className="text-xs text-muted-foreground">{p.bhk} · {p.area} sqft · {p.type}</div>
                  </div>
                  <span className="text-xs font-semibold text-mid-blue">{p.builder}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}