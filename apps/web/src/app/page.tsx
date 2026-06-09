"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Home,
  MapPin,
  Briefcase,
  Users,
  Star as StarIcon,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Laptop,
  Landmark,
  GraduationCap,
  Waves,
  BookOpen,
  HardHat,
  Crown,
  Anchor,
  Monitor,
  Sparkles,
  DollarSign,
  UserCheck,
  BarChart2,
  Lock,
} from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { properties, portals } from "@/data/static";

/* ─── static data ──────────────────────────────────── */

const img = (id: string) => `https://images.unsplash.com/${id}?w=1600&q=80&auto=format&fit=crop`;

const HERO_IMAGES = [
  img("photo-1600596542815-ffad4c1539a9"),
  img("photo-1613490493576-7fde63acd811"),
  img("photo-1545324418-cc1a3fa10c00"),
  img("photo-1600585154340-be6161a56a0c"),
  img("photo-1600607687939-ce8a6c25118c"),
];

const ROTATING_STATS = [
  "Trusted by 1 Lakh+ Happy Customers",
  "10,000+ RERA-Verified Properties",
  "Zero Brokerage — Save Lakhs",
  "Covering 50+ Cities Across India",
  "AI-Matched Listings for Every Budget",
  "Dedicated Relationship Manager Support",
];

const KPI_BAND = [
  { v: "10,000+", l: "Verified Properties" },
  { v: "50+", l: "Cities Covered" },
  { v: "4.8 ★", l: "Average Rating" },
  { v: "1 Lakh+", l: "Happy Customers" },
  { v: "₹0", l: "Brokerage Fee" },
  { v: "100%", l: "RERA Verified" },
];

/* Numeric versions for count-up animation */
const TOP_STATS_DATA = [
  { num: 10, suffix: "K+", l: "Properties" },
  { num: 2, suffix: "K+", l: "Projects" },
  { num: 50, suffix: "+", l: "Cities" },
  { num: 100, suffix: "K+", l: "Customers" },
];

const PROPERTY_TABS = ["All", "Apartments", "Villas", "Commercial", "PG"];
const TAB_TYPE_MAP: Record<string, string> = {
  Apartments: "Apartment",
  Villas: "Villa",
  Commercial: "Commercial",
  PG: "PG",
};

const CATEGORIES = [
  { label: "Apartments", Icon: Building2, type: "Apartment" },
  { label: "Villas", Icon: Home, type: "Villa" },
  { label: "Plots", Icon: MapPin, type: "Plot" },
  { label: "Commercial", Icon: Briefcase, type: "Commercial" },
  { label: "PG / Co-living", Icon: Users, type: "PG" },
  { label: "New Projects", Icon: TrendingUp, type: "New" },
];

const CITIES = [
  { label: "Mumbai", Icon: Building2, tagline: "Financial Capital" },
  { label: "Bengaluru", Icon: Laptop, tagline: "Silicon Valley of India" },
  { label: "Delhi NCR", Icon: Landmark, tagline: "The Capital Region" },
  { label: "Hyderabad", Icon: Building2, tagline: "City of Pearls" },
  { label: "Pune", Icon: GraduationCap, tagline: "Oxford of the East" },
  { label: "Chennai", Icon: Waves, tagline: "Gateway to South India" },
  { label: "Kolkata", Icon: BookOpen, tagline: "Cultural Capital" },
  { label: "Ahmedabad", Icon: HardHat, tagline: "India's Manchester" },
  { label: "Jaipur", Icon: Crown, tagline: "The Pink City" },
  { label: "Noida", Icon: Monitor, tagline: "NCR's IT Hub" },
  { label: "Gurgaon", Icon: TrendingUp, tagline: "Millennium City" },
  { label: "Kochi", Icon: Anchor, tagline: "Queen of the Arabian Sea" },
];

