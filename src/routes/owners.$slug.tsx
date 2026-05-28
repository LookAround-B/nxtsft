import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Star, Phone, MessageCircle, Lock } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { properties, ownerSlug } from "@/data/static";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/owners/$slug")({
  component: OwnerPage,
  loader: ({ params }) => {
    const listings = properties.filter((p) => ownerSlug(p.owner.name) === params.slug);
    if (listings.length === 0) throw notFound();
    return { listings, owner: listings[0].owner };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.owner.name} — ${loaderData.listings.length} listings | NestIQ` },
      { name: "description", content: `Browse all ${loaderData.listings.length} verified properties listed by ${loaderData.owner.name} on NestIQ.` },
    ] : [],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-bold text-navy">Owner not found</h1>
        <Link to="/properties" className="mt-6 inline-block rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground">Browse properties</Link>
      </div>
      <SiteFooter />
    </div>
  ),
});

function OwnerPage() {
  const { listings, owner } = Route.useLoaderData();
  const { session } = useAuth();
  const totalValue = listings.reduce((s, p) => s + (p.purpose === "Sale" ? p.price : 0), 0);
  const cities = Array.from(new Set(listings.map((p) => p.city)));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link to="/" className="text-muted-foreground hover:text-accent">Home</Link>
            <span className="text-muted-foreground">/</span>
            <Link to="/properties" className="text-muted-foreground hover:text-accent">Properties</Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-navy">{owner.name}</span>
          </div>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-mid-blue font-display text-2xl font-bold text-white">{owner.initials}</div>
            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold text-navy sm:text-4xl">{owner.name}</h1>
              <div className="mt-1 text-sm text-muted-foreground">{owner.role} · NestIQ Partner since {owner.since}</div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{owner.rating}</span>
                <span className="text-muted-foreground">·</span>
                <span><b className="text-navy">{owner.deals}</b> closed deals</span>
                <span className="text-muted-foreground">·</span>
                <span><b className="text-navy">{listings.length}</b> active {listings.length === 1 ? "listing" : "listings"}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {session ? (
                <>
                  <a href={`tel:${owner.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"><Phone className="h-4 w-4" /> Call</a>
                  <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"><MessageCircle className="h-4 w-4" /> WhatsApp</button>
                </>
              ) : (
                <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white"><Lock className="h-4 w-4" /> Sign in to contact</Link>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Active listings" value={String(listings.length)} />
            <Stat label="Closed deals" value={String(owner.deals)} />
            <Stat label="Cities" value={cities.join(", ")} />
            <Stat label="Portfolio value" value={totalValue > 0 ? `₹${(totalValue / 10000000).toFixed(2)} Cr` : "—"} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">All listings by {owner.name.split(" ")[0]}</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((p) => (
            <Link key={p.id} to="/properties/$id" params={{ id: p.id }} className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={p.image} alt={p.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                <span className="absolute right-3 top-3 rounded-md bg-navy-deep/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gold backdrop-blur">{p.matchScore}% match</span>
                <span className="absolute bottom-3 right-3 rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-navy">{p.purpose}</span>
              </div>
              <div className="p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.locality}, {p.city}</div>
                <h3 className="mt-1 font-display text-lg font-bold text-navy">{p.title}</h3>
                <div className="mt-3 flex items-end justify-between">
                  <div className="font-display text-xl font-bold text-accent">{p.priceLabel}</div>
                  <div className="text-xs text-muted-foreground">{p.bhk} · {p.area} sqft</div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg font-bold text-navy">{value}</div>
    </div>
  );
}