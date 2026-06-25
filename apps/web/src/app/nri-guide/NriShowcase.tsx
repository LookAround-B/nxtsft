"use client";
import { useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Building2,
  KeyRound,
  TrendingUp,
  ShieldCheck,
  Headset,
  FileCheck2,
  Plane,
  Video,
  Wallet,
  Search,
  ArrowRight,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { CitySkySVG } from "@/components/home/CitySkySVG";
import { FeaturedProperties } from "@/components/home/FeaturedProperties";

/* ── Scroll-reveal (shared pattern across marketing pages) ──── */
function useScrollReveal() {
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
  }, []);
}

/* ── Eyebrow label ─────────────────────────────────────────── */
function Eyebrow({ icon: Icon, children }: { icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon size={14} className="text-accent" />}
      <span className="text-xs font-bold uppercase tracking-widest text-gradient-accent">
        {children}
      </span>
    </div>
  );
}

/* ── Hero stat pill ────────────────────────────────────────── */
function StatPill({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) {
  return (
    <div
      data-reveal="scale"
      className="flex flex-col items-center rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-center backdrop-blur"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="font-display text-2xl font-black text-white sm:text-3xl">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/60">
        {label}
      </div>
    </div>
  );
}

/* ── The three pillars: Invest · Buy · Rent ────────────────── */
const PILLARS: {
  icon: LucideIcon;
  tag: string;
  title: string;
  blurb: string;
  points: string[];
  href: string;
  cta: string;
}[] = [
  {
    icon: TrendingUp,
    tag: "Invest",
    title: "Grow wealth back home",
    blurb:
      "Build a property portfolio in India's fastest-growing markets — fully managed, with rental yield and long-term appreciation.",
    points: ["High-growth city picks", "Rental yield estimates", "Repatriation-ready"],
    href: "/properties?purpose=Sale",
    cta: "Explore investments",
  },
  {
    icon: Building2,
    tag: "Buy",
    title: "Own your dream home",
    blurb:
      "Browse RERA-verified homes and book your purchase end-to-end online — site visits handled virtually by our team.",
    points: ["RERA-verified listings", "Virtual site visits", "Home-loan assistance"],
    href: "/properties?purpose=Sale",
    cta: "Browse homes for sale",
  },
  {
    icon: KeyRound,
    tag: "Rent",
    title: "Rent out or lease",
    blurb:
      "List your property for rent or find a managed rental for family in India — tenant screening and paperwork included.",
    points: ["Tenant screening", "Managed rentals", "Digital agreements"],
    href: "/properties?purpose=Rent",
    cta: "Browse rentals",
  },
];

/* ── How it works ──────────────────────────────────────────── */
const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Search, title: "Discover", text: "Shortlist RERA-verified properties matched to your goals." },
  { icon: Video, title: "Tour remotely", text: "Our NRI desk runs live video walkthroughs — no flight needed." },
  { icon: FileCheck2, title: "Paperwork, sorted", text: "FEMA-compliant docs, PoA and home-loan support, handled for you." },
  { icon: Wallet, title: "Close & repatriate", text: "Secure payments, registration and repatriation-ready records." },
];

/* ── Why NxtSft for NRIs ───────────────────────────────────── */
const WHY: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ShieldCheck, title: "RERA-verified only", text: "Every listing is vetted — no fraud, no surprises." },
  { icon: Headset, title: "Dedicated NRI desk", text: "A single point of contact across every time zone." },
  { icon: Plane, title: "Zero travel needed", text: "Discover, tour and close the deal entirely online." },
  { icon: FileCheck2, title: "FEMA-ready paperwork", text: "Compliant documentation and Power-of-Attorney support." },
  { icon: Wallet, title: "Repatriation support", text: "Records and guidance to move funds back, within limits." },
  { icon: Building2, title: "End-to-end management", text: "Tenant management and property care while you're away." },
];

/* ── FAQ ───────────────────────────────────────────────────── */
const FAQS: { q: string; a: string }[] = [
  {
    q: "Can NRIs buy property in India without visiting?",
    a: "Yes. NRIs can buy residential and commercial property in India remotely. We handle virtual site visits, documentation and a Power of Attorney so you never need to travel.",
  },
  {
    q: "Can I repatriate the money later?",
    a: "Funds are repatriable within RBI/FEMA limits, provided the purchase was made through NRE/NRO/FCNR channels. Our team keeps the paperwork repatriation-ready.",
  },
  {
    q: "Are home loans available for NRIs?",
    a: "Yes. Most major Indian banks offer home loans to NRIs. We assist with eligibility, documentation and lender introductions.",
  },
  {
    q: "Is there a dedicated person to help me?",
    a: "Every NRI gets a dedicated desk contact who coordinates listings, visits, paperwork and closing across your time zone.",
  },
];

