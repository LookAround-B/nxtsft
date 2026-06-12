"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Star,
  MapPin,
  ShieldCheck,
  Phone,
  MessageCircle,
  Users,
  TrendingUp,
  Globe,
  Award,
  ArrowRight,
  Building2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ownerSlug } from "@/data/static";
import { AGENTS, type Agent } from "@/data/agents";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

/* ─── Filter constants ────────────────────────────────────────────── */
const CITIES = [
  "All",
  "Mumbai",
  "Delhi NCR",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
  "Kochi",
  "Ahmedabad",
  "Gurugram",
  "Noida",
];
const TYPES = ["All", "RERA Agent", "Commercial", "Builder"];
const SORTS = [
  { id: "featured", label: "Best Match" },
  { id: "rating", label: "Highest Rated" },
  { id: "deals", label: "Most Deals" },
  { id: "listings", label: "Most Listings" },
  { id: "exp", label: "Most Experienced" },
];

/* ─── Agent card ──────────────────────────────────────────────────── */
function AgentCard({ agent, onContact }: { agent: Agent; onContact: (a: Agent) => void }) {
  const yrs = new Date().getFullYear() - agent.since;
  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-navy/8">
      {agent.featured && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-gold/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy">
          <Award size={9} /> Featured
        </span>
      )}

      {/* Avatar + name row */}
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl font-display text-xl font-black text-white ${agent.color}`}
          >
            {agent.initials}
          </div>
          {agent.verified && (
            <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-accent shadow-sm">
              <ShieldCheck size={12} className="text-white" strokeWidth={2.5} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-bold leading-snug text-navy">
            {agent.name}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{agent.role}</div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={10}
                  className={
                    s <= Math.round(agent.rating)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-border text-border"
                  }
                />
              ))}
            </span>
            <span className="text-xs font-bold text-navy">{agent.rating}</span>
            <span className="text-[11px] text-muted-foreground">({agent.reviews})</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-secondary/40 py-3 text-center text-xs">
        <div>
          <div className="font-display text-lg font-black text-navy">{agent.deals}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Deals</div>
        </div>
        <div>
          <div className="font-display text-lg font-black text-navy">{agent.listings}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Listings</div>
        </div>
        <div>
          <div className="font-display text-lg font-black text-navy">{yrs}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Yrs exp</div>
        </div>
      </div>

      {/* Cities + specialties */}
      <div className="mt-4 space-y-2">
        <div className="flex items-start gap-1.5">
          <MapPin size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
          <span className="text-xs text-foreground/70">
            {agent.cities.slice(0, 3).join(" · ")}
            {agent.cities.length > 3 ? ` +${agent.cities.length - 3}` : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {agent.specialties.slice(0, 2).map((s) => (
            <span
              key={s}
              className="rounded-full border border-accent/20 bg-accent/6 px-2.5 py-0.5 text-[10px] font-semibold text-accent"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Globe size={11} className="shrink-0 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">
            {agent.languages.slice(0, 3).join(" · ")}
            {agent.languages.length > 3 ? ` +${agent.languages.length - 3}` : ""}
          </span>
        </div>
      </div>

      {/* Portfolio value + response */}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-[11px]">
        <span className="text-muted-foreground">
          Portfolio: <span className="font-bold text-navy">{agent.portfolioValue}</span>
        </span>
        <span className="text-muted-foreground">
          Replies <span className="font-bold text-navy">{agent.responseTime}</span>
        </span>
      </div>

      {/* CTAs */}
      <div className="mt-4 flex gap-2">
        <Link
          href={`/agents/${ownerSlug(agent.name)}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent"
        >
          View Profile <ArrowRight size={11} />
        </Link>
        <button
          onClick={() => onContact(agent)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-xs font-semibold text-white shadow-sm shadow-accent/20 transition hover:opacity-90"
        >
          <MessageCircle size={12} /> Contact
        </button>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function AgentsPage() {
  const { session } = useAuth();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("All");
  const [type, setType] = useState("All");
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState("featured");
  const [showFilters, setShowFilters] = useState(false);

  const handleContact = (agent: Agent) => {
    if (!session) {
      toast.error("Sign in required", { description: `Sign in to contact ${agent.name}.` });
      return;
    }
    toast.success(`Opening WhatsApp…`, { description: `Connecting you with ${agent.name}.` });
  };

  const filtered = useMemo(() => {
    let r = AGENTS.filter((a) => {
      const haystack =
        `${a.name} ${a.role} ${a.cities.join(" ")} ${a.specialties.join(" ")}`.toLowerCase();
      if (q && !haystack.includes(q.toLowerCase())) return false;
      if (city !== "All" && !a.cities.some((c) => c.toLowerCase().includes(city.toLowerCase())))
        return false;
      if (type === "RERA Agent" && !a.role.includes("RERA")) return false;
      if (type === "Commercial" && !a.role.includes("Commercial")) return false;
      if (type === "Builder" && !a.role.includes("Builder")) return false;
      if (a.rating < minRating) return false;
      return true;
    });
    if (sort === "rating") r = [...r].sort((a, b) => b.rating - a.rating);
    if (sort === "deals") r = [...r].sort((a, b) => b.deals - a.deals);
    if (sort === "listings") r = [...r].sort((a, b) => b.listings - a.listings);
    if (sort === "exp") r = [...r].sort((a, b) => a.since - b.since);
    if (sort === "featured") r = [...r].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return r;
  }, [q, city, type, minRating, sort]);

  const featured = useMemo(() => AGENTS.filter((a) => a.featured), []);

  // Instant typeahead matches (query only) shown right under the search box.
  const qMatches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return AGENTS.filter((a) =>
      `${a.name} ${a.role} ${a.cities.join(" ")} ${a.specialties.join(" ")}`
        .toLowerCase()
        .includes(term),
    );
  }, [q]);
  const quickResults = qMatches.slice(0, 5);

  const scrollToResults = () =>
    document.getElementById("agent-results")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const activeFilters = [
    city !== "All" && city,
    type !== "All" && type,
    minRating > 0 && `${minRating}+ ★`,
  ].filter(Boolean) as string[];

  const clearAll = () => {
    setCity("All");
    setType("All");
    setMinRating(0);
    setSort("featured");
    setQ("");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden border-b border-border"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563EB 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10 mx-auto max-w-4xl px-6 py-16 text-center sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm">
            <Users size={12} /> Real Estate Agents Directory
          </div>
          <h1 className="mt-5 font-display text-4xl font-black leading-tight text-white sm:text-5xl">
            Find the right
            <br className="hidden sm:block" /> property expert
          </h1>
          <p className="mt-4 text-base text-white/65">
            Connect with RERA-verified agents, commercial leasing specialists, and builders across
            India.
          </p>

          {/* Search */}
          <div className="relative mx-auto mt-8 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, city, or speciality…"
              className="w-full rounded-2xl border border-white/20 bg-white/95 py-4 pl-12 pr-5 text-sm text-foreground shadow-lg outline-none placeholder:text-foreground/40 focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-foreground/40 hover:text-foreground"
              >
                <X size={15} />
              </button>
            )}

            {/* Instant results — appear inline as you type */}
            {q.trim() && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-white text-left shadow-2xl">
                {quickResults.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No agents match &ldquo;{q.trim()}&rdquo;. Try a city or speciality.
                  </div>
                ) : (
                  <>
                    <div className="border-b border-border bg-secondary/40 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {qMatches.length} match{qMatches.length !== 1 ? "es" : ""}
                    </div>
                    <ul className="max-h-[19rem] overflow-y-auto">
                      {quickResults.map((a) => (
                        <li key={a.name} className="border-b border-border last:border-0">
                          <Link
                            href={`/agents/${ownerSlug(a.name)}`}
                            className="flex items-center gap-3 px-4 py-3 transition hover:bg-secondary"
                          >
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-black text-white ${a.color}`}
                            >
                              {a.initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-display text-sm font-bold text-navy">
                                  {a.name}
                                </span>
                                {a.verified && (
                                  <ShieldCheck size={12} className="shrink-0 text-accent" />
                                )}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {a.role} · {a.cities.slice(0, 2).join(", ")}
                              </div>
                            </div>
                            <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-navy">
                              <Star size={11} className="fill-amber-400 text-amber-400" /> {a.rating}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {qMatches.length > quickResults.length && (
                      <button
                        onClick={scrollToResults}
                        className="flex w-full items-center justify-center gap-1 bg-secondary/50 px-4 py-2.5 text-center text-xs font-bold text-accent transition hover:bg-secondary"
                      >
                        View all {qMatches.length} results <ArrowRight size={11} />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-10 flex flex-wrap justify-center gap-8">
            {[
              ["500+", "Verified Agents"],
              ["10,000+", "Happy Clients"],
              ["₹5,000 Cr+", "Transacted"],
              ["25+", "Cities Active"],
            ].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="font-display text-2xl font-black text-white">{v}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wider text-white/50">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Filters bar ───────────────────────────────────────────── */}
      <div className="sticky top-16 z-20 border-b border-border bg-white/97 backdrop-blur-md sm:top-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-3 overflow-x-auto py-3 [&::-webkit-scrollbar]:hidden">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent sm:hidden"
            >
              <SlidersHorizontal size={13} /> Filters
              {activeFilters.length > 0 && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                  {activeFilters.length}
                </span>
              )}
            </button>

            {/* City pills */}
            <div className="hidden items-center gap-1.5 sm:flex">
              {CITIES.slice(0, 7).map((c) => (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    city === c
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-white text-foreground/60 hover:border-accent/50 hover:text-accent"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="hidden h-5 w-px shrink-0 bg-border sm:block" />

            {/* Type pills */}
            <div className="hidden items-center gap-1.5 sm:flex">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    type === t
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-white text-foreground/60 hover:border-accent/50 hover:text-accent"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="hidden h-5 w-px shrink-0 bg-border sm:block" />

            {/* Rating filter */}
            <div className="hidden items-center gap-1.5 sm:flex">
              {[
                { id: 0, label: "Any ★" },
                { id: 4.5, label: "4.5+ ★" },
                { id: 4.0, label: "4.0+ ★" },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setMinRating(r.id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    minRating === r.id
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-white text-foreground/60 hover:border-accent/50 hover:text-accent"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Sort (always visible) */}
            <div className="ml-auto shrink-0">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger size="sm" className="min-w-[9rem] rounded-xl font-semibold text-navy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="border-b border-border bg-white px-6 pb-4 sm:hidden">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            City
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CITIES.map((c) => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${city === c ? "border-accent bg-accent text-white" : "border-border text-foreground/60"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mb-3 mt-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Type
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${type === t ? "border-accent bg-accent text-white" : "border-border text-foreground/60"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mb-3 mt-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Min Rating
          </div>
          <div className="flex gap-1.5">
            {[
              { id: 0, label: "Any" },
              { id: 4.5, label: "4.5+" },
              { id: 4.0, label: "4.0+" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setMinRating(r.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${minRating === r.id ? "border-accent bg-accent text-white" : "border-border text-foreground/60"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {activeFilters.length > 0 && (
            <button
              onClick={clearAll}
              className="mt-4 w-full rounded-xl border border-border py-2.5 text-xs font-semibold text-navy"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-8 sm:py-10">
        {/* Active filters + result count */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-navy">
              {filtered.length} agent{filtered.length !== 1 ? "s" : ""}
            </span>
            {activeFilters.map((f) => (
              <span
                key={f}
                className="flex items-center gap-1 rounded-full border border-accent/25 bg-accent/8 px-2.5 py-0.5 text-xs font-semibold text-accent"
              >
                {f}
                <button onClick={clearAll} className="ml-0.5 hover:text-accent/70">
                  <X size={10} />
                </button>
              </span>
            ))}
            {activeFilters.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs font-semibold text-muted-foreground underline hover:text-navy"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Featured strip (only when no query/filter active) */}
        {!q && city === "All" && type === "All" && minRating === 0 && (
          <div className="mb-10">
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-accent">
              Top picks
            </div>
            <h2 className="font-display text-2xl font-black text-navy">
              Featured agents this month
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {featured.map((agent) => (
                <div
                  key={agent.name}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-navy/8"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-black text-white ${agent.color}`}
                    >
                      {agent.initials}
                      {agent.verified && (
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-accent">
                          <ShieldCheck size={10} className="text-white" strokeWidth={2.5} />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-display text-sm font-bold text-navy">{agent.name}</div>
                      <div className="text-[11px] text-muted-foreground">{agent.role}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        <Star size={10} className="fill-amber-400 text-amber-400" />
                        <span className="font-bold text-navy">{agent.rating}</span>
                        <span className="text-muted-foreground">· {agent.deals} deals</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/agents/${ownerSlug(agent.name)}`}
                      className="flex flex-1 items-center justify-center rounded-xl border border-border py-2 text-[11px] font-semibold text-navy transition hover:border-accent hover:text-accent"
                    >
                      View Profile
                    </Link>
                    <button
                      onClick={() => handleContact(agent)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-accent py-2 text-[11px] font-semibold text-white transition hover:opacity-90"
                    >
                      <MessageCircle size={11} /> Contact
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 border-b border-dashed border-border" />
          </div>
        )}

        {/* ── Agent grid ──────────────────────────────────────────── */}
        <div id="agent-results" className="mb-2 scroll-mt-32 text-xs font-bold uppercase tracking-widest text-accent">
          {!q && city === "All" ? "All agents" : "Results"}
        </div>
        <h2 className="mb-6 font-display text-2xl font-black text-navy">
          {!q && city === "All"
            ? "Browse all agents"
            : `${filtered.length} agent${filtered.length !== 1 ? "s" : ""} found`}
        </h2>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-8 py-20 text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-secondary text-muted-foreground">
              <Users size={24} strokeWidth={1.5} />
            </div>
            <div className="font-display text-lg font-bold text-navy">No agents found</div>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Try adjusting the city, type, or rating filter.
            </p>
            <button
              onClick={clearAll}
              className="mt-6 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/20 hover:opacity-90"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((agent) => (
              <AgentCard key={agent.name} agent={agent} onContact={handleContact} />
            ))}
          </div>
        )}
      </div>

      {/* ── Join CTA ──────────────────────────────────────────────── */}
      <section className="border-t border-border bg-gradient-to-r from-navy-deep/5 via-accent/4 to-navy-deep/5">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="grid gap-8 sm:grid-cols-3 sm:gap-12">
            {[
              {
                icon: TrendingUp,
                title: "Grow your business",
                desc: "Get exclusive buyer and tenant leads matched to your areas of expertise.",
              },
              {
                icon: Building2,
                title: "List for free",
                desc: "Post unlimited listings on your agent profile. No per-listing charges.",
              },
              {
                icon: Award,
                title: "Build your brand",
                desc: "Collect verified reviews, showcase closed deals, and become a top-rated agent.",
              },
            ].map((b) => (
              <div key={b.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <b.icon size={20} />
                </div>
                <div>
                  <div className="font-semibold text-navy">{b.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-accent/20 bg-white p-8 text-center shadow-sm sm:flex-row sm:text-left">
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-widest text-accent">
                Are you a RERA-certified agent?
              </div>
              <div className="mt-1 font-display text-xl font-black text-navy">
                Join NxtSft.com as a verified partner
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Free to list · No hidden fees · RERA badge on your profile
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-sm shadow-accent/20 transition hover:opacity-90"
              >
                Join as Agent <ArrowRight size={15} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold text-navy transition hover:bg-secondary"
              >
                Learn more
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
