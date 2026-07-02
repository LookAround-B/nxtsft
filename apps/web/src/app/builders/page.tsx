"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import { Search, Building2, MapPin, CheckCircle2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";

const CITIES = ["Mumbai", "Bengaluru", "Delhi NCR", "Hyderabad", "Pune", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Noida", "Gurgaon", "Kochi"];
const TYPES  = ["Apartment", "HighRise", "Villa", "Commercial", "Plot", "Studio", "PG", "Others"];

export default function BuildersPage() {
  const [search,     setSearch]     = useState("");
  const [searchInput,setSearchInput]= useState("");
  const [city,       setCity]       = useState("");
  const [type,       setType]       = useState("");
  const [page,       setPage]       = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const listQ = trpc.builders.publicList.useQuery(
    { search: search || undefined, city: city || undefined, type: type || undefined, page, limit: 24 },
    { placeholderData: keepPreviousData },
  );

  const builders   = listQ.data?.items ?? [];
  const total      = listQ.data?.total ?? 0;
  const totalPages = listQ.data?.totalPages ?? 1;

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, city, type]);

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => { setSearchInput(""); setSearch(""); setCity(""); setType(""); };
  const hasFilters   = search || city || type;

  return (
    <>
      <main className="min-h-screen bg-background">
        {/* Hero bar */}
        <div className="border-b border-border bg-white px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-2xl font-black text-navy sm:text-3xl">
              Builders &amp; Developers Directory
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Discover verified builders and their projects across India
            </p>

            {/* Search + filters */}
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search builder or project name…"
                  className="w-full rounded-lg border border-border bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-accent"
                />
              </div>
              <Filter label="City" allLabel="All Cities" value={city} onChange={setCity} options={CITIES} />
              <Filter label="Type" allLabel="All Types" value={type} onChange={setType} options={TYPES} />
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
          ) : builders.length === 0 ? (
            <EmptyState hasFilters={!!hasFilters} onClear={clearFilters} />
          ) : (
            <>
              <p className="mb-4 text-xs text-muted-foreground">
                {total.toLocaleString()} builder{total !== 1 ? "s" : ""} found
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(builders as BuilderItem[]).map((b) => (
                  <BuilderCard key={b.id} builder={b} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} total={total} noun="builders" />
            </>
          )}
        </div>
      </main>
    </>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────

type BuilderItem = {
  id: string; slug: string | null; companyName: string; city: string | null;
  state: string | null; verified: boolean; logo: string | null;
  description: string | null; projectType: string | null;
  _count: { projects: number };
};

// ── Sub-components ─────────────────────────────────────────────────────────

function BuilderCard({ builder: b }: { builder: BuilderItem }) {
  const href = b.slug ? `/builders/${b.slug}` : "#";
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          {b.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logo} alt={b.companyName} className="h-10 w-10 rounded-lg object-contain" />
          ) : (
            <Building2 size={22} strokeWidth={1.75} />
          )}
        </div>
        {b.verified && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <CheckCircle2 size={10} /> Verified
          </span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-display text-sm font-bold leading-snug text-navy group-hover:text-accent">
          {b.companyName}
        </h3>
        {(b.city || b.state) && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={10} />
            {[b.city, b.state].filter(Boolean).join(", ")}
          </p>
        )}
        {b.description && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{b.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">
          {b._count.projects} project{b._count.projects !== 1 ? "s" : ""}
        </span>
        {b.projectType && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-navy">
            {b.projectType}
          </span>
        )}
      </div>
    </Link>
  );
}

function Filter({ label, allLabel, value, onChange, options }: {
  label: string; allLabel: string; value: string;
  onChange: (v: string) => void; options: string[];
}) {
  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
      <SelectTrigger className="w-auto min-w-[9rem]" aria-label={label}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Building2 size={48} className="mb-4 text-muted-foreground/30" />
      {hasFilters ? (
        <>
          <p className="font-semibold text-navy">No builders match your filters</p>
          <button onClick={onClear} className="mt-3 text-sm text-accent hover:underline">Clear filters</button>
        </>
      ) : (
        <>
          <p className="font-display text-lg font-bold text-navy">Builder directory coming soon</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            We're onboarding verified builders from across India. Check back soon to explore projects near you.
          </p>
        </>
      )}
    </div>
  );
}