const SERVICES = [
  {
    Icon: Sparkles,
    title: "AI Property Matching",
    desc: "Smart recommendations based on budget, lifestyle and location.",
  },
  {
    Icon: ShieldCheck,
    title: "RERA Verified Listings",
    desc: "100% authentic properties with full legal documentation.",
  },
  {
    Icon: DollarSign,
    title: "Zero Brokerage",
    desc: "No middlemen. Connect directly with owners and builders.",
  },
  {
    Icon: UserCheck,
    title: "Relationship Manager",
    desc: "Dedicated expert for site visits, paperwork and closing.",
  },
  {
    Icon: BarChart2,
    title: "Price Analytics",
    desc: "Market trends, price history and locality comparisons.",
  },
  {
    Icon: Lock,
    title: "Secure Transactions",
    desc: "Escrow-backed payments and fraud protection guarantee.",
  },
];

const REVIEWS = [
  {
    name: "Rohan Mehta",
    location: "Mumbai",
    initial: "R",
    bg: "#1B2B6B",
    rating: 5,
    age: "2 days ago",
    text: "Found my dream 3BHK in Bandra through NxtSft.com. The AI matching showed me exactly what I needed — no spam listings, just verified options. Closed in 3 weeks!",
  },
  {
    name: "Aisha Khan",
    location: "Bengaluru",
    initial: "A",
    bg: "#2563EB",
    rating: 5,
    age: "1 week ago",
    text: "The relationship manager was incredibly helpful. Organised 4 site visits in a weekend. Zero brokerage saved me ₹1.2 lakhs on my villa in Whitefield.",
  },
  {
    name: "Vikram Singh",
    location: "Pune",
    initial: "V",
    bg: "#059669",
    rating: 5,
    age: "2 weeks ago",
    text: "First time buyer and was nervous about the process. NxtSft.com's RERA verification gave me confidence. The team handled all paperwork seamlessly.",
  },
  {
    name: "Neha Reddy",
    location: "Hyderabad",
    initial: "N",
    bg: "#7C3AED",
    rating: 5,
    age: "3 weeks ago",
    text: "Listed my commercial property and got 12 genuine leads in the first week. The CRM dashboard is brilliant — tracks every enquiry automatically.",
  },
  {
    name: "Suresh Iyer",
    location: "Delhi",
    initial: "S",
    bg: "#DC2626",
    rating: 5,
    age: "1 month ago",
    text: "Used the price analytics tool to negotiate ₹8 lakhs off the asking price. The locality comparison charts are incredibly detailed.",
  },
  {
    name: "Kavya Nair",
    location: "Kochi",
    initial: "K",
    bg: "#D97706",
    rating: 5,
    age: "1 month ago",
    text: "Sold my 2BHK in 45 days at asking price. The verified buyer leads are genuinely interested — no tyre-kickers. Worth every rupee of the subscription.",
  },
];

const PRESS = [
  {
    outlet: "Economic Times",
    headline: "NxtSft.com disrupts India's real estate brokerage model with zero-fee platform",
  },
  {
    outlet: "Business Standard",
    headline: "How AI matching is transforming property discovery in Indian metros",
  },
  {
    outlet: "Forbes India",
    headline: "NxtSft.com: The proptech startup making homebuying transparent and affordable",
  },
  {
    outlet: "Mint",
    headline: "RERA verification at scale — NxtSft.com's approach to fraud-free listings",
  },
  {
    outlet: "YourStory",
    headline: "From search to possession: NxtSft.com's end-to-end real estate platform",
  },
];

const WHY = [
  {
    Icon: CheckCircle2,
    t: "Verified Properties",
    d: "100% RERA-verified listings with zero fraud — every property personally checked.",
  },
  {
    Icon: TrendingUp,
    t: "Expert Guidance",
    d: "Dedicated relationship managers at every step from search to possession.",
  },
  {
    Icon: ShieldCheck,
    t: "Seamless Transactions",
    d: "End-to-end support with escrow-backed payments and fraud protection.",
  },
];

const PORTAL_COLORS: Record<string, string> = {
  Gold: "bg-amber-100 text-amber-700",
  Red: "bg-rose-100 text-rose-600",
  Green: "bg-emerald-100 text-emerald-700",
  Amber: "bg-orange-100 text-orange-600",
};

