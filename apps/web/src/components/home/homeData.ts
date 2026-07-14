import {
  Building2,
  Home,
  MapPin,
  Briefcase,
  Users,
  TrendingUp,
  Laptop,
  Landmark,
  GraduationCap,
  Waves,
  BookOpen,
  HardHat,
  Crown,
  Monitor,
  Anchor,
  Ship,
  Mountain,
  Sparkles,
  ShieldCheck,
  DollarSign,
  UserCheck,
  BarChart2,
  Lock,
  CheckCircle2,
  Sofa,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?w=1600&q=80&auto=format&fit=crop`;

// Public Cloudflare R2 bucket base for site assets (category artwork, etc.).
const R2 = process.env.R2_PUBLIC_URL;

export const HERO_IMAGES = [
  img("photo-1600596542815-ffad4c1539a9"),
  img("photo-1613490493576-7fde63acd811"),
  img("photo-1545324418-cc1a3fa10c00"),
  img("photo-1600585154340-be6161a56a0c"),
  img("photo-1600607687939-ce8a6c25118c"),
];

export const ROTATING_STATS = [
  "Trusted by 1 Lakh+ Happy Customers",
  "10,000+ RERA-Verified Properties",
  "Zero Commission — Save Lakhs",
  "Covering 50+ Cities Across India",
  "AI-Matched Listings for Every Budget",
  "Dedicated Relationship Manager Support",
];

export const KPI_BAND = [
  { num: 10000, prefix: "", suffix: "+", decimals: 0, l: "Verified Properties" },
  { num: 50, prefix: "", suffix: "+", decimals: 0, l: "Cities Covered" },
  { num: 4.8, prefix: "", suffix: " ★", decimals: 1, l: "Average Rating" },
  { num: 1, prefix: "", suffix: " Lakh+", decimals: 0, l: "Happy Customers" },
  { num: 0, prefix: "₹", suffix: "", decimals: 0, l: "Commission Fee" },
  { num: 100, prefix: "", suffix: "%", decimals: 0, l: "RERA Verified" },
];

export const TOP_STATS_DATA = [
  { num: 10, suffix: "K+", l: "Properties" },
  { num: 2, suffix: "K+", l: "Projects" },
  { num: 50, suffix: "+", l: "Cities" },
  { num: 100, suffix: "K+", l: "Customers" },
];

export const PROPERTY_TABS = ["All", "Apartments", "Villas", "Commercial", "Plots", "PG"];

export const TAB_TYPE_MAP: Record<string, string> = {
  Apartments: "Apartment",
  Villas: "Villa",
  Commercial: "Office",
  Plots: "Plot",
  PG: "PG",
};

export type FeaturedProp = {
  id: string;
  slug: string;
  title: string;
  type: string;
  bhk: string | null;
  area: number;
  price: number;
  images: string[];
  location: { city: string; locality: string } | null;
};

export function fmtPrice(p: number): string {
  if (p >= 1_00_00_000) return `₹${(p / 1_00_00_000).toFixed(2)} Cr`;
  if (p >= 1_00_000) return `₹${(p / 1_00_000).toFixed(1)} L`;
  return `₹${p.toLocaleString("en-IN")}`;
}

export const CATEGORIES: { label: string; Icon: LucideIcon; type: string; image?: string; href?: string }[] = [
  { label: "Apartments", Icon: Building2, type: "Apartment", image: `${R2}/site/categories/apartment.png` },
  { label: "Villas", Icon: Home, type: "Villa", image: `${R2}/site/categories/villas.png` },
  { label: "Plots", Icon: MapPin, type: "Plot", image: `${R2}/site/categories/plots.png` },
  { label: "Commercial", Icon: Briefcase, type: "Commercial", image: `${R2}/site/categories/commercial.png` },
  { label: "PG / Co-living", Icon: Users, type: "PG", image: `${R2}/site/categories/pg.png`, href: "/pg" },
  { label: "New Projects", Icon: TrendingUp, type: "New" },
  { label: "Interior Designers", Icon: Sofa, type: "Interior Designers", href: "/interiors" },
];

export const CITIES: { label: string; Icon: LucideIcon; tagline: string }[] = [
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
  { label: "Mangalore", Icon: Anchor, tagline: "Coastal Karnataka" },
  { label: "Warangal", Icon: Mountain, tagline: "Kakatiya Heritage City" },
  { label: "Vishakapatnam", Icon: Ship, tagline: "City of Destiny" },
  { label: "Amaravati", Icon: Landmark, tagline: "Andhra Pradesh's Capital" },
];

export const SERVICES: { Icon: LucideIcon; title: string; desc: string }[] = [
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
    title: "Zero Commission",
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

export const SELLER_SERVICES: { Icon: LucideIcon; title: string; desc: string }[] = [
  {
    Icon: Home,
    title: "Free Property Listing",
    desc: "List your property free with photos and full details.",
  },
  {
    Icon: Users,
    title: "Verified Buyer Leads",
    desc: "Genuine, contact-verified buyer enquiries sent to you.",
  },
  {
    Icon: TrendingUp,
    title: "Boost Visibility",
    desc: "Promote your listing to reach thousands more buyers.",
  },
  {
    Icon: DollarSign,
    title: "Zero Commission",
    desc: "Sell directly to buyers. Keep 100% of your price.",
  },
  {
    Icon: BarChart2,
    title: "Listing Analytics",
    desc: "Track views, enquiries and interest on your property.",
  },
  {
    Icon: UserCheck,
    title: "Dedicated Support",
    desc: "Relationship manager for paperwork and closing.",
  },
];

export const REVIEWS = [
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
    text: "The relationship manager was incredibly helpful. Organised 4 site visits in a weekend. Zero commission saved me ₹1.2 lakhs on my villa in Whitefield.",
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

export const PRESS = [
  {
    outlet: "Economic Times",
    headline: "NxtSft.com disrupts India's real estate commission model with zero-fee platform",
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

export const WHY: { Icon: LucideIcon; t: string; d: string }[] = [
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

export const PORTAL_COLORS: Record<string, string> = {
  Gold: "bg-amber-100 text-amber-700",
  Red: "bg-rose-100 text-rose-600",
  Green: "bg-emerald-100 text-emerald-700",
  Amber: "bg-orange-100 text-orange-600",
};
