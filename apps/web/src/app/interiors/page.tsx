"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import { Search, Sofa, MapPin, CheckCircle2, ChevronDown, X, Palette } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Pagination } from "@/components/ui/pagination";

const CITIES = ["Mumbai", "Bengaluru", "Delhi NCR", "Hyderabad", "Pune", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Noida", "Gurgaon", "Kochi"];
const DESIGN_STYLES = ["Modern", "Minimal", "Luxury", "Contemporary", "Traditional", "Industrial"];
// Negative values are a floor (minBudget), not a ceiling — see BudgetFilter's
// consumer, which splits the sign back out into minBudget/maxBudget.
const BUDGETS: { label: string; value: number }[] = [
  { label: "Under ₹2 L", value: 200_000 },
  { label: "Under ₹5 L", value: 500_000 },
  { label: "Under ₹10 L", value: 1_000_000 },
  { label: "Under ₹25 L", value: 2_500_000 },
  { label: "Above ₹25 L", value: -2_500_000 },
];
const SORTS: { label: string; value: "featured" | "latest" | "popular" | "budget_low" }[] = [
  { label: "Featured", value: "featured" },
  { label: "Latest", value: "latest" },
  { label: "Popular", value: "popular" },
  { label: "Budget: Low to High", value: "budget_low" },
];

export default function InteriorsPage() {
  const [search,      setSearch]      = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [city,        setCity]        = useState("");
  const [designStyle, setDesignStyle] = useState("");
  const [maxBudget,   setMaxBudget]   = useState("");
  const [sort,        setSort]        = useState<"featured" | "latest" | "popular" | "budget_low">("featured");
  const [page,        setPage]        = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const listQ = trpc.interiorDesigners.publicList.useQuery(
    {
      search: search || undefined,
      city: city || undefined,
      designStyle: designStyle || undefined,
      maxBudget: maxBudget && Number(maxBudget) > 0 ? Number(maxBudget) : undefined,
      minBudget: maxBudget && Number(maxBudget) < 0 ? Math.abs(Number(maxBudget)) : undefined,
      sort,
      page,
      limit: 24,
    },
    { placeholderData: keepPreviousData },
  );

  const designers = listQ.data?.items ?? [];
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
  }, [search, city, designStyle, maxBudget, sort]);

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => { setSearchInput(""); setSearch(""); setCity(""); setDesignStyle(""); setMaxBudget(""); };
  const hasFilters   = search || city || designStyle || maxBudget;

  return (
    <>
      <main className="min-h-screen bg-background">
        {/* Hero bar */}
        <div className="border-b border-border bg-white px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-black text-navy sm:text-3xl">
                  Interior Designers
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Discover trusted interior design companies and their portfolios near you
                </p>
              </div>
              <Link
                href="/interiors/list"
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Sofa size={15} />
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
                  placeholder="Search designer or locality…"
                  className="w-full rounded-lg border border-border bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-accent"
                />
              </div>
              <Filter label="City" value={city} onChange={setCity} options={CITIES} />
              <Filter label="Style" value={designStyle} onChange={setDesignStyle} options={DESIGN_STYLES} />
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
          ) : designers.length === 0 ? (
            <EmptyState hasFilters={!!hasFilters} onClear={clearFilters} />
          ) : (
            <>
              <p className="mb-4 text-xs text-muted-foreground">
                {total.toLocaleString()} designer{total !== 1 ? "s" : ""} found
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(designers as DesignerItem[]).map((d) => (
                  <DesignerCard key={d.id} designer={d} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} total={total} noun="designers" />
            </>
          )}
        </div>
      </main>
    </>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────

type DesignerItem = {
  id: string; slug: string; companyName: string; city: string;
  state: string | null; verified: boolean; logo: string | null;
  coverImage: string | null; description: string | null;
  yearsExperience: number | null; projectsCompleted: number;
  designStyles: string[]; startingBudget: number | null;
};

const DESIGNER_FALLBACK_IMG =
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80";

function formatBudget(budget: number): string {
  if (budget >= 1_00_00_000) return `₹${(budget / 1_00_00_000).toFixed(2)} Cr`;
  if (budget >= 1_00_000) return `₹${(budget / 1_00_000).toFixed(1)} L`;
  return `₹${budget.toLocaleString("en-IN")}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────

// Image-forward card matching the property-listing card layout — clicking it
// opens the designer's portfolio page (/interiors/[slug]).
function DesignerCard({ designer: d }: { designer: DesignerItem }) {
  const cover = d.coverImage || d.logo || DESIGNER_FALLBACK_IMG;
  return (
    <Link
      href={`/interiors/${d.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-48 overflow-hidden bg-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={d.companyName}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {d.designStyles[0] && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-white">
              {d.designStyles[0]}
            </span>
          )}
        </div>
        {d.verified && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-emerald-700 backdrop-blur-sm">
            <CheckCircle2 size={11} />
            Verified
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="font-display text-xl font-black text-navy">
          {d.startingBudget != null ? (
            <>
              {formatBudget(d.startingBudget)}
              <span className="text-sm font-medium text-muted-foreground"> onwards</span>
            </>
          ) : (
            <span className="text-base font-bold text-muted-foreground">Get a quote</span>
          )}
        </div>
        <h3 className="mt-1 line-clamp-1 font-display text-sm font-bold text-navy group-hover:text-accent">
          {d.companyName}
        </h3>
        {(d.city || d.state) && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={11} className="shrink-0" />
            <span className="line-clamp-1">{[d.city, d.state].filter(Boolean).join(", ")}</span>
          </div>
        )}
        <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs text-foreground/70">
          <span className="flex items-center gap-1">
            <Sofa size={13} />
            {d.projectsCompleted} project{d.projectsCompleted !== 1 ? "s" : ""}
          </span>
          {d.yearsExperience != null && (
            <span className="flex items-center gap-1">
              <CheckCircle2 size={13} />
              {d.yearsExperience}y exp
            </span>
          )}
        </div>
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
      <Palette size={48} className="mb-4 text-muted-foreground/30" />
      {hasFilters ? (
        <>
          <p className="font-semibold text-navy">No designers match your filters</p>
          <button onClick={onClear} className="mt-3 text-sm text-accent hover:underline">Clear filters</button>
        </>
      ) : (
        <>
          <p className="font-display text-lg font-bold text-navy">Designer directory coming soon</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            We're onboarding verified interior design companies. Check back soon to explore portfolios near you.
          </p>
        </>
      )}
    </div>
  );
}
