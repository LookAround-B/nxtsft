"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  BedDouble,
  SquareStack,
  X,
  ChevronDown,
  BadgeCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { trpc } from "@/lib/trpc";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { LoadMore } from "@/components/ui/load-more";

const PROPERTY_TYPES = ["Apartment", "Villa", "Studio", "Office", "Bungalow", "Plot", "PG"] as const;
const PURPOSES = ["Sale", "Rent"] as const;
const BHKS = [1, 2, 3, 4, 5];
const CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Pune", "Chennai",
  "Ahmedabad", "Kolkata", "Jaipur", "Noida", "Gurgaon", "Surat",
];

function formatPrice(price: number): string {
  if (price >= 1_00_00_000) return `₹${(price / 1_00_00_000).toFixed(2)} Cr`;
  if (price >= 1_00_000) return `₹${(price / 1_00_000).toFixed(1)} L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

type PropertyItem = {
  id: string;
  slug: string;
  title: string;
  type: string;
  purpose: string;
  price: number;
  area: number;
  bedrooms: number;
  images: string[];
  bhk: string | null;
  rera: string | null;
  featured: boolean;
  location: { city: string; locality: string; state: string };
};

function PropertyCard({ p }: { p: PropertyItem }) {
  const img =
    p.images[0] ??
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80";

  return (
    <Link
      href={`/properties/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-48 overflow-hidden bg-secondary">
        <Image
          src={img}
          alt={p.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${p.purpose === "Sale" ? "bg-accent" : "bg-emerald-500"}`}
          >
            For {p.purpose}
          </span>
          {p.featured && (
            <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white">
              Featured
            </span>
          )}
        </div>
        {p.rera && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-emerald-700 backdrop-blur-sm">
            <BadgeCheck size={11} />
            RERA
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="font-display text-xl font-black text-navy">
          {formatPrice(p.price)}
          {p.purpose === "Rent" && (
            <span className="text-sm font-medium text-muted-foreground">/mo</span>
          )}
        </div>
        <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-foreground">{p.title}</h3>
        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin size={11} className="shrink-0" />
          <span className="line-clamp-1">
            {p.location.locality}, {p.location.city}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs text-foreground/70">
          {p.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <BedDouble size={13} />
              {p.bhk ?? `${p.bedrooms} BHK`}
            </span>
          )}
          <span className="flex items-center gap-1">
            <SquareStack size={13} />
            {p.area.toLocaleString()} sq.ft
          </span>
          <span className="ml-auto rounded-lg bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground/60">
            {p.type}
          </span>
        </div>
      </div>
    </Link>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-accent bg-accent text-white"
          : "border-border bg-white text-foreground/70 hover:border-accent/50 hover:text-accent"
      }`}
    >
      {label}
    </button>
  );
}

function PropertiesInner() {
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [purpose, setPurpose] = useState<"Sale" | "Rent" | "">(
    (searchParams.get("purpose") as "Sale" | "Rent") ?? ""
  );
  const [bedrooms, setBedrooms] = useState<number | undefined>(
    searchParams.get("bedrooms") ? Number(searchParams.get("bedrooms")) : undefined
  );
  const [showFilters, setShowFilters] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = (trpc.properties.list as any).useInfiniteQuery(
    {
      search: search || undefined,
      city: city || undefined,
      type: type || undefined,
      purpose: purpose || undefined,
      bedrooms,
      limit: 12,
    },
    {
      initialCursor: undefined as string | undefined,
      getNextPageParam: (lastPage: { nextCursor: string | null; hasMore: boolean }) => lastPage.nextCursor ?? undefined,
    }
  );

  const properties = (query.data?.pages.flatMap((p: { items: unknown[] }) => p.items) ?? []) as PropertyItem[];
  const hasMore = query.data?.pages.at(-1)?.hasMore ?? false;
  const activeCount = [city, type, purpose, bedrooms].filter(Boolean).length;

  const clearFilters = () => {
    setCity(""); setType(""); setPurpose(""); setBedrooms(undefined);
    setSearch(""); setSearchInput("");
  };

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.01_260)]">
      <SiteHeader />

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-30 border-b border-border bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-5 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <form
              onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }}
              className="flex flex-1 items-center gap-2 rounded-xl border border-input bg-background px-3.5 py-2.5"
            >
              <Search size={16} className="shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by location, project, or type…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {searchInput && (
                <button type="button" onClick={() => { setSearchInput(""); setSearch(""); }}>
                  <X size={14} className="text-muted-foreground" />
                </button>
              )}
            </form>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${showFilters || activeCount > 0 ? "border-accent bg-accent/10 text-accent" : "border-border bg-white text-foreground/70 hover:border-accent/40"}`}
            >
              <SlidersHorizontal size={15} />
              Filters
              {activeCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-black text-white">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-2 pb-1">
              {PURPOSES.map((p) => (
                <FilterChip
                  key={p}
                  label={`For ${p}`}
                  active={purpose === p}
                  onClick={() => setPurpose(purpose === p ? "" : p)}
                />
              ))}

              <div className="relative">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={`appearance-none cursor-pointer rounded-full border px-3.5 py-1.5 pr-7 text-xs font-semibold transition ${type ? "border-accent bg-accent text-white" : "border-border bg-white text-foreground/70"}`}
                >
                  <option value="">Property Type</option>
                  {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={12} className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${type ? "text-white" : "text-muted-foreground"}`} />
              </div>

              <div className="relative">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={`appearance-none cursor-pointer rounded-full border px-3.5 py-1.5 pr-7 text-xs font-semibold transition ${city ? "border-accent bg-accent text-white" : "border-border bg-white text-foreground/70"}`}
                >
                  <option value="">All Cities</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${city ? "text-white" : "text-muted-foreground"}`} />
              </div>

              {BHKS.map((b) => (
                <FilterChip
                  key={b}
                  label={`${b}${b === 5 ? "+" : ""} BHK`}
                  active={bedrooms === b}
                  onClick={() => setBedrooms(bedrooms === b ? undefined : b)}
                />
              ))}

              {activeCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                >
                  <X size={11} />
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        {/* Results summary */}
        <div className="mb-5">
          <h1 className="font-display text-xl font-black text-navy sm:text-2xl">
            {purpose ? `Properties for ${purpose}` : "All Properties"}
            {city ? ` in ${city}` : ""}
          </h1>
          {!query.isLoading && (
            <p className="mt-1 text-sm text-muted-foreground">
              {properties.length} listing{properties.length !== 1 ? "s" : ""} found
              {hasMore && " · more available"}
            </p>
          )}
        </div>

        {/* Loading skeleton */}
        {query.isLoading && <CardGridSkeleton count={6} />}

        {/* Error */}
        {query.isError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
            <p className="font-semibold text-rose-700">Failed to load properties.</p>
            <button
              onClick={() => query.refetch()}
              className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!query.isLoading && !query.isError && properties.length === 0 && (
          <div className="rounded-2xl border border-border bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <Search size={28} className="text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-bold text-navy">No properties found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your filters or search terms.
            </p>
            <button
              onClick={clearFilters}
              className="mt-5 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Property grid */}
        {properties.length > 0 && (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => (
                <PropertyCard key={p.id} p={p} />
              ))}
            </div>

            <LoadMore
              onClick={() => query.fetchNextPage()}
              isLoading={query.isFetchingNextPage}
              hasMore={hasMore}
              shown={properties.length}
              noun="properties"
            />
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <Suspense>
      <PropertiesInner />
    </Suspense>
  );
}