export function NriShowcase() {
  useScrollReveal();

  return (
    <main className="bg-[#F4F5F7]">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-navy text-white">
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
            <CitySkySVG />
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div data-reveal="fade" data-visible="" className="mb-3">
            <Eyebrow icon={Globe}>For Non-Resident Indians</Eyebrow>
          </div>
          <h1
            data-reveal
            className="font-display text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl"
            style={{ transitionDelay: "80ms" }}
          >
            Invest. Buy. Rent.{" "}
            <span className="text-gradient-hero">From anywhere in the world.</span>
          </h1>
          <p
            data-reveal
            className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70"
            style={{ transitionDelay: "160ms" }}
          >
            NxtSft.com lets NRIs invest, buy and rent property in India entirely online —
            RERA-verified listings, a dedicated NRI desk, FEMA-ready paperwork and
            repatriation support. No travel required.
          </p>
          <div
            data-reveal
            className="mt-8 flex flex-wrap gap-3"
            style={{ transitionDelay: "240ms" }}
          >
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-display text-sm font-bold text-white shadow-lg shadow-accent/40 transition hover:opacity-90"
            >
              Browse Properties <ArrowRight size={14} />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              Create Free Account
            </Link>
          </div>

          <div
            data-reveal
            className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4"
            style={{ transitionDelay: "300ms" }}
          >
            <StatPill value="100%" label="Online process" delay={0} />
            <StatPill value="RERA" label="Verified listings" delay={60} />
            <StatPill value="6+" label="Major cities" delay={120} />
            <StatPill value="24/7" label="NRI desk" delay={180} />
          </div>
        </div>
      </section>

      {/* ── Three pillars ────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="text-center">
            <div className="flex justify-center">
              <Eyebrow>Three ways to use NxtSft</Eyebrow>
            </div>
            <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
              Whatever brings you home, we handle it
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <div
                key={p.tag}
                data-reveal="scale"
                className="group flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <p.icon size={22} />
                </div>
                <span className="mt-4 text-xs font-bold uppercase tracking-widest text-accent">
                  {p.tag}
                </span>
                <h3 className="mt-1 font-display text-lg font-bold text-navy">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.blurb}</p>
                <ul className="mt-4 space-y-2">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-foreground/80">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-accent" strokeWidth={2.5} />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-accent transition-all hover:gap-2"
                >
                  {p.cta} <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="border-y border-border bg-white px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="text-center">
            <div className="flex justify-center">
              <Eyebrow>How it works</Eyebrow>
            </div>
            <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
              Four steps, zero flights
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                data-reveal="scale"
                className="relative rounded-2xl border border-border bg-[#F4F5F7] p-6"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="absolute right-4 top-4 font-display text-3xl font-black text-border">
                  {i + 1}
                </span>
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white">
                  <s.icon size={20} />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-navy">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured properties (reused home section) ────────── */}
      <FeaturedProperties />

      {/* ── Why NxtSft for NRIs ──────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="text-center">
            <div className="flex justify-center">
              <Eyebrow icon={ShieldCheck}>Why NxtSft</Eyebrow>
            </div>
            <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
              Built for buying from abroad
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHY.map((w, i) => (
              <div
                key={w.title}
                data-reveal="scale"
                className="flex gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <w.icon size={20} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-navy">{w.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{w.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NRI desk CTA band ────────────────────────────────── */}
      <section className="px-4 pb-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div
            data-reveal
            className="relative overflow-hidden rounded-3xl bg-navy px-6 py-10 text-white shadow-2xl sm:px-12 sm:py-12"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <div className="absolute -right-16 -top-16 h-64 w-64 animate-blob rounded-full bg-accent/20 blur-3xl" />
              <div className="absolute -left-10 bottom-0 h-52 w-52 animate-blob-slow rounded-full bg-gold/15 blur-3xl" />
            </div>
            <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div className="max-w-xl">
                <div className="mb-2 inline-flex items-center gap-2">
                  <Headset size={16} className="text-gold" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                    Dedicated NRI desk
                  </span>
                </div>
                <h2 className="font-display text-2xl font-black sm:text-3xl">
                  Talk to a real person, in your time zone
                </h2>
                <p className="mt-2 text-sm text-white/70 sm:text-base">
                  One contact to coordinate listings, virtual tours, paperwork and closing —
                  start to finish.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gold px-7 py-3.5 font-display text-sm font-bold text-navy-deep shadow-lg transition hover:opacity-90"
              >
                Talk to the NRI desk <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div data-reveal className="text-center">
            <div className="flex justify-center">
              <Eyebrow>Common questions</Eyebrow>
            </div>
            <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
              NRI FAQs
            </h2>
          </div>

          <div className="mt-8 space-y-3">
            {FAQS.map((f, i) => (
              <details
                key={f.q}
                data-reveal
                className="group rounded-2xl border border-border bg-white px-5 py-4 shadow-sm"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-sm font-bold text-navy">
                  {f.q}
                  <span className="text-accent transition-transform group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>

          <p data-reveal className="mt-8 text-center text-sm text-muted-foreground">
            Want the full regulatory picture?{" "}
            <Link href="/nri-investment-guide" className="font-bold text-accent hover:underline">
              Read the complete NRI Investment Guide
            </Link>{" "}
            — FEMA, tax, RERA, home loans and repatriation.
          </p>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-7xl">
          <div
            data-reveal
            className="rounded-3xl border border-border bg-white px-6 py-12 text-center shadow-sm sm:px-12"
          >
            <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">
              Start your India property journey today
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
              Create a free account and let our NRI desk take it from there.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="w-full rounded-xl bg-accent px-8 py-3.5 font-display text-sm font-bold text-white shadow-lg shadow-accent/40 transition hover:opacity-90 sm:w-auto"
              >
                Create Free Account
              </Link>
              <Link
                href="/properties"
                className="w-full rounded-xl border border-border px-8 py-3.5 font-display text-sm font-bold text-navy transition hover:bg-secondary sm:w-auto"
              >
                Browse Properties
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
