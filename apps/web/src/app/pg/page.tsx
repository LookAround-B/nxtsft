"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import {
  Search, BedDouble, MapPin, CheckCircle2, ChevronDown, X, Users,
  Wifi, UtensilsCrossed, Wind, Car, WashingMachine, Home,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Pagination } from "@/components/ui/pagination";

const CITIES = ["Mumbai", "Bengaluru", "Delhi NCR", "Hyderabad", "Pune", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Noida", "Gurgaon", "Kochi"];
const GENDERS = ["Boys", "Girls", "Co-living"] as const;
const OCCUPANCY = ["Single", "Double", "Triple", "Four Sharing"];
const RENTS: { label: string; value: number }[] = [
  { label: "Under ₹8,000", value: 8_000 },
  { label: "Under ₹12,000", value: 12_000 },
  { label: "Under ₹18,000", value: 18_000 },
  { label: "Under ₹25,000", value: 25_000 },
];

// Amenity → icon map for the small chip row on each card.
const AMENITY_ICONS: { match: RegExp; Icon: typeof Wifi; label: string }[] = [
  { match: /wi-?fi|internet/i, Icon: Wifi, label: "Wi-Fi" },
  { match: /food|meal|mess|tiffin/i, Icon: UtensilsCrossed, label: "Food" },
  { match: /\bac\b|air.?condition/i, Icon: Wind, label: "AC" },
  { match: /parking/i, Icon: Car, label: "Parking" },
  { match: /laundry|washing/i, Icon: WashingMachine, label: "Laundry" },
];

function fmtRent(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function PgPage() {
  const [search,      setSearch]      = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [city,        setCity]        = useState("");
  const [gender,      setGender]      = useState<"" | (typeof GENDERS)[number]>("");
  const [occupancy,   setOccupancy]   = useState("");
  const [maxRent,     setMaxRent]     = useState("");
  const [page,        setPage]        = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const listQ = trpc.properties.list.useQuery(
    {
      type: "PG",
      search: search || undefined,
      city: city || undefined,
      pgGender: gender || undefined,
      pgOccupancy: occupancy || undefined,
      maxPrice: maxRent ? Number(maxRent) : undefined,
      page,
      limit: 24,
    },
    { placeholderData: keepPreviousData },
  );

  const pgs        = listQ.data?.items ?? [];
  const totalPages  = listQ.data?.totalPages ?? 1;

  // Prefill from ?q= (hero search hands off the query here).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) { setSearchInput(q); setSearch(q); }
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, city, gender, occupancy, maxRent]);

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => { setSearchInput(""); setSearch(""); setCity(""); setGender(""); setOccupancy(""); setMaxRent(""); };
  const hasFilters   = search || city || gender || occupancy || maxRent;

  return (
    <main className="min-h-screen bg-background">
      {/* Hero bar */}
      <div className="border-b border-border bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-2xl font-black text-navy sm:text-3xl">
            PG &amp; Co-living — Verified Listings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Discover PGs with professional photos, virtual tours and direct owner contact — no brokers.
          </p>

          {/* Search + filters */}
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="relative min-w-55 flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by PG name, locality or college…"
                className="w-full rounded-lg border border-border bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-accent"
              />
            </div>
            <Select label="City" value={city} onChange={setCity} options={CITIES} />
            <Select label="Occupancy" value={occupancy} onChange={setOccupancy} options={OCCUPANCY} />
            <div className="relative">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as "" | (typeof GENDERS)[number])}
                className="appearance-none rounded-lg border border-border bg-white py-2 pl-3 pr-7 text-sm outline-none focus:border-accent"
              >
                <option value="">Any Gender</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <div className="relative">
              <select
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
                className="appearance-none rounded-lg border border-border bg-white py-2 pl-3 pr-7 text-sm outline-none focus:border-accent"
              >
                <option value="">Any Rent</option>
                {RENTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary">
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {listQ.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-white" />
            ))}
          </div>
        ) : pgs.length === 0 ? (
          <EmptyState hasFilters={!!hasFilters} onClear={clearFilters} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(pgs as PgItem[]).map((p) => <PgCard key={p.id} pg={p} />)}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
          </>
        )}
      </div>
    </main>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────

type PgItem = {
  id: string; slug: string; title: string; price: number; featured: boolean;
  images: string[]; amenities: string[];
  pgGender: string | null; pgOccupancy: string[]; pgAvailableBeds: number | null;
  location: { city: string; locality: string; state: string } | null;
};

// ── Sub-components ─────────────────────────────────────────────────────────

function PgCard({ pg: p }: { pg: PgItem }) {
  const cover = p.images[0] ?? "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80";
  const amenityChips = AMENITY_ICONS.filter(({ match }) => p.amenities.some((a) => match.test(a)));

  return (
    <Link
      href={`/properties/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
        {p.featured && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            <CheckCircle2 size={10} /> Verified
          </span>
        )}
        {p.pgGender && (
          <span className="absolute right-3 top-3 rounded-full bg-navy/80 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            {p.pgGender}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-sm font-bold leading-snug text-navy group-hover:text-accent">{p.title}</h3>
        {p.location && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={10} />{[p.location.locality, p.location.city].filter(Boolean).join(", ")}
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          {p.pgOccupancy.slice(0, 2).map((o) => (
            <span key={o} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
              <Users size={10} />{o}
            </span>
          ))}
          {p.pgAvailableBeds != null && (
            <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
              <BedDouble size={10} />{p.pgAvailableBeds} beds
            </span>
          )}
        </div>

        {amenityChips.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-muted-foreground/70">
            {amenityChips.map(({ Icon, label }) => <Icon key={label} size={13} />)}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between border-t border-border pt-3">
          <div>
            <div className="font-display text-base font-black text-navy">{fmtRent(p.price)}</div>
            <div className="text-[10px] text-muted-foreground">starting / month</div>
          </div>
          <span className="rounded-lg bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">View Details</span>
        </div>
      </div>
    </Link>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-border bg-white py-2 pl-3 pr-7 text-sm outline-none focus:border-accent"
      >
        <option value="">All {label}{label.endsWith("y") ? "" : "s"}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Home size={48} className="mb-4 text-muted-foreground/30" />
      {hasFilters ? (
        <>
          <p className="font-semibold text-navy">No PGs match your filters</p>
          <button onClick={onClear} className="mt-3 text-sm text-accent hover:underline">Clear filters</button>
        </>
      ) : (
        <>
          <p className="font-display text-lg font-bold text-navy">PG listings coming soon</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            We&apos;re onboarding verified PGs with professional media. Check back soon to explore near you.
          </p>
        </>
      )}
    </div>
  );
}
