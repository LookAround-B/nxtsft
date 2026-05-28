import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { properties } from "@/data/static";

export const Route = createFileRoute("/properties/")({
  head: () => ({
    meta: [
      { title: "Properties — NestIQ" },
      { name: "description", content: "Browse verified residential and commercial properties across India on NestIQ." },
    ],
  }),
  component: PropertiesPage,
});

const CITIES = ["All", ...Array.from(new Set(properties.map((p) => p.city)))];
const TYPES = ["All", ...Array.from(new Set(properties.map((p) => p.type)))];
const PURPOSES = ["All", "Sale", "Rent"];
const BHKS = ["All", "1 BHK", "2 BHK", "3 BHK", "4 BHK"];
const SORTS = [
  { id: "match", label: "Best Match" },
  { id: "price-asc", label: "Price: Low → High" },
  { id: "price-desc", label: "Price: High → Low" },
  { id: "area-desc", label: "Area: Largest" },
] as const;

function PropertiesPage() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("All");
  const [purpose, setPurpose] = useState("All");
  const [type, setType] = useState("All");
  const [bhk, setBhk] = useState("All");
  const [maxBudget, setMaxBudget] = useState(50000000);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("match");
  const [showMobile, setShowMobile] = useState(false);

  const filtered = useMemo(() => {
    let r = properties.filter((p) => {
      if (q && !`${p.title} ${p.city} ${p.locality} ${p.builder}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (city !== "All" && p.city !== city) return false;
      if (purpose !== "All" && p.purpose !== purpose) return false;
      if (type !== "All" && p.type !== type) return false;
      if (bhk !== "All" && p.bhk !== bhk) return false;
      if (featuredOnly && !p.featured) return false;
      if (p.purpose === "Sale" && p.price > maxBudget) return false;
      return true;
    });
    if (sort === "price-asc") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") r = [...r].sort((a, b) => b.price - a.price);
    if (sort === "area-desc") r = [...r].sort((a, b) => b.area - a.area);
    if (sort === "match") r = [...r].sort((a, b) => b.matchScore - a.matchScore);
    return r;
  }, [q, city, purpose, type, bhk, featuredOnly, maxBudget, sort]);

  const reset = () => {
    setQ(""); setCity("All"); setPurpose("All"); setType("All"); setBhk("All"); setMaxBudget(50000000); setFeaturedOnly(false); setSort("match");
  };

  const fmtBudget = (n: number) => n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : `₹${(n / 100000).toFixed(0)} L`;

  const FiltersPanel = (
    <div className="space-y-6">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Search</label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Locality, builder…" className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent" />
        </div>
      </div>

      <FilterGroup label="Purpose" options={PURPOSES} value={purpose} onChange={setPurpose} />
      <FilterGroup label="City" options={CITIES} value={city} onChange={setCity} />
      <FilterGroup label="Type" options={TYPES} value={type} onChange={setType} />
      <FilterGroup label="Configuration" options={BHKS} value={bhk} onChange={setBhk} />

      <div>
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Max Budget</label>
          <span className="font-display text-sm font-bold text-accent">{fmtBudget(maxBudget)}</span>
        </div>
        <input type="range" min={1000000} max={50000000} step={500000} value={maxBudget} onChange={(e) => setMaxBudget(Number(e.target.value))} className="mt-3 w-full accent-accent" />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>₹10 L</span><span>₹5 Cr</span></div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} className="h-4 w-4 accent-accent" />
        <span>Featured only</span>
      </label>

      <button onClick={reset} className="w-full rounded-lg border border-border bg-white py-2.5 text-sm font-semibold text-navy hover:border-accent hover:text-accent">Reset Filters</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="bg-navy text-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
          <div className="text-xs font-semibold uppercase tracking-widest text-gold">Listings</div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{filtered.length.toString().padStart(2, "0")} verified properties</h1>
          <p className="mt-2 text-white/60">AI-matched, RERA-tagged and ready for site visit.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Desktop filters */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div className="font-display text-base font-bold text-navy">Filters</div>
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
              {FiltersPanel}
            </div>
          </aside>

          <div>
            {/* Toolbar */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <button onClick={() => setShowMobile(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-navy lg:hidden">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </button>
              <div className="text-xs text-muted-foreground">{filtered.length} results</div>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="ml-auto rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-navy outline-none focus:border-accent">
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white p-12 text-center">
                <div className="font-display text-lg font-bold text-navy">No properties match these filters.</div>
                <p className="mt-2 text-sm text-muted-foreground">Try widening your budget or removing a filter.</p>
                <button onClick={reset} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">Reset filters</button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((p) => (
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
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters drawer */}
      {showMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-deep/60" onClick={() => setShowMobile(false)} />
          <div className="absolute inset-y-0 right-0 w-[88%] max-w-sm overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="font-display text-lg font-bold text-navy">Filters</div>
              <button onClick={() => setShowMobile(false)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-5 w-5" /></button>
            </div>
            {FiltersPanel}
            <button onClick={() => setShowMobile(false)} className="mt-6 w-full rounded-lg bg-accent py-3 text-sm font-semibold text-accent-foreground">Show {filtered.length} results</button>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}

function FilterGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${value === opt ? "border-accent bg-accent text-accent-foreground" : "border-border bg-white text-foreground hover:border-accent hover:text-accent"}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}