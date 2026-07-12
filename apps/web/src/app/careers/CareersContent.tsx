"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import {
  Code2,
  Layers,
  BarChart2,
  Megaphone,
  HeartHandshake,
  Scale,
  Users,
  TrendingUp,
  Zap,
  ShieldCheck,
  Globe,
  ArrowRight,
  Camera,
  Mail,
} from "lucide-react";

/* ── Scroll-reveal ──────────────────────────────────────────── */
function useScrollReveal(key?: unknown) {
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
      { threshold: 0.06, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
    // Re-observe when `key` changes: tab switches mount fresh [data-reveal]
    // nodes that the previous observer never saw, leaving them at opacity 0.
  }, [key]);
}

/* ── City skyline ────────────────────────────────────────────── */
function CitySVG() {
  return (
    <svg
      className="absolute bottom-0 left-0 w-full pointer-events-none select-none"
      viewBox="0 0 900 90"
      preserveAspectRatio="xMidYMax slice"
      fill="currentColor"
      aria-hidden
    >
      <rect x="0" y="68" width="28" height="22" />
      <rect x="30" y="48" width="20" height="42" />
      <rect x="52" y="58" width="14" height="32" />
      <rect x="68" y="32" width="32" height="58" />
      <rect x="72" y="20" width="6" height="14" />
      <rect x="102" y="52" width="18" height="38" />
      <rect x="122" y="40" width="34" height="50" />
      <rect x="158" y="64" width="14" height="26" />
      <rect x="174" y="24" width="40" height="66" />
      <rect x="178" y="12" width="6" height="14" />
      <rect x="216" y="54" width="18" height="36" />
      <rect x="236" y="44" width="28" height="46" />
      <rect x="266" y="62" width="14" height="28" />
      <rect x="282" y="36" width="36" height="54" />
      <rect x="320" y="56" width="18" height="34" />
      <rect x="340" y="28" width="44" height="62" />
      <rect x="346" y="14" width="8" height="16" />
      <rect x="386" y="50" width="20" height="40" />
      <rect x="408" y="40" width="30" height="50" />
      <rect x="440" y="60" width="16" height="30" />
      <rect x="458" y="30" width="40" height="60" />
      <rect x="464" y="16" width="7" height="16" />
      <rect x="500" y="52" width="18" height="38" />
      <rect x="520" y="42" width="32" height="48" />
      <rect x="554" y="64" width="14" height="26" />
      <rect x="570" y="34" width="38" height="56" />
      <rect x="610" y="54" width="20" height="36" />
      <rect x="632" y="26" width="46" height="64" />
      <rect x="638" y="12" width="8" height="16" />
      <rect x="680" y="50" width="20" height="40" />
      <rect x="702" y="44" width="30" height="46" />
      <rect x="734" y="64" width="14" height="26" />
      <rect x="750" y="32" width="40" height="58" />
      <rect x="792" y="58" width="18" height="32" />
      <rect x="812" y="40" width="34" height="50" />
      <rect x="848" y="60" width="16" height="30" />
      <rect x="866" y="36" width="34" height="54" />
      <rect x="0" y="88" width="900" height="4" />
    </svg>
  );
}

