'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, Building2, Home, MapPin, Briefcase, Users,
  Star as StarIcon, ArrowRight, CheckCircle2, TrendingUp, ShieldCheck,
  ChevronRight, Laptop, Landmark, GraduationCap, Waves, BookOpen,
  HardHat, Crown, Anchor, Monitor, Sparkles, DollarSign, UserCheck,
  BarChart2, Lock,
} from 'lucide-react';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { properties, portals } from '@/data/static';

/* ─── static data ─────────────────────────────────────────── */

const img = (id: string) =>
  `https://images.unsplash.com/${id}?w=1600&q=80&auto=format&fit=crop`;

const HERO_IMAGES = [
  img('photo-1600596542815-ffad4c1539a9'),
  img('photo-1613490493576-7fde63acd811'),
  img('photo-1545324418-cc1a3fa10c00'),
  img('photo-1600585154340-be6161a56a0c'),
  img('photo-1600607687939-ce8a6c25118c'),
];

const ROTATING_STATS = [
  'Trusted by 1 Lakh+ Happy Customers',
  '10,000+ RERA-Verified Properties',
  'Zero Brokerage — Save Lakhs',
  'Covering 50+ Cities Across India',
  'AI-Matched Listings for Every Budget',
  'Dedicated Relationship Manager Support',
];

const KPI_BAND = [
  { v: '10,000+', l: 'Verified Properties' },
  { v: '50+',     l: 'Cities Covered' },
  { v: '4.8 ★',  l: 'Average Rating' },
  { v: '1 Lakh+', l: 'Happy Customers' },
  { v: '₹0',      l: 'Brokerage Fee' },
  { v: '100%',    l: 'RERA Verified' },
];

const TOP_STATS = [
  { v: '10K+',  l: 'Properties' },
  { v: '2K+',   l: 'Projects' },
  { v: '50+',   l: 'Cities' },
  { v: '100K+', l: 'Customers' },
];

const PROPERTY_TABS = ['All', 'Apartments', 'Villas', 'Commercial', 'PG'];
const TAB_TYPE_MAP: Record<string, string> = {
  Apartments: 'Apartment',
  Villas:     'Villa',
  Commercial: 'Commercial',
  PG:         'PG',
};

const CATEGORIES = [
  { label: 'Apartments',     Icon: Building2,  type: 'Apartment' },
  { label: 'Villas',         Icon: Home,       type: 'Villa' },
  { label: 'Plots',          Icon: MapPin,     type: 'Plot' },
  { label: 'Commercial',     Icon: Briefcase,  type: 'Commercial' },
  { label: 'PG / Co-living', Icon: Users,      type: 'PG' },
  { label: 'New Projects',   Icon: TrendingUp, type: 'New' },
];

const CITIES = [
  { label: 'Mumbai',    Icon: Building2,     tagline: 'Financial Capital' },
  { label: 'Bengaluru', Icon: Laptop,        tagline: 'Silicon Valley of India' },
  { label: 'Delhi NCR', Icon: Landmark,      tagline: 'The Capital Region' },
  { label: 'Hyderabad', Icon: Building2,     tagline: 'City of Pearls' },
  { label: 'Pune',      Icon: GraduationCap, tagline: 'Oxford of the East' },
  { label: 'Chennai',   Icon: Waves,         tagline: 'Gateway to South India' },
  { label: 'Kolkata',   Icon: BookOpen,      tagline: 'Cultural Capital' },
  { label: 'Ahmedabad', Icon: HardHat,       tagline: "India's Manchester" },
  { label: 'Jaipur',    Icon: Crown,         tagline: 'The Pink City' },
  { label: 'Noida',     Icon: Monitor,       tagline: "NCR's IT Hub" },
  { label: 'Gurgaon',   Icon: TrendingUp,    tagline: 'Millennium City' },
  { label: 'Kochi',     Icon: Anchor,        tagline: 'Queen of the Arabian Sea' },
];

