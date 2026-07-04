"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import { Search, Lamp, MapPin, CheckCircle2, ChevronDown, X, PaintBucket } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Pagination } from "@/components/ui/pagination";

const CITIES = ["Mumbai", "Bengaluru", "Delhi NCR", "Hyderabad", "Pune", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Noida", "Gurgaon", "Kochi"];
const DECOR_CATEGORIES = ["Furniture", "Lighting", "Wall Decor", "Curtains & Blinds", "Rugs & Carpets", "Home Accents"];
const BUDGETS: { label: string; value: number }[] = [
  { label: "Under ₹2 L", value: 200_000 },
  { label: "Under ₹5 L", value: 500_000 },
  { label: "Under ₹10 L", value: 1_000_000 },
  { label: "Under ₹25 L", value: 2_500_000 },
];
const SORTS: { label: string; value: "featured" | "latest" | "popular" | "budget_low" }[] = [
  { label: "Featured", value: "featured" },
  { label: "Latest", value: "latest" },
  { label: "Popular", value: "popular" },
  { label: "Budget: Low to High", value: "budget_low" },
];

export default function DecorPage() {
  const [search,        setSearch]        = useState("");
  const [searchInput,   setSearchInput]   = useState("");
  const [city,          setCity]          = useState("");
  const [decorCategory, setDecorCategory] = useState("");
  const [maxBudget,     setMaxBudget]     = useState("");
  const [sort,          setSort]          = useState<"featured" | "latest" | "popular" | "budget_low">("featured");
  const [page,          setPage]          = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const listQ = trpc.decorStores.publicList.useQuery(
    {
      search: search || undefined,
      city: city || undefined,
      decorCategory: decorCategory || undefined,
      maxBudget: maxBudget ? Number(maxBudget) : undefined,
      sort,
      page,
      limit: 24,
    },
    { placeholderData: keepPreviousData },
  );

  const stores = listQ.data?.items ?? [];
  const total      = listQ.data?.total ?? 0;
  const totalPages = listQ.data?.totalPages ?? 1;

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
  }, [search, city, decorCategory, maxBudget, sort]);

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => { setSearchInput(""); setSearch(""); setCity(""); setDecorCategory(""); setMaxBudget(""); };
  const hasFilters   = search || city || decorCategory || maxBudget;

  return (
    <>
      <main className="min-h-screen bg-background">
        {/* Hero bar */}
        <div className="border-b border-border bg-white px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-black text-navy sm:text-3xl">
                  Decors — Home Decor Store Directory
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Discover trusted furniture, lighting and decor stores near you
                </p>
              </div>
              <Link
                href="/decor/list"
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Lamp size={15} />
                List Your Business
              </Link>
            </div>

            {/* Search + filters */}
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search store or locality…"
                  className="w-full rounded-lg border border-border bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-accent"
                />
              </div>
              <Filter label="City" value={city} onChange={setCity} options={CITIES} />
              <Filter label="Category" value={decorCategory} onChange={setDecorCategory} options={DECOR_CATEGORIES} />
              <BudgetFilter value={maxBudget} onChange={setMaxBudget} />
              <SortFilter value={sort} onChange={setSort} />
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
                <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-white" />
              ))}
            </div>
          ) : stores.length === 0 ? (
            <EmptyState hasFilters={!!hasFilters} onClear={clearFilters} />
          ) : (
            <>
              <p className="mb-4 text-xs text-muted-foreground">
                {total.toLocaleString()} store{total !== 1 ? "s" : ""} found
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(stores as StoreItem[]).map((s) => (
                  <StoreCard key={s.id} store={s} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} total={total} noun="stores" />
            </>
          )}
        </div>
      </main>
    </>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────

type StoreItem = {
  id: string; slug: string; companyName: string; city: string;
  state: string | null; verified: boolean; logo: string | null;
  coverImage: string | null; description: string | null;
  yearsExperience: number | null; projectsCompleted: number;
  decorCategories: string[];
};

// ── Sub-components ─────────────────────────────────────────────────────────

function StoreCard({ store: d }: { store: StoreItem }) {
  return (
    <Link
      href={`/decor/${d.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          {d.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.logo} alt={d.companyName} className="h-10 w-10 rounded-lg object-contain" />
          ) : (
            <Lamp size={22} strokeWidth={1.75} />
          )}
        </div>
        {d.verified && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <CheckCircle2 size={10} /> Verified
          </span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-display text-sm font-bold leading-snug text-navy group-hover:text-accent">
          {d.companyName}
        </h3>
        {(d.city || d.state) && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={10} />
            {[d.city, d.state].filter(Boolean).join(", ")}
          </p>
        )}
        {d.description && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{d.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">
          {d.projectsCompleted} project{d.projectsCompleted !== 1 ? "s" : ""}
          {d.yearsExperience != null ? ` · ${d.yearsExperience}y exp` : ""}
        </span>
        {d.decorCategories[0] && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-navy">
            {d.decorCategories[0]}
          </span>
        )}
      </div>
    </Link>
  );
}

function Filter({ label, value, onChange, options }: {
  label: string; value: string;
  onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-border bg-white py-2 pl-3 pr-7 text-sm outline-none focus:border-accent"
      >
        <option value="">All {label}s</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function BudgetFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-border bg-white py-2 pl-3 pr-7 text-sm outline-none focus:border-accent"
      >
        <option value="">Any Budget</option>
        {BUDGETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function SortFilter({ value, onChange }: { value: string; onChange: (v: "featured" | "latest" | "popular" | "budget_low") => void }) {
  return (
    <div className="relative ml-auto">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as "featured" | "latest" | "popular" | "budget_low")}
        className="appearance-none rounded-lg border border-border bg-white py-2 pl-3 pr-7 text-sm outline-none focus:border-accent"
      >
        {SORTS.map((s) => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <PaintBucket size={48} className="mb-4 text-muted-foreground/30" />
      {hasFilters ? (
        <>
          <p className="font-semibold text-navy">No stores match your filters</p>
          <button onClick={onClear} className="mt-3 text-sm text-accent hover:underline">Clear filters</button>
        </>
      ) : (
        <>
          <p className="font-display text-lg font-bold text-navy">Decor directory coming soon</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            We're onboarding verified decor stores. Check back soon to explore portfolios near you.
          </p>
        </>
      )}
    </div>
  );
}