/* ── Data ────────────────────────────────────────────────────── */
const TEAMS = [
  {
    Icon: Code2,
    name: "Technology",
    tagline: "Where ideas become infrastructure.",
    desc: "Our engineers build the backbone of India's smartest real estate platform — from blazing-fast search and AI-powered matching to the APIs and microservices that keep NxtSft.com running 24/7. If you love hard problems and clean solutions, you'll feel right at home.",
    tags: ["Full-Stack", "Mobile", "DevOps", "Data Engineering", "AI/ML"],
    color: "bg-blue-50 border-blue-200",
    iconColor: "bg-blue-100 text-blue-700",
  },
  {
    Icon: Layers,
    name: "Product & Design",
    tagline: "Shaping the experience, pixel by pixel.",
    desc: "Product thinkers and design craftspeople who translate complex real estate workflows into experiences that feel effortless. We obsess over every screen, every interaction — because buying or renting a home is one of life's biggest decisions.",
    tags: ["Product Management", "UX/UI Design", "User Research", "Prototyping"],
    color: "bg-violet-50 border-violet-200",
    iconColor: "bg-violet-100 text-violet-700",
  },
  {
    Icon: TrendingUp,
    name: "Sales & Growth",
    tagline: "Go-getters who move the needle.",
    desc: "Our sales team is the beating heart of NxtSft.com's growth — onboarding developers, engaging agents, closing partnerships, and expanding into new cities. If you thrive on targets and relationships, this is where you belong.",
    tags: ["Enterprise Sales", "Channel Partnerships", "City Expansion", "Account Management"],
    color: "bg-emerald-50 border-emerald-200",
    iconColor: "bg-emerald-100 text-emerald-700",
  },
  {
    Icon: Megaphone,
    name: "Marketing & Brand",
    tagline: "Storytellers who build belief.",
    desc: "Marketers, content creators, and strategists who craft NxtSft.com's voice and make millions of Indians aware that there's a smarter way to find property. From performance marketing to brand campaigns — we make every rupee of spend count.",
    tags: ["Performance Marketing", "Content", "SEO/SEM", "Brand Strategy", "Social Media"],
    color: "bg-amber-50 border-amber-200",
    iconColor: "bg-amber-100 text-amber-700",
  },
  {
    Icon: HeartHandshake,
    name: "Customer Experience",
    tagline: "Empathetic problem-solvers, every time.",
    desc: "The CX team ensures that every buyer, seller, agent, and developer on our platform gets the support they need — quickly, clearly, and with warmth. We don't just solve tickets; we build trust.",
    tags: ["Customer Support", "Onboarding", "Retention", "Quality Assurance"],
    color: "bg-rose-50 border-rose-200",
    iconColor: "bg-rose-100 text-rose-700",
  },
  {
    Icon: Users,
    name: "People & Culture",
    tagline: "Builders of the team that builds everything.",
    desc: "HR leaders, culture champions, and L&D specialists who attract top talent and help NxtSft.com people grow. A great product starts with great people — and our People team makes sure we attract, retain, and develop the best.",
    tags: ["Talent Acquisition", "L&D", "HR Business Partnering", "Culture & Engagement"],
    color: "bg-cyan-50 border-cyan-200",
    iconColor: "bg-cyan-100 text-cyan-700",
  },
  {
    Icon: Scale,
    name: "Finance, Legal & Compliance",
    tagline: "The foundation everything is built on.",
    desc: "Financial strategists, legal advisors, and compliance professionals who keep NxtSft.com's foundations solid. From fundraising and reporting to RERA compliance and regulatory liaison — the unsung heroes of scale.",
    tags: ["Finance & Accounting", "Legal", "Compliance", "RERA Advisory"],
    color: "bg-slate-50 border-slate-200",
    iconColor: "bg-slate-100 text-slate-600",
  },
  {
    Icon: BarChart2,
    name: "Data & Analytics",
    tagline: "Turning signals into strategy.",
    desc: "Data scientists, analysts, and BI engineers who decode what India's property market is really telling us. Our insights power better recommendations, smarter pricing, and faster decisions for every stakeholder on the platform.",
    tags: ["Data Science", "Business Intelligence", "Analytics Engineering", "Research"],
    color: "bg-indigo-50 border-indigo-200",
    iconColor: "bg-indigo-100 text-indigo-700",
  },
];

const LEADERSHIP = [
  { name: "Founder & CEO", title: "Visionary & Chief Executive" },
  { name: "Chief Technology Officer", title: "Engineering & Infrastructure" },
  { name: "Chief Product Officer", title: "Product & Experience" },
  { name: "Chief Growth Officer", title: "Sales, Marketing & Expansion" },
  { name: "Chief People Officer", title: "Talent, Culture & L&D" },
  { name: "Chief Financial Officer", title: "Finance, Legal & Compliance" },
];

const VALUES = [
  {
    Icon: ShieldCheck,
    title: "Transparency always",
    desc: "No hidden fees. No grey-market deals. Every listing RERA-verified and every interaction honest.",
  },
  {
    Icon: Zap,
    title: "Technology-first thinking",
    desc: "We reach for the AI-powered, data-backed, automated solution before the manual one. Technology is our unfair advantage.",
  },
  {
    Icon: Globe,
    title: "Build for all of India",
    desc: "From Tier-1 luxury buyers to first-time renters in Tier-3 cities — our platform must work brilliantly for everyone.",
  },
  {
    Icon: Users,
    title: "People over process",
    desc: "Great outcomes come from empowered people, not rigid procedures. We hire smart, trust deeply, and get out of the way.",
  },
];