/* ─── helpers ──────────────────────────────────────── */

function portalInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-sm ${i < n ? "text-amber-400" : "text-border"}`}>
          ★
        </span>
      ))}
    </span>
  );
}

/* ── Count-up hook ─────────────────────────────────── */
function useCountUp(target: number, duration = 1600, active = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return value;
}

/* ─── ILLUSTRATION COMPONENTS ──────────────────────── */

/* Floating blobs behind hero content */
function HeroBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -right-24 -top-8 h-[420px] w-[420px] animate-blob rounded-full opacity-25 blur-[90px]"
        style={{ background: "oklch(0.72 0.12 186)" }}
      />
      <div
        className="absolute -left-16 top-1/3 h-[300px] w-[300px] animate-blob-slow rounded-full opacity-20 blur-[70px]"
        style={{ background: "oklch(0.76 0.14 76)" }}
      />
      <div
        className="absolute bottom-8 right-1/3 h-[200px] w-[200px] animate-float rounded-full opacity-10 blur-[60px]"
        style={{ background: "oklch(0.72 0.12 186)" }}
      />
      {/* Spinning ring top-left */}
      <div className="absolute left-8 top-8 h-20 w-20 animate-spin-slow rounded-full border border-white/10" />
      <div className="absolute right-16 bottom-16 h-12 w-12 animate-spin-slow-r rounded-full border border-white/8" />
    </div>
  );
}

/* Animated stat card with count-up */
function AnimatedStatCard({
  num,
  suffix,
  l,
  delay,
}: {
  num: number;
  suffix: string;
  l: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const count = useCountUp(num, 1500, active);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setActive(true);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal="scale"
      data-visible=""
      className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-3 text-center shadow-sm sm:p-5"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="font-display text-lg font-black text-navy sm:text-2xl lg:text-3xl">
        {active ? count : 0}
        {suffix}
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
        {l}
      </div>
    </div>
  );
}

/* Property / house illustration for Services section */
function PropertyIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none relative select-none ${className}`} aria-hidden>
      <div className="animate-float">
        <svg width="280" height="260" viewBox="0 0 280 260" fill="none">
          {/* shadow */}
          <ellipse cx="140" cy="250" rx="90" ry="8" fill="oklch(0.20 0.07 258)" opacity="0.06" />
          {/* body */}
          <rect
            x="50"
            y="110"
            width="180"
            height="132"
            rx="10"
            fill="oklch(0.20 0.07 258)"
            opacity="0.05"
          />
          <rect
            x="50"
            y="110"
            width="180"
            height="132"
            rx="10"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="1.2"
            opacity="0.18"
          />
          {/* roof */}
          <path d="M140 28 L242 110 L38 110 Z" fill="oklch(0.20 0.07 258)" opacity="0.08" />
          <path
            d="M140 28 L242 110 L38 110 Z"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity="0.3"
          />
          {/* chimney */}
          <rect
            x="188"
            y="54"
            width="14"
            height="38"
            rx="3"
            fill="oklch(0.20 0.07 258)"
            opacity="0.1"
          />
          <rect
            x="186"
            y="50"
            width="18"
            height="8"
            rx="2"
            fill="oklch(0.20 0.07 258)"
            opacity="0.12"
          />
          {/* left window */}
          <rect
            x="72"
            y="130"
            width="48"
            height="42"
            rx="5"
            fill="oklch(0.72 0.12 186)"
            opacity="0.12"
          />
          <rect
            x="72"
            y="130"
            width="48"
            height="42"
            rx="5"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="1"
            opacity="0.3"
          />
          <line
            x1="96"
            y1="130"
            x2="96"
            y2="172"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="0.8"
            opacity="0.5"
          />
          <line
            x1="72"
            y1="151"
            x2="120"
            y2="151"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="0.8"
            opacity="0.5"
          />
          {/* right window */}
          <rect
            x="160"
            y="130"
            width="48"
            height="42"
            rx="5"
            fill="oklch(0.72 0.12 186)"
            opacity="0.12"
          />
          <rect
            x="160"
            y="130"
            width="48"
            height="42"
            rx="5"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="1"
            opacity="0.3"
          />
          <line
            x1="184"
            y1="130"
            x2="184"
            y2="172"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="0.8"
            opacity="0.5"
          />
          <line
            x1="160"
            y1="151"
            x2="208"
            y2="151"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="0.8"
            opacity="0.5"
          />
          {/* door */}
          <rect
            x="112"
            y="182"
            width="56"
            height="60"
            rx="5"
            fill="oklch(0.20 0.07 258)"
            opacity="0.07"
          />
          <rect
            x="112"
            y="182"
            width="56"
            height="60"
            rx="5"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="1"
            opacity="0.2"
          />
          <path
            d="M112 186 Q140 163 168 186"
            fill="none"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="1.2"
            opacity="0.3"
          />
          <circle cx="162" cy="212" r="3.5" fill="oklch(0.76 0.14 76)" opacity="0.7" />
          {/* trees */}
          <ellipse cx="28" cy="204" rx="16" ry="18" fill="oklch(0.72 0.12 186)" opacity="0.1" />
          <rect
            x="25"
            y="220"
            width="6"
            height="22"
            rx="3"
            fill="oklch(0.20 0.07 258)"
            opacity="0.08"
          />
          <ellipse cx="252" cy="200" rx="16" ry="18" fill="oklch(0.72 0.12 186)" opacity="0.1" />
          <rect
            x="249"
            y="216"
            width="6"
            height="26"
            rx="3"
            fill="oklch(0.20 0.07 258)"
            opacity="0.08"
          />
          {/* ground */}
          <rect
            x="38"
            y="241"
            width="204"
            height="3"
            rx="1.5"
            fill="oklch(0.20 0.07 258)"
            opacity="0.07"
          />
          {/* decorative dots */}
          <circle cx="18" cy="95" r="5.5" fill="oklch(0.76 0.14 76)" opacity="0.45" />
          <circle cx="262" cy="72" r="4.5" fill="oklch(0.72 0.12 186)" opacity="0.4" />
          <circle cx="258" cy="200" r="4" fill="oklch(0.76 0.14 76)" opacity="0.3" />
          <circle cx="20" cy="175" r="3" fill="oklch(0.72 0.12 186)" opacity="0.3" />
        </svg>
      </div>
      {/* floating badges */}
      <div className="absolute -top-3 right-4 animate-float-slow rounded-xl border border-border bg-white px-3 py-1.5 shadow-lg">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-emerald-500">✓</span>
          <span className="font-semibold text-navy">RERA Verified</span>
        </div>
      </div>
      <div className="absolute bottom-14 -left-5 animate-float-r rounded-xl border border-border bg-white px-3 py-1.5 shadow-lg">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-amber-400">★</span>
          <span className="font-semibold text-navy">4.8 Rating</span>
        </div>
      </div>
      <div
        className="absolute bottom-28 right-0 animate-float rounded-xl border border-border bg-white px-3 py-1.5 shadow-lg"
        style={{ animationDelay: "1.2s" }}
      >
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-accent">₹0</span>
          <span className="font-semibold text-navy">Brokerage</span>
        </div>
      </div>
    </div>
  );
}

