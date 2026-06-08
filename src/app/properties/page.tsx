'use client';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X, Star, Home, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { properties } from '@/data/static';

const CITIES   = ['All', ...Array.from(new Set(properties.map((p) => p.city)))];
const TYPES    = ['All', ...Array.from(new Set(properties.map((p) => p.type)))];
const PURPOSES = ['All', 'Sale', 'Rent'];
const BHKS     = ['All', '1 BHK', '2 BHK', '3 BHK', '4 BHK'];
const SORTS = [
  { id: 'match',      label: 'Best Match' },
  { id: 'price-asc',  label: 'Price: Low → High' },
  { id: 'price-desc', label: 'Price: High → Low' },
  { id: 'area-desc',  label: 'Area: Largest' },
] as const;

export default function PropertiesPage() {
  const [q,            setQ]           = useState('');
  const [city,         setCity]        = useState('All');
  const [purpose,      setPurpose]     = useState('All');
  const [type,         setType]        = useState('All');
  const [bhk,          setBhk]         = useState('All');
  const [maxBudget,    setMaxBudget]   = useState(50_000_000);
  const [featuredOnly, setFeaturedOnly]= useState(false);
  const [sort,         setSort]        = useState<(typeof SORTS)[number]['id']>('match');
  const [showMobile,   setShowMobile]  = useState(false);

  useEffect(() => {
    const sp       = new URLSearchParams(window.location.search);
    const qParam    = sp.get('q');
    const typeParam = sp.get('type');
    const cityParam = sp.get('city');
    if (qParam)                                         setQ(qParam);
    if (typeParam && TYPES.includes(typeParam))         setType(typeParam);
    if (cityParam && CITIES.includes(cityParam))        setCity(cityParam);
  }, []);

  const filtered = useMemo(() => {
    let r = properties.filter((p) => {
      if (q && !`${p.title} ${p.city} ${p.locality} ${p.builder}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (city    !== 'All' && p.city    !== city)    return false;
      if (purpose !== 'All' && p.purpose !== purpose) return false;
      if (type    !== 'All' && p.type    !== type)    return false;
      if (bhk     !== 'All' && p.bhk     !== bhk)    return false;
      if (featuredOnly && !p.featured)                return false;
      if (p.purpose === 'Sale' && p.price > maxBudget) return false;
      return true;
    });
    if (sort === 'price-asc')  r = [...r].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') r = [...r].sort((a, b) => b.price - a.price);
    if (sort === 'area-desc')  r = [...r].sort((a, b) => b.area  - a.area);
    if (sort === 'match')      r = [...r].sort((a, b) => b.matchScore - a.matchScore);
    return r;
  }, [q, city, purpose, type, bhk, featuredOnly, maxBudget, sort]);

  const reset = () => {
    setQ(''); setCity('All'); setPurpose('All'); setType('All');
    setBhk('All'); setMaxBudget(50_000_000); setFeaturedOnly(false); setSort('match');
  };

  const fmtBudget = (n: number) =>
    n >= 10_000_000 ? `₹${(n / 10_000_000).toFixed(2)} Cr` : `₹${(n / 100_000).toFixed(0)} L`;

  const handleShare = (e: React.MouseEvent, p: (typeof properties)[0]) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/properties/${p.id}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: p.title, text: `${p.priceLabel} — ${p.locality}, ${p.city} | NxtSft.com`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Link copied!', { description: p.title });
    }
  };

  const FiltersPanel = (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Search</label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Locality, builder…"
            className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <FilterGroup label="Purpose"       options={PURPOSES} value={purpose} onChange={setPurpose} />
      <FilterGroup label="City"          options={CITIES}   value={city}    onChange={setCity} />
      <FilterGroup label="Type"          options={TYPES}    value={type}    onChange={setType} />
      <FilterGroup label="Configuration" options={BHKS}     value={bhk}     onChange={setBhk} />

      {/* Budget slider */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Max Budget</label>
          <span className="font-display text-sm font-bold text-accent">{fmtBudget(maxBudget)}</span>
        </div>
        <input
          type="range"
          min={1_000_000}
          max={50_000_000}
          step={500_000}
          value={maxBudget}
          onChange={(e) => setMaxBudget(Number(e.target.value))}
          className="mt-3 w-full accent-accent"
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>₹10 L</span><span>₹5 Cr</span>
        </div>
      </div>

      {/* Featured toggle */}
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={featuredOnly}
          onChange={(e) => setFeaturedOnly(e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        <span>Featured only</span>
      </label>

      <button
        onClick={reset}
        className="w-full rounded-lg border border-border bg-white py-2.5 text-sm font-semibold text-navy transition hover:border-accent hover:text-accent"
      >
        Reset Filters
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Page header — stays part of document flow, well-padded */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:py-12">
          <div className="text-xs font-bold uppercase tracking-widest text-accent">Listings</div>
          <h1 className="mt-2 font-display text-3xl font-black text-navy sm:text-4xl">
            {filtered.length.toString().padStart(2, '0')} verified properties
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-matched, RERA-tagged and ready for site visit.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">

          {/* Desktop sidebar — sticky so filters stay visible while scrolling */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div className="font-display text-base font-bold text-navy">Filters</div>
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
              {FiltersPanel}
            </div>
          </aside>

          {/* Main column */}
          <div>
            {/* Toolbar */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              {/* Mobile filter toggle */}
              <button
                onClick={() => setShowMobile(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:border-accent hover:text-accent lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </button>

              <span className="text-xs text-muted-foreground">{filtered.length} results</span>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="ml-auto rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-navy outline-none focus:border-accent"
              >
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            {/* Empty state */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-8 py-20 text-center">
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-secondary text-muted-foreground">
                  <Home size={24} strokeWidth={1.5} />
                </div>
                <div className="font-display text-lg font-bold text-navy">No properties found</div>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  Try widening your budget, changing the city, or removing a filter.
                </p>
                <button
                  onClick={reset}
                  className="mt-6 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/20 transition hover:opacity-90"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              /* Property grid: 1 col mobile, 2 cols sm, 3 cols xl */
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((p) => (
                  <Link
                    key={p.id}
                    href={`/properties/${p.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition duration-200 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-navy/8"
                  >
                    {/* Image — fixed aspect ratio so all cards align */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={p.image}
                        alt={p.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      {p.featured && (
                        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-navy-deep shadow">
                          <Star size={9} className="fill-current" /> Featured
                        </span>
                      )}
                      <span className="absolute right-3 top-3 rounded-lg bg-navy-deep/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold backdrop-blur">
                        {p.matchScore}% match
                      </span>
                      <span className="absolute bottom-3 right-3 rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-navy shadow-sm">
                        {p.purpose}
                      </span>
                      <button
                        onClick={(e) => handleShare(e, p)}
                        title="Share property"
                        className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition hover:bg-white hover:shadow-md"
                      >
                        <Share2 size={14} className="text-navy" />
                      </button>
                    </div>

                    {/* Card body */}
                    <div className="flex flex-1 flex-col p-5">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {p.locality}, {p.city}
                      </div>
                      <h3 className="mt-1 font-display text-base font-bold text-navy line-clamp-2">
                        {p.title}
                      </h3>
                      <div className="mt-auto pt-4 flex items-end justify-between">
                        <div>
                          <div className="font-display text-xl font-black text-accent">{p.priceLabel}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {p.bhk} · {p.area} sqft · {p.type}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-navy">
                          {p.builder}
                        </span>
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
          <div
            className="absolute inset-0 bg-navy-deep/60 backdrop-blur-sm"
            onClick={() => setShowMobile(false)}
          />
          <div className="absolute inset-y-0 right-0 w-[88%] max-w-sm overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="font-display text-lg font-bold text-navy">Filters</div>
              <button
                onClick={() => setShowMobile(false)}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {FiltersPanel}
            <button
              onClick={() => setShowMobile(false)}
              className="mt-6 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/20 transition hover:opacity-90"
            >
              Show {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              value === opt
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-white text-foreground hover:border-accent hover:text-accent'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