const SERVICES = [
  { Icon: Sparkles,    title: 'AI Property Matching',   desc: 'Smart recommendations based on budget, lifestyle and location.' },
  { Icon: ShieldCheck, title: 'RERA Verified Listings',  desc: '100% authentic properties with full legal documentation.' },
  { Icon: DollarSign,  title: 'Zero Brokerage',          desc: 'No middlemen. Connect directly with owners and builders.' },
  { Icon: UserCheck,   title: 'Relationship Manager',   desc: 'Dedicated expert for site visits, paperwork and closing.' },
  { Icon: BarChart2,   title: 'Price Analytics',         desc: 'Market trends, price history and locality comparisons.' },
  { Icon: Lock,        title: 'Secure Transactions',     desc: 'Escrow-backed payments and fraud protection guarantee.' },
];

const REVIEWS = [
  { name: 'Rohan Mehta',  location: 'Mumbai',    initial: 'R', bg: '#1B2B6B', rating: 5, age: '2 days ago',   text: 'Found my dream 3BHK in Bandra through NxtSft.com. The AI matching showed me exactly what I needed — no spam listings, just verified options. Closed in 3 weeks!' },
  { name: 'Aisha Khan',   location: 'Bengaluru', initial: 'A', bg: '#2563EB', rating: 5, age: '1 week ago',   text: 'The relationship manager was incredibly helpful. Organised 4 site visits in a weekend. Zero brokerage saved me ₹1.2 lakhs on my villa in Whitefield.' },
  { name: 'Vikram Singh', location: 'Pune',      initial: 'V', bg: '#059669', rating: 5, age: '2 weeks ago',  text: "First time buyer and was nervous about the process. NxtSft.com's RERA verification gave me confidence. The team handled all paperwork seamlessly." },
  { name: 'Neha Reddy',   location: 'Hyderabad', initial: 'N', bg: '#7C3AED', rating: 5, age: '3 weeks ago',  text: 'Listed my commercial property and got 12 genuine leads in the first week. The CRM dashboard is brilliant — tracks every enquiry automatically.' },
  { name: 'Suresh Iyer',  location: 'Delhi',     initial: 'S', bg: '#DC2626', rating: 5, age: '1 month ago',  text: 'Used the price analytics tool to negotiate ₹8 lakhs off the asking price. The locality comparison charts are incredibly detailed.' },
  { name: 'Kavya Nair',   location: 'Kochi',     initial: 'K', bg: '#D97706', rating: 5, age: '1 month ago',  text: 'Sold my 2BHK in 45 days at asking price. The verified buyer leads are genuinely interested — no tyre-kickers. Worth every rupee of the subscription.' },
];

const PRESS = [
  { outlet: 'Economic Times',    headline: "NxtSft.com disrupts India's real estate brokerage model with zero-fee platform" },
  { outlet: 'Business Standard', headline: 'How AI matching is transforming property discovery in Indian metros' },
  { outlet: 'Forbes India',      headline: "NxtSft.com: The proptech startup making homebuying transparent and affordable" },
  { outlet: 'Mint',              headline: "RERA verification at scale — NxtSft.com's approach to fraud-free listings" },
  { outlet: 'YourStory',         headline: "From search to possession: NxtSft.com's end-to-end real estate platform" },
];

const WHY = [
  { Icon: CheckCircle2, t: 'Verified Properties',  d: '100% RERA-verified listings with zero fraud — every property personally checked.' },
  { Icon: TrendingUp,   t: 'Expert Guidance',       d: 'Dedicated relationship managers at every step from search to possession.' },
  { Icon: ShieldCheck,  t: 'Seamless Transactions', d: 'End-to-end support with escrow-backed payments and fraud protection.' },
];

const PORTAL_COLORS: Record<string, string> = {
  Gold:  'bg-amber-100 text-amber-700',
  Red:   'bg-rose-100 text-rose-600',
  Green: 'bg-emerald-100 text-emerald-700',
  Amber: 'bg-orange-100 text-orange-600',
};

/* ─── helpers ─────────────────────────────────────────────── */

function portalInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-sm ${i < n ? 'text-amber-400' : 'text-border'}`}>★</span>
      ))}
    </span>
  );
}

/* ─── page ────────────────────────────────────────────────── */

export default function HomePage() {
  const router   = useRouter();
  const featured = properties.filter((p) => p.featured);

  const [tab,        setTab]        = useState<'Buy' | 'Rent' | 'Commercial' | 'PG'>('Buy');
  const [query,      setQuery]      = useState('');
  const [statIdx,    setStatIdx]    = useState(0);
  const [fade,       setFade]       = useState(true);
  const [propTab,    setPropTab]    = useState('All');
  const [heroSlide,  setHeroSlide]  = useState(0);

  const carouselRef = useRef<HTMLDivElement>(null);
  const reviewRef   = useRef<HTMLDivElement>(null);

  const shownProps   = propTab === 'All' ? featured : featured.filter((p) => p.type === TAB_TYPE_MAP[propTab]);
  const displayProps = shownProps.length > 0 ? shownProps : featured;

  /* rotating stat ticker */
  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => { setStatIdx((i) => (i + 1) % ROTATING_STATS.length); setFade(true); }, 220);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  /* hero image carousel */
  useEffect(() => {
    const id = setInterval(() => setHeroSlide((i) => (i + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(id);
  }, []);

  const handleSearch = () => {
    const q = query.trim();
    router.push(q ? `/properties?q=${encodeURIComponent(q)}` : '/properties');
  };

  return (
    <div className="min-h-screen" style={{ background: '#F4F5F7' }}>
      <SiteHeader />

      {/* ── Hero with image carousel ──────────────────────────── */}
      <section className="relative overflow-hidden bg-navy">
        {/* Carousel images */}
        <div className="absolute inset-0">
          {HERO_IMAGES.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0 transition-opacity duration-[1400ms]"
              style={{ opacity: i === heroSlide ? 1 : 0 }}
            >
              <img src={src} alt="" className="h-full w-full object-cover" aria-hidden />
            </div>
          ))}
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-navy/65" />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/30 via-transparent to-navy/50" />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-4xl px-4 pb-14 pt-10 text-center sm:px-6 sm:pb-18 sm:pt-16">
          {/* Trust badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold backdrop-blur-sm">
            <span className="text-amber-400">★</span>
            <span className="text-white">4.8</span>
            <span className="mx-0.5 text-white/30">·</span>
            <span className="text-white/85">1 Lakh+ Verified Customers</span>
          </div>

          <h1 className="font-display text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl md:text-[3.75rem]">
            Find a home
            <span className="text-accent"> that fits your life.</span>
          </h1>
          <p className="mt-4 text-sm text-white/75 sm:text-base">
            Verified properties. Trusted experts. Seamless experience.
          </p>

          {/* Search widget */}
          <div className="mx-auto mt-6 max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:mt-8">
            <div className="no-scrollbar flex overflow-x-auto border-b border-border px-3 pt-3 sm:px-4">
              {(['Buy', 'Rent', 'Commercial', 'PG'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`shrink-0 rounded-t-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition sm:px-4
                    ${tab === t ? 'border-b-2 border-accent text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by locality, project or builder"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <button
                onClick={handleSearch}
                className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90 sm:px-6 sm:py-2.5"
              >
                Search
              </button>
            </div>
          </div>

          {/* Rotating ticker */}
          <div className="mt-5 h-5 overflow-hidden">
            <p
              className="text-center text-[11px] font-medium text-white/60 transition-opacity duration-200"
              style={{ opacity: fade ? 1 : 0 }}
            >
              {ROTATING_STATS[statIdx]}
            </p>
          </div>

          {/* Slide dot indicators */}
          <div className="mt-6 flex justify-center gap-1.5">
            {HERO_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroSlide(i)}
                className={`rounded-full transition-all duration-300 ${i === heroSlide ? 'h-1.5 w-5 bg-white' : 'h-1.5 w-1.5 bg-white/35'}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Stat cards ────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        <div className="grid grid-cols-4 gap-3">
          {TOP_STATS.map(({ v, l }, i) => (
            <div
              key={l}
              className="animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-3 text-center shadow-sm sm:p-5"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="font-display text-lg font-black text-navy sm:text-2xl lg:text-3xl">{v}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trending Properties ───────────────────────────────── */}
      <section className="px-4 py-2 sm:px-6 sm:py-3">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-4">
              <div className="text-xs font-bold uppercase tracking-widest text-accent">Hand Picked</div>
              <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">Trending Properties in India</h2>
              <p className="mt-1 text-sm text-muted-foreground">A handpicked collection of India&apos;s most in-demand verified listings.</p>
            </div>

            <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
              {PROPERTY_TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setPropTab(t)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all
                    ${propTab === t ? 'border-transparent bg-navy text-white' : 'border-border bg-white text-muted-foreground hover:border-accent/50'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="relative">
              <div
                ref={carouselRef}
                className="no-scrollbar flex gap-4 overflow-x-auto pb-1"
              >
                {displayProps.map((p) => (
                  <Link
                    key={p.id}
                    href={`/properties/${p.id}`}
                    className="group w-[255px] shrink-0 overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img src={p.image} alt={p.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy shadow">
                        <StarIcon size={7} className="fill-current" /> Featured
                      </span>
                      <span className="absolute right-2.5 top-2.5 rounded-md bg-navy/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur">
                        {p.matchScore}% match
                      </span>
                    </div>
                    <div className="p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.locality}, {p.city}</div>
                      <h3 className="mt-0.5 font-display text-sm font-bold leading-tight text-navy">{p.title}</h3>
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <div className="font-display text-base font-black text-accent">{p.priceLabel}</div>
                          <div className="text-[10px] text-muted-foreground">{p.bhk} · {p.area} sqft</div>
                        </div>
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-navy">{p.type}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <button
                onClick={() => carouselRef.current?.scrollBy({ left: 280, behavior: 'smooth' })}
                className="absolute -right-3 top-[40%] -translate-y-1/2 hidden h-9 w-9 items-center justify-center rounded-full bg-navy text-white shadow-lg transition hover:bg-navy/90 sm:flex"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <Link href="/properties" className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-all hover:gap-2">
                View all properties <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── KPI Band ──────────────────────────────────────────── */}
      <section className="bg-navy px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-0 lg:divide-x lg:divide-white/10">
            {KPI_BAND.map((s) => (
              <div key={s.l} className="flex flex-col items-center text-center lg:px-6">
                <span className="font-display text-2xl font-black text-gold sm:text-3xl">{s.v}</span>
                <span className="mt-1 text-xs font-medium text-white/60">{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────── */}
      <section className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-widest text-accent">Browse by Type</div>
              <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">Top Categories</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-6">
              {CATEGORIES.map(({ label, Icon, type }, i) => (
                <Link
                  key={label}
                  href={`/properties?type=${encodeURIComponent(type)}`}
                  className="group animate-fade-up flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/40 p-4 text-center transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg sm:gap-3 sm:p-5"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white sm:h-12 sm:w-12">
                    <Icon size={18} strokeWidth={1.75} className="sm:hidden" />
                    <Icon size={22} strokeWidth={1.75} className="hidden sm:block" />
                  </span>
                  <span className="font-display text-[11px] font-bold leading-tight text-navy sm:text-sm">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ──────────────────────────────────────────── */}
      <section className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-accent">Platform Features</div>
                <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">Everything You Need at One Place</h2>
                <p className="mt-1 text-sm text-muted-foreground">From discovery to possession — NxtSft.com covers every step.</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {['For Buyers', 'For Sellers'].map((t, i) => (
                  <span
                    key={t}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold
                      ${i === 0 ? 'border-transparent bg-navy text-white' : 'border-border bg-white text-muted-foreground'}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {SERVICES.map(({ Icon, title, desc }) => (
                <div
                  key={title}
                  className="group flex flex-col items-center rounded-2xl border border-border bg-secondary/30 p-4 text-center transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                >
                  <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white">
                    <Icon size={22} strokeWidth={1.75} />
                  </span>
                  <h3 className="mb-1 text-sm font-bold leading-tight text-navy">{title}</h3>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Cities ────────────────────────────────────────────── */}
      <section className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-accent">Pan India Coverage</div>
                <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">Explore Real Estate in Popular Cities</h2>
                <p className="mt-1 text-sm text-muted-foreground">From metro hubs to emerging markets — find properties wherever you need to be.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {CITIES.map(({ label, Icon, tagline }) => (
                <Link
                  key={label}
                  href={`/properties?city=${encodeURIComponent(label)}`}
                  className="group flex flex-col items-center rounded-xl border border-border bg-secondary/30 p-4 text-center transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                >
                  <span className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span className="mb-0.5 text-sm font-bold text-navy">{label}</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">{tagline}</span>
                </Link>
              ))}
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <Link href="/properties" className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-all hover:gap-2">
                View all cities <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reviews ───────────────────────────────────────────── */}
      <section className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-accent">Customer Stories</div>
                <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">What People Say About Us</h2>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-display text-3xl font-black text-navy">4.8</span>
                  <div>
                    <Stars n={5} />
                    <span className="text-xs text-muted-foreground">Based on 10,000+ reviews</span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => reviewRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-transparent hover:bg-navy hover:text-white"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
                <button
                  onClick={() => reviewRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-white transition hover:bg-navy/90"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div ref={reviewRef} className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
              {REVIEWS.map((r) => (
                <div key={r.name} className="w-[285px] shrink-0 rounded-xl border border-border bg-secondary/30 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                      style={{ background: r.bg }}
                    >
                      {r.initial}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">{r.location} · {r.age}</p>
                    </div>
                  </div>
                  <Stars n={r.rating} />
                  <p className="mt-2.5 line-clamp-4 text-[13px] leading-relaxed text-muted-foreground">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why NxtSft.com ───────────────────────────────────────── */}
      <section className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-accent">Why NxtSft.com?</div>
              <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">Built for every journey</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
              {WHY.map(({ Icon, t, d }, i) => (
                <div
                  key={t}
                  className="animate-fade-up flex flex-col rounded-2xl border border-border bg-secondary/30 p-5 transition hover:-translate-y-1 hover:shadow-lg"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Icon size={22} strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold text-navy">{t}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Press marquee ─────────────────────────────────────── */}
      <section className="overflow-hidden border-y border-border bg-white py-5">
        <div
          className="flex whitespace-nowrap"
          style={{ animation: 'marquee 42s linear infinite', width: 'max-content' }}
        >
          {[...PRESS, ...PRESS].map((item, i) => (
            <div key={i} className="inline-flex shrink-0 items-center gap-3 border-r border-border px-8">
              <span className="text-xs font-bold uppercase tracking-widest text-accent">{item.outlet}</span>
              <span className="text-sm text-muted-foreground">&ldquo;{item.headline}&rdquo;</span>
            </div>
          ))}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </section>

      {/* ── Portals ───────────────────────────────────────────── */}
      <section className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-accent">For Every Stakeholder</div>
              <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">Five purpose-built portals</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                From super-admin command to first-time buyers — everyone gets a dedicated workspace.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              {portals.map((p, i) => {
                const colorClass = PORTAL_COLORS[p.accent] ?? 'bg-accent/10 text-accent';
                return (
                  <Link
                    key={p.path}
                    href={p.path}
                    className={`spotlight group animate-fade-up relative overflow-hidden rounded-2xl border border-border bg-secondary/30 p-5 text-center transition hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10
                      ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-sm font-black tracking-tight transition group-hover:scale-110 sm:h-14 sm:w-14 sm:text-base ${colorClass}`}>
                      {portalInitials(p.name)}
                    </div>
                    <div className="mt-3 font-display text-sm font-bold text-navy">{p.name}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{p.role}</div>
                    <div className="mt-2 text-[11px] font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">Enter →</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="px-4 pb-14 pt-5 sm:px-6 sm:pb-16">
        <div className="mx-auto max-w-7xl">
          <div className="animate-fade-up overflow-hidden rounded-3xl bg-navy px-5 py-10 text-center text-white shadow-2xl sm:px-14 sm:py-16">
            <h2 className="font-display text-2xl font-black sm:text-3xl md:text-4xl">Ready to find your perfect home?</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/70 sm:mt-4 sm:text-base">
              Join over 1 lakh buyers who discovered their dream home on NxtSft.com.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                href="/properties"
                className="w-full rounded-xl bg-accent px-8 py-3.5 font-display text-sm font-bold text-white shadow-lg shadow-accent/40 transition hover:opacity-90 sm:w-auto"
              >
                Browse Properties
              </Link>
              <Link
                href="/register"
                className="w-full rounded-xl border border-white/25 bg-white/10 px-8 py-3.5 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 sm:w-auto"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