/* City skyline silhouette — used in KPI band */
function CitySkySVG() {
  return (
    <svg
      className="absolute bottom-0 left-0 w-full opacity-[0.06] select-none pointer-events-none"
      viewBox="0 0 1200 100"
      preserveAspectRatio="xMidYMax slice"
      fill="white"
      aria-hidden
    >
      <rect x="0" y="70" width="38" height="30" />
      <rect x="40" y="48" width="28" height="52" />
      <rect x="44" y="36" width="6" height="14" /> {/* antenna */}
      <rect x="70" y="60" width="18" height="40" />
      <rect x="90" y="34" width="40" height="66" />
      <rect x="95" y="22" width="7" height="14" />
      <rect x="132" y="55" width="24" height="45" />
      <rect x="158" y="42" width="45" height="58" />
      <rect x="163" y="28" width="6" height="16" />
      <rect x="175" y="26" width="6" height="18" />
      <rect x="205" y="63" width="20" height="37" />
      <rect x="227" y="47" width="38" height="53" />
      <rect x="267" y="72" width="16" height="28" />
      <rect x="285" y="32" width="44" height="68" />
      <rect x="291" y="18" width="7" height="16" />
      <rect x="331" y="55" width="26" height="45" />
      <rect x="359" y="42" width="32" height="58" />
      <rect x="393" y="65" width="20" height="35" />
      <rect x="415" y="44" width="40" height="56" />
      <rect x="420" y="30" width="7" height="16" />
      <rect x="457" y="68" width="18" height="32" />
      <rect x="477" y="28" width="52" height="72" />
      <rect x="484" y="14" width="8" height="16" />
      <rect x="531" y="54" width="24" height="46" />
      <rect x="557" y="44" width="36" height="56" />
      <rect x="595" y="66" width="20" height="34" />
      <rect x="617" y="38" width="44" height="62" />
      <rect x="663" y="60" width="18" height="40" />
      <rect x="683" y="24" width="38" height="76" />
      <rect x="688" y="10" width="8" height="16" />
      <rect x="723" y="50" width="26" height="50" />
      <rect x="751" y="42" width="36" height="58" />
      <rect x="789" y="62" width="20" height="38" />
      <rect x="811" y="34" width="46" height="66" />
      <rect x="817" y="20" width="7" height="16" />
      <rect x="859" y="56" width="24" height="44" />
      <rect x="885" y="44" width="34" height="56" />
      <rect x="921" y="68" width="18" height="32" />
      <rect x="941" y="36" width="44" height="64" />
      <rect x="987" y="62" width="20" height="38" />
      <rect x="1009" y="46" width="36" height="54" />
      <rect x="1047" y="54" width="24" height="46" />
      <rect x="1073" y="40" width="34" height="60" />
      <rect x="1109" y="64" width="20" height="36" />
      <rect x="1131" y="38" width="40" height="62" />
      <rect x="1173" y="58" width="27" height="42" />
      {/* ground line */}
      <rect x="0" y="98" width="1200" height="4" />
    </svg>
  );
}