/* ── Team photos (Cloudflare R2, public bucket) ──────────────── */
const R2 = "https://pub-f4a95c3ec2954aabb9bd91fa3fdf4846.r2.dev";
const teamPhoto = (n: number) => `${R2}/team/team${n}.png`;
const TEAM_PHOTOS = Array.from({ length: 18 }, (_, i) => i + 1);

/* ── Photo ───────────────────────────────────────────────────── */
function PhotoPlaceholder({
  className = "",
  src,
  alt = "",
  sizes = "(min-width: 768px) 33vw, 100vw",
}: {
  className?: string;
  src?: string;
  alt?: string;
  sizes?: string;
}) {
  if (src) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-secondary/30 ${className}`}>
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`relative flex items-end justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-secondary/30 ${className}`}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
        <Camera size={28} strokeWidth={1.25} />
        <span className="text-[10px] font-medium tracking-wider uppercase">Photo</span>
      </div>
    </div>
  );
}

/* ── Tabs ────────────────────────────────────────────────────── */
type Tab = "impact" | "teams" | "leadership";

/* ── Main ────────────────────────────────────────────────────── */
export function CareersContent() {
  const [tab, setTab] = useState<Tab>("impact");
  useScrollReveal(tab);

  // Live DB counts — no fabricated figures.
  const stats = trpc.users.platformStats.useQuery().data;
  const nf = (n: number) => n.toLocaleString("en-IN");
  const IMPACT_STATS = [
    { value: stats ? nf(stats.listings) : "—", label: "Properties Listed" },
    { value: stats ? nf(stats.cities) : "—", label: "Cities Covered" },
    { value: stats ? nf(stats.agents) : "—", label: "Verified Agents" },
    { value: stats && stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)}★` : "—", label: "Avg Rating" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute -right-20 -top-10 h-96 w-96 animate-blob rounded-full opacity-20 blur-3xl"
            style={{ background: "oklch(0.72 0.12 186)" }}
          />
          <div
            className="absolute -left-10 top-1/3 h-72 w-72 animate-blob-slow rounded-full opacity-15 blur-3xl"
            style={{ background: "oklch(0.76 0.14 76)" }}
          />
          <div className="absolute right-10 top-10 h-24 w-24 animate-spin-slow rounded-full border border-white/8" />
          <div className="absolute inset-x-0 bottom-0 text-white/[0.05]">
            <CitySVG />
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/80">
            <Users size={12} />
            Careers at NxtSft.com
          </div>
          <h1 className="font-display text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            We are changing the way
            <br />
            <span className="text-gradient-hero">India finds home.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/70 leading-relaxed">
            Your work will help revolutionise the way people buy, sell and rent property across India.
            Join a team united by technology, transparency, and the drive to make real estate
            effortless for 1.4 billion people.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="mailto:careers@nxtsft.com"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-display text-sm font-bold text-white shadow-lg shadow-accent/40 transition hover:opacity-90"
            >
              <Mail size={15} /> Send us your CV
            </a>
            <button
              onClick={() => setTab("teams")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              Explore teams <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-5xl overflow-x-auto px-6">
            {(
              [
                { id: "impact", label: "Our Impact" },
                { id: "teams", label: "Our Teams" },
              ] as { id: Tab; label: string }[]
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-shrink-0 border-b-2 px-5 py-4 text-sm font-semibold transition-colors ${
                  tab === id
                    ? "border-accent text-white"
                    : "border-transparent text-white/50 hover:text-white/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUR IMPACT ──────────────────────────────────────────── */}
      {tab === "impact" && (
        <div>
          {/* Mission */}
          <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div data-reveal>
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-gradient-accent">
                  Why we exist
                </div>
                <h2 className="font-display text-3xl font-black leading-snug text-navy sm:text-4xl">
                  We&apos;re helping millions of Indians{" "}
                  <span className="text-accent">find their home</span>.
                </h2>
                <p className="mt-5 text-lg font-semibold leading-relaxed text-foreground/80">
                  Your work will help revolutionise the way people buy, sell and rent properties
                  across every city in India.
                </p>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  We&apos;re helping buyers discover verified homes, enabling renters to find spaces
                  they love, and giving developers and agents the tools to grow their business. United
                  by technology and the desire to eliminate opacity from real estate — we are building
                  the future of proptech, one transaction at a time.
                </p>
              </div>

              {/* Photo placeholder — full bleed image */}
              <div data-reveal="right">
                <PhotoPlaceholder className="aspect-[4/3] w-full" />
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="border-y border-border bg-white">
            <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
              <div
                data-reveal
                className="mb-2 text-xs font-bold uppercase tracking-widest text-gradient-accent"
              >
                Our impact, in numbers
              </div>
              <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
                {IMPACT_STATS.map(({ value, label }, i) => (
                  <div
                    key={label}
                    data-reveal="scale"
                    className="text-center"
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    <div className="font-display text-4xl font-black text-accent sm:text-5xl">
                      {value}
                    </div>
                    <div className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Impact in action — 3 photo blocks */}
          <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <div data-reveal className="mb-10">
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-gradient-accent">
                Our impact, in action
              </div>
              <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">
                Stories from the team
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  label: "AI-Powered Matching",
                  quote:
                    "We built a recommendation engine that cut average search time from 45 minutes to under 8. Seeing a buyer find their dream apartment in a single session — that&apos;s what we come to work for.",
                  role: "Senior Engineer, ML Platform",
                },
                {
                  label: "RERA Transparency",
                  quote:
                    "Every listing on NxtSft.com goes through a verification layer. We&apos;ve rejected thousands of unregistered listings — protecting buyers from fraud before they even see a property.",
                  role: "VP, Trust & Safety",
                },
                {
                  label: "City Expansion",
                  quote:
                    "We launched in 3 new Tier-2 cities last quarter. The hunger for a transparent, tech-enabled property platform outside metros is massive — and we&apos;re just getting started.",
                  role: "Head of Growth, South India",
                },
              ].map(({ label, quote, role }, i) => (
                <div
                  key={label}
                  data-reveal="scale"
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <PhotoPlaceholder className="aspect-video w-full rounded-none border-x-0 border-t-0 border-b-2" />
                  <div className="flex flex-col flex-1 p-5">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-accent">
                      {label}
                    </div>
                    <p className="flex-1 text-sm leading-relaxed text-muted-foreground italic">
                      &ldquo;{quote}&rdquo;
                    </p>
                    <p className="mt-3 text-xs font-semibold text-navy">{role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Values */}
          <section className="bg-white px-6 py-16 sm:py-20">
            <div className="mx-auto max-w-5xl">
              <div data-reveal className="mb-10 text-center">
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-gradient-accent">
                  How we work
                </div>
                <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">
                  What we stand for
                </h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {VALUES.map(({ Icon, title, desc }, i) => (
                  <div
                    key={title}
                    data-reveal="scale"
                    className="flex flex-col rounded-2xl border border-border bg-secondary/30 p-6 transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg"
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                      <Icon size={22} strokeWidth={1.75} />
                    </span>
                    <h3 className="mb-1.5 font-display text-base font-bold text-navy">{title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── OUR TEAMS ───────────────────────────────────────────── */}
      {tab === "teams" && (
        <div>
          <section className="border-b border-border bg-white px-6 py-12">
            <div className="mx-auto max-w-5xl">
              <div data-reveal>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-gradient-accent">
                  A home for diverse talent
                </div>
                <h2 className="font-display text-3xl font-black text-navy sm:text-4xl">
                  Our home offers opportunities across a wide range of disciplines
                </h2>
                <p className="mt-4 max-w-2xl text-muted-foreground">
                  Whether you write code, design experiences, close deals, or build culture —
                  there&apos;s a place for you at NxtSft.com. Explore our teams below.
                </p>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
            <div className="grid gap-6 md:grid-cols-2">
              {TEAMS.map(({ Icon, name, tagline, desc, tags, color, iconColor }, i) => (
                <div
                  key={name}
                  data-reveal="scale"
                  className={`flex flex-col rounded-2xl border-2 p-6 transition hover:-translate-y-0.5 hover:shadow-lg ${color}`}
                  style={{ transitionDelay: `${(i % 2) * 80}ms` }}
                >
                  <div className="mb-4 flex items-start gap-4">
                    <span
                      className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl ${iconColor}`}
                    >
                      <Icon size={24} strokeWidth={1.75} />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-navy">{name}</h3>
                      <p className="text-sm font-semibold text-muted-foreground italic">{tagline}</p>
                    </div>
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-foreground/70">{desc}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-current/20 bg-white/60 px-2.5 py-0.5 text-[10px] font-semibold text-foreground/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Life at NxtSft photo grid */}
          <section className="border-t border-border bg-white px-6 py-14">
            <div className="mx-auto max-w-5xl">
              <div data-reveal className="mb-8">
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-gradient-accent">
                  Life at NxtSft.com
                </div>
                <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">
                  Where great work happens
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {TEAM_PHOTOS.map((n, i) => {
                  const wide = i === 0 || i === TEAM_PHOTOS.length - 1;
                  return (
                    <PhotoPlaceholder
                      key={n}
                      className={wide ? "col-span-2 aspect-[16/9]" : "aspect-square"}
                      src={teamPhoto(n)}
                      alt="Life at NxtSft.com"
                      sizes={
                        wide
                          ? "(min-width: 768px) 50vw, 100vw"
                          : "(min-width: 768px) 25vw, 50vw"
                      }
                    />
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── LEADERSHIP ──────────────────────────────────────────── */}
      {tab === "leadership" && (
        <div>
          <section className="border-b border-border bg-white px-6 py-12">
            <div className="mx-auto max-w-5xl">
              <div data-reveal>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-gradient-accent">
                  Our leadership
                </div>
                <h2 className="font-display text-3xl font-black text-navy sm:text-4xl">
                  Our rockstar leadership
                </h2>
                <p className="mt-4 max-w-xl text-muted-foreground">
                  We don&apos;t just have leaders — we have builders. People who&apos;ve been in the
                  trenches, who understand technology and markets, and who bring out the best in
                  everyone around them.
                </p>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-3">
              {LEADERSHIP.map(({ name, title }, i) => (
                <div
                  key={name}
                  data-reveal="scale"
                  className="flex flex-col items-center text-center"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  {/* Photo placeholder — portrait */}
                  <PhotoPlaceholder className="w-full aspect-[3/4] max-w-[240px]" />
                  <div className="mt-4">
                    <div className="font-display text-base font-bold text-navy">{name}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{title}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Culture quote */}
          <section className="bg-white px-6 py-14 sm:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <div
                data-reveal
                className="mx-auto mb-8 max-w-2xl"
              >
                <div className="font-display text-2xl font-black leading-snug text-navy sm:text-3xl">
                  &ldquo;We hire people who are better than us at what they do — and then we trust them completely.&rdquo;
                </div>
                <div className="mt-4 text-sm font-semibold text-muted-foreground">
                  Founder, NxtSft.com
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="px-6 pb-16 pt-4 sm:pb-20">
        <div className="mx-auto max-w-5xl">
          <div
            data-reveal
            className="relative overflow-hidden rounded-3xl bg-navy px-8 py-12 text-center text-white sm:px-14"
          >
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute -right-10 -top-10 h-60 w-60 animate-blob rounded-full bg-accent/20 blur-3xl" />
              <div className="absolute -left-8 bottom-0 h-48 w-48 animate-blob-slow rounded-full bg-gold/15 blur-3xl" />
              <div className="absolute inset-x-0 bottom-0 text-white/[0.05]">
                <CitySVG />
              </div>
            </div>
            <div className="relative">
              <div className="mb-3 text-xs font-bold uppercase tracking-widest text-gradient-accent">
                Knock at our door
              </div>
              <h2 className="font-display text-2xl font-black sm:text-3xl">
                Interested in exploring opportunities at{" "}
                <span className="text-gradient-gold">NxtSft.com?</span>
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-white/70 leading-relaxed">
                We&apos;re always looking for exceptional people across technology, product, sales, and
                marketing. Send us your CV and tell us what you&apos;d like to build.
              </p>
              <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href="mailto:careers@nxtsft.com"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3 font-display text-sm font-bold text-white shadow-lg shadow-accent/40 transition hover:opacity-90"
                >
                  <Mail size={15} /> careers@nxtsft.com
                </a>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-8 py-3 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                >
                  Learn about us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
