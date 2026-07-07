"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  BedDouble,
  SquareStack,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Check,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";

const PROPERTY_TYPES = ["Apartment", "Villa", "Studio", "Office", "Bungalow", "Plot", "PG"] as const;
const PURPOSES = ["Sale", "Rent"] as const;
const BHKS = [1, 2, 3, 4, 5];
const FURNISHINGS = [
  { value: "Furnished", label: "Fully Furnished" },
  { value: "Semi-Furnished", label: "Semi Furnished" },
  { value: "Unfurnished", label: "Unfurnished" },
] as const;
type Furnishing = (typeof FURNISHINGS)[number]["value"];
const CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Pune", "Chennai",
  "Ahmedabad", "Kolkata", "Jaipur", "Noida", "Gurgaon", "Surat",
  "Mangalore", "Warangal", "Visakhapatnam", "Amaravati",
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
  const images =
    p.images.length > 0
      ? p.images
      : ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80"];
  const [active, setActive] = useState(0);

  const step = (e: React.MouseEvent, dir: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActive((i) => (i + dir + images.length) % images.length);
  };

  return (
    <Link
      href={`/properties/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-48 overflow-hidden bg-secondary">
        <SafeImage
          src={images[active] ?? images[0]!}
          alt={p.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => step(e, -1)}
              className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-navy opacity-0 shadow transition group-hover:opacity-100 hover:bg-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => step(e, 1)}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-navy opacity-0 shadow transition group-hover:opacity-100 hover:bg-white"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === active ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
                />
              ))}
            </div>
          </>
        )}
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

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
          value
            ? "border-accent bg-accent text-white"
            : "border-border bg-white text-foreground/70 hover:border-accent/40"
        }`}
      >
        {value || placeholder}
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""} ${value ? "text-white" : "text-muted-foreground"}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-40 mt-2 max-h-64 w-44 overflow-y-auto rounded-2xl border border-border bg-white p-1.5 shadow-xl shadow-black/5"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => select("")}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
              !value ? "bg-accent/10 text-accent" : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            {placeholder}
            {!value && <Check size={13} className="text-accent" />}
          </button>
          {options.map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => select(opt)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                  active ? "bg-accent/10 text-accent" : "text-foreground/70 hover:bg-secondary"
                }`}
              >
                {opt}
                {active && <Check size={13} className="text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
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
  const [furnishing, setFurnishing] = useState<Furnishing | "">(
    FURNISHINGS.find((f) => f.value === searchParams.get("furnishing"))?.value ?? ""
  );
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, city, type, purpose, bedrooms, furnishing]);

  const query = trpc.properties.list.useQuery(
    {
      search: search || undefined,
      city: city || undefined,
      type: type || undefined,
      purpose: purpose || undefined,
      bedrooms,
      furnishing: furnishing || undefined,
      page,
      limit: 18, // 3 cols × 6 rows — most traffic is mobile, fewer page flips
    },
    { placeholderData: keepPreviousData },
  );

  const properties = (query.data?.items ?? []) as PropertyItem[];
  const totalPages = query.data?.totalPages ?? 1;
  const activeCount = [city, type, purpose, bedrooms, furnishing].filter(Boolean).length;

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setCity(""); setType(""); setPurpose(""); setBedrooms(undefined); setFurnishing("");
    setSearch(""); setSearchInput(""); setPage(1);
  };

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.01_260)]">

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

              <FilterSelect
                value={type}
                onChange={setType}
                options={PROPERTY_TYPES}
                placeholder="Property Type"
              />

              <FilterSelect
                value={city}
                onChange={setCity}
                options={CITIES}
                placeholder="All Cities"
              />

              {BHKS.map((b) => (
                <FilterChip
                  key={b}
                  label={`${b}${b === 5 ? "+" : ""} BHK`}
                  active={bedrooms === b}
                  onClick={() => setBedrooms(bedrooms === b ? undefined : b)}
                />
              ))}

              {FURNISHINGS.map((f) => (
                <FilterChip
                  key={f.value}
                  label={f.label}
                  active={furnishing === f.value}
                  onClick={() => setFurnishing(furnishing === f.value ? "" : f.value)}
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

            <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
          </>
        )}
      </main>

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