/* Decorative elements for the CTA section */
function CTADecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* dot grid */}
      <div className="absolute inset-0 bg-dots opacity-[0.18]" />
      {/* blobs */}
      <div className="absolute -right-20 -top-20 h-72 w-72 animate-blob rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute -left-12 bottom-0 h-56 w-56 animate-blob-slow rounded-full bg-gold/15 blur-3xl" />
      {/* spinning rings */}
      <div className="absolute left-10 top-10 h-24 w-24 animate-spin-slow rounded-full border border-white/10" />
      <div className="absolute right-10 bottom-8 h-16 w-16 animate-spin-slow-r rounded-full border border-white/8" />
      {/* floating dots */}
      <div className="absolute right-14 top-8 h-3 w-3 animate-float rounded-full bg-white/25" />
      <div className="absolute left-1/4 top-6 h-2 w-2 animate-float-slow rounded-full bg-white/18" />
      <div className="absolute right-1/3 bottom-6 h-2 w-2 animate-float-r rounded-full bg-gold/40" />
      {/* city skyline */}
      <CitySkySVG />
    </div>
  );
}

/* Section eyebrow label */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-xs font-bold uppercase tracking-widest text-gradient-accent">
      {children}
    </div>
  );
}

/* ─── page ─────────────────────────────────────────── */

export default function HomePage() {
  const router = useRouter();
  const featured = properties.filter((p) => p.featured);

  const [tab, setTab] = useState<"Buy" | "Rent" | "Commercial" | "PG">("Buy");
  const [query, setQuery] = useState("");
  const [statIdx, setStatIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const [propTab, setPropTab] = useState("All");
  const [heroSlide, setHeroSlide] = useState(0);

  const carouselRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  const shownProps =
    propTab === "All" ? featured : featured.filter((p) => p.type === TAB_TYPE_MAP[propTab]);
  const displayProps = shownProps.length > 0 ? shownProps : featured;

  /* rotating stat ticker */
  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setStatIdx((i) => (i + 1) % ROTATING_STATS.length);
        setFade(true);
      }, 220);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  /* hero image carousel */
  useEffect(() => {
    const id = setInterval(() => setHeroSlide((i) => (i + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(id);
  }, []);

  /* global scroll reveal observer */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-visible])");
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).setAttribute("data-visible", "");
            obs.unobserve(e.target);
          }
        }),
      { threshold: 0.08, rootMargin: "0px 0px -52px 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const handleSearch = useCallback(() => {
    const q = query.trim();
    router.push(q ? `/properties?q=${encodeURIComponent(q)}` : "/properties");
  }, [query, router]);

  return (
    <div className="min-h-screen" style={{ background: "#F4F5F7" }}>
      <SiteHeader />

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy">
        {/* carousel images */}
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
          <div className="absolute inset-0 bg-navy/65" />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/30 via-transparent to-navy/50" />
        </div>

        {/* animated blobs above overlay */}
        <HeroBlobs />

        {/* content */}
        <div className="relative z-10 mx-auto max-w-4xl px-4 pb-14 pt-10 text-center sm:px-6 sm:pb-18 sm:pt-16">
          {/* trust badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold backdrop-blur-sm">
            <span className="text-amber-400">★</span>
            <span className="text-white">4.8</span>
            <span className="mx-0.5 text-white/30">·</span>
            <span className="text-white/85">1 Lakh+ Verified Customers</span>
          </div>

          <h1 className="font-display text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl md:text-[3.75rem]">
            Find a home
            <br />
            <span className="text-gradient-hero">that fits your life.</span>
          </h1>
          <p className="mt-4 text-sm text-white/75 sm:text-base">
            Verified properties. Trusted experts. Seamless experience.
          </p>

          {/* search widget */}
          <div className="mx-auto mt-6 max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:mt-8">
            <div className="no-scrollbar flex overflow-x-auto border-b border-border px-3 pt-3 sm:px-4">
              {(["Buy", "Rent", "Commercial", "PG"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`shrink-0 rounded-t-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition sm:px-4
                    ${tab === t ? "border-b-2 border-accent text-accent" : "text-muted-foreground hover:text-foreground"}`}
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
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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

          {/* rotating ticker */}
          <div className="mt-5 h-5 overflow-hidden">
            <p
              className="text-center text-[11px] font-medium text-white/60 transition-opacity duration-200"
              style={{ opacity: fade ? 1 : 0 }}
            >
              {ROTATING_STATS[statIdx]}
            </p>
          </div>

          {/* slide dots */}
          <div className="mt-6 flex justify-center gap-1.5">
            {HERO_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroSlide(i)}
                className={`rounded-full transition-all duration-300 ${i === heroSlide ? "h-1.5 w-5 bg-white" : "h-1.5 w-1.5 bg-white/35"}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Animated stat cards ─────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        <div className="grid grid-cols-4 gap-3">
          {TOP_STATS_DATA.map((s, i) => (
            <AnimatedStatCard key={s.l} {...s} delay={i * 70} />
          ))}
        </div>
      </div>

      {/* ── Trending Properties ─────────────────────── */}
      <section className="px-4 py-2 sm:px-6 sm:py-3">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-4" data-reveal>
              <Eyebrow>Hand Picked</Eyebrow>
              <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
                Trending Properties in India
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A handpicked collection of India&apos;s most in-demand verified listings.
              </p>
            </div>

            <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
              {PROPERTY_TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setPropTab(t)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all
                    ${propTab === t ? "border-transparent bg-navy text-white" : "border-border bg-white text-muted-foreground hover:border-accent/50"}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="relative">
              <div ref={carouselRef} className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
                {displayProps.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/properties/${p.id}`}
                    data-reveal="scale"
                    className="group w-[255px] shrink-0 overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    style={{ transitionDelay: `${i * 60}ms` }}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={p.image}
                        alt={p.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy shadow">
                        <StarIcon size={7} className="fill-current" /> Featured
                      </span>
                      <span className="absolute right-2.5 top-2.5 rounded-md bg-navy/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur">
                        {p.matchScore}% match
                      </span>
                    </div>
                    <div className="p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {p.locality}, {p.city}
                      </div>
                      <h3 className="mt-0.5 font-display text-sm font-bold leading-tight text-navy">
                        {p.title}
                      </h3>
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <div className="font-display text-base font-black text-accent">
                            {p.priceLabel}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {p.bhk} · {p.area} sqft
                          </div>
                        </div>
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-navy">
                          {p.type}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <button
                onClick={() => carouselRef.current?.scrollBy({ left: 280, behavior: "smooth" })}
                className="absolute -right-3 top-[40%] -translate-y-1/2 hidden h-9 w-9 items-center justify-center rounded-full bg-navy text-white shadow-lg transition hover:bg-navy/90 sm:flex"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <Link
                href="/properties"
                className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-all hover:gap-2"
              >
                View all properties <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── KPI Band ────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy px-4 py-8 sm:px-6">
        <CitySkySVG />
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-0 lg:divide-x lg:divide-white/10">
            {KPI_BAND.map((s, i) => (
              <div
                key={s.l}
                data-reveal="fade"
                className="flex flex-col items-center text-center lg:px-6"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="font-display text-2xl font-black text-gradient-gold sm:text-3xl">
                  {s.v}
                </span>
                <span className="mt-1 text-xs font-medium text-white/60">{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ─────────────────────────────── */}
      <section className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5" data-reveal>
              <Eyebrow>Browse by Type</Eyebrow>
              <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
                Top Categories
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-6">
              {CATEGORIES.map(({ label, Icon, type }, i) => (
                <Link
                  key={label}
                  href={`/properties?type=${encodeURIComponent(type)}`}
                  data-reveal="scale"
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/40 p-4 text-center transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg sm:gap-3 sm:p-5"
                  style={{ transitionDelay: `${i * 55}ms` }}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white sm:h-12 sm:w-12">
                    <Icon size={18} strokeWidth={1.75} className="sm:hidden" />
                    <Icon size={22} strokeWidth={1.75} className="hidden sm:block" />
                  </span>
                  <span className="font-display text-[11px] font-bold leading-tight text-navy sm:text-sm">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ───────────────────────────────── */}
      <section className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
              {/* left: heading + grid */}
              <div className="flex-1">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div data-reveal>
                    <Eyebrow>Platform Features</Eyebrow>
                    <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
                      Everything You Need at One Place
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      From discovery to possession — NxtSft.com covers every step.
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {["For Buyers", "For Sellers"].map((t, i) => (
                      <span
                        key={t}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold
                          ${i === 0 ? "border-transparent bg-navy text-white" : "border-border bg-white text-muted-foreground"}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {SERVICES.map(({ Icon, title, desc }, i) => (
                    <div
                      key={title}
                      data-reveal="scale"
                      className="group flex flex-col items-center rounded-2xl border border-border bg-secondary/30 p-4 text-center transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                      style={{ transitionDelay: `${i * 60}ms` }}
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

              {/* right: house illustration (desktop only) */}
              <PropertyIllustration className="hidden lg:block lg:w-[300px] lg:shrink-0" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Cities ─────────────────────────────────── */}
      <section className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5" data-reveal>
              <Eyebrow>Pan India Coverage</Eyebrow>
              <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
                Explore Real Estate in Popular Cities
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                From metro hubs to emerging markets — find properties wherever you need to be.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {CITIES.map(({ label, Icon, tagline }, i) => (
                <Link
                  key={label}
                  href={`/properties?city=${encodeURIComponent(label)}`}
                  data-reveal="scale"
                  className="group flex flex-col items-center rounded-xl border border-border bg-secondary/30 p-4 text-center transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                  style={{ transitionDelay: `${i * 40}ms` }}
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
              <Link
                href="/properties"
                className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-all hover:gap-2"
              >
                View all cities <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reviews ────────────────────────────────── */}
      <section className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div data-reveal>
                <Eyebrow>Customer Stories</Eyebrow>
                <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
                  What People Say About Us
                </h2>
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
                  onClick={() => reviewRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-transparent hover:bg-navy hover:text-white"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
                <button
                  onClick={() => reviewRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-white transition hover:bg-navy/90"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div ref={reviewRef} className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
              {REVIEWS.map((r, i) => (
                <div
                  key={r.name}
                  data-reveal="scale"
                  className="w-[285px] shrink-0 rounded-xl border border-border bg-secondary/30 p-4"
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                      style={{ background: r.bg }}
                    >
                      {r.initial}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.location} · {r.age}
                      </p>
                    </div>
                  </div>
                  <Stars n={r.rating} />
                  <p className="mt-2.5 line-clamp-4 text-[13px] leading-relaxed text-muted-foreground">
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why NxtSft.com ─────────────────────────── */}
      <section className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
              {/* illustration left on desktop */}
              <PropertyIllustration className="hidden lg:block lg:w-[280px] lg:shrink-0" />

              <div className="flex-1">
                <div className="mb-5 text-center lg:text-left" data-reveal>
                  <Eyebrow>Why NxtSft.com?</Eyebrow>
                  <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
                    Built for every journey
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
                  {WHY.map(({ Icon, t, d }, i) => (
                    <div
                      key={t}
                      data-reveal="scale"
                      className="flex flex-col rounded-2xl border border-border bg-secondary/30 p-5 transition hover:-translate-y-1 hover:shadow-lg"
                      style={{ transitionDelay: `${i * 90}ms` }}
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                        <Icon size={22} strokeWidth={1.75} />
                      </span>
                      <h3 className="mt-4 font-display text-base font-bold text-navy">{t}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {d}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Press marquee ──────────────────────────── */}
      <section className="overflow-hidden border-y border-border bg-white py-5">
        <div
          className="flex whitespace-nowrap"
          style={{ animation: "marquee 42s linear infinite", width: "max-content" }}
        >
          {[...PRESS, ...PRESS].map((item, i) => (
            <div
              key={i}
              className="inline-flex shrink-0 items-center gap-3 border-r border-border px-8"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-accent">
                {item.outlet}
              </span>
              <span className="text-sm text-muted-foreground">&ldquo;{item.headline}&rdquo;</span>
            </div>
          ))}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </section>

      {/* ── Portals ────────────────────────────────── */}
      <section className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 text-center" data-reveal>
              <Eyebrow>For Every Stakeholder</Eyebrow>
              <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
                Five purpose-built portals
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                From super-admin command to first-time buyers — everyone gets a dedicated workspace.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              {portals.map((p, i) => {
                const colorClass = PORTAL_COLORS[p.accent] ?? "bg-accent/10 text-accent";
                return (
                  <Link
                    key={p.path}
                    href={p.path}
                    data-reveal="scale"
                    className={`spotlight group relative overflow-hidden rounded-2xl border border-border bg-secondary/30 p-5 text-center transition hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10
                      ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    <div
                      className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-sm font-black tracking-tight transition group-hover:scale-110 sm:h-14 sm:w-14 sm:text-base ${colorClass}`}
                    >
                      {portalInitials(p.name)}
                    </div>
                    <div className="mt-3 font-display text-sm font-bold text-navy">{p.name}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {p.role}
                    </div>
                    <div className="mt-2 text-[11px] font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
                      Enter →
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────── */}
      <section className="px-4 pb-14 pt-5 sm:px-6 sm:pb-16">
        <div className="mx-auto max-w-7xl">
          <div
            data-reveal
            className="relative overflow-hidden rounded-3xl bg-navy px-5 py-10 text-center text-white shadow-2xl sm:px-14 sm:py-16"
          >
            <CTADecorations />
            <div className="relative z-10">
              <h2 className="font-display text-2xl font-black sm:text-3xl md:text-4xl">
                Ready to find your <span className="text-gradient-gold">perfect home?</span>
              </h2>
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
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
