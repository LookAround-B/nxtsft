"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, Users, BarChart2, Zap, Home, Search,
  Building2, IndianRupee, CheckCircle2, MessageCircle,
  MapPin, Mail, Phone, Globe, Camera, ArrowRight,
  ChevronDown, ChevronUp, Star, TrendingUp, Layers,
} from "lucide-react";

/* ── Scroll-reveal ──────────────────────────────────────────── */
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
      <rect x="0" y="68" width="28" height="22" /><rect x="30" y="48" width="20" height="42" />
      <rect x="52" y="58" width="14" height="32" /><rect x="68" y="32" width="32" height="58" />
      <rect x="72" y="20" width="6" height="14" /><rect x="102" y="52" width="18" height="38" />
      <rect x="122" y="40" width="34" height="50" /><rect x="158" y="64" width="14" height="26" />
      <rect x="174" y="24" width="40" height="66" /><rect x="178" y="12" width="6" height="14" />
      <rect x="216" y="54" width="18" height="36" /><rect x="236" y="44" width="28" height="46" />
      <rect x="266" y="62" width="14" height="28" /><rect x="282" y="36" width="36" height="54" />
      <rect x="320" y="56" width="18" height="34" /><rect x="340" y="28" width="44" height="62" />
      <rect x="346" y="14" width="8" height="16" /><rect x="386" y="50" width="20" height="40" />
      <rect x="408" y="40" width="30" height="50" /><rect x="440" y="60" width="16" height="30" />
      <rect x="458" y="30" width="40" height="60" /><rect x="464" y="16" width="7" height="16" />
      <rect x="500" y="52" width="18" height="38" /><rect x="520" y="42" width="32" height="48" />
      <rect x="554" y="64" width="14" height="26" /><rect x="570" y="34" width="38" height="56" />
      <rect x="610" y="54" width="20" height="36" /><rect x="632" y="26" width="46" height="64" />
      <rect x="638" y="12" width="8" height="16" /><rect x="680" y="50" width="20" height="40" />
      <rect x="702" y="44" width="30" height="46" /><rect x="734" y="64" width="14" height="26" />
      <rect x="750" y="32" width="40" height="58" /><rect x="792" y="58" width="18" height="32" />
      <rect x="812" y="40" width="34" height="50" /><rect x="848" y="60" width="16" height="30" />
      <rect x="866" y="36" width="34" height="54" /><rect x="0" y="88" width="900" height="4" />
    </svg>
  );
}

/* ── Photo placeholder ───────────────────────────────────────── */
function PhotoBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-secondary/30 ${className}`}
    >
      <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
        <Camera size={26} strokeWidth={1.25} />
        <span className="text-[10px] font-medium uppercase tracking-wider">Photo</span>
      </div>
    </div>
  );
}

/* ── FAQ accordion ───────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 py-5 text-left text-sm font-semibold text-navy transition hover:text-accent"
      >
        {q}
        {open ? (
          <ChevronUp size={16} className="mt-0.5 shrink-0 text-accent" />
        ) : (
          <ChevronDown size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>}
    </div>
  );
}

/* ── Data ────────────────────────────────────────────────────── */
const NAV_SECTIONS = [
  { id: "about",    label: "About Us" },
  { id: "buyers",   label: "For Buyers & Renters" },
  { id: "owners",   label: "For Property Owners" },
  { id: "whatsapp", label: "List via WhatsApp" },
  { id: "team",     label: "Our Team" },
  { id: "faq",      label: "FAQs" },
  { id: "contact",  label: "Contact Us" },
];

const STATS = [
  { raw: "50K+", label: "Active Listings" },
  { raw: "30+",  label: "Cities" },
  { raw: "₹0",   label: "Brokerage for Buyers" },
  { raw: "100%", label: "RERA-Verified" },
];

const VALUES = [
  { Icon: ShieldCheck, title: "Integrity First",    desc: "Every listing verified, every claim backed. We publish only what we can stand behind." },
  { Icon: Zap,         title: "Technology-Led",      desc: "AI at every layer — search, matching, pricing, fraud detection. We build for 10× not 10%." },
  { Icon: Users,       title: "Customer-Obsessed",   desc: "Buyers, renters, owners, developers — every decision is measured by value delivered to them." },
  { Icon: Globe,       title: "Inclusive Growth",    desc: "Tier-1 to Tier-3, metro to district town. Real estate transparency for every Indian." },
];

function StatCard({ raw, label }: { raw: string; label: string; delay?: number }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="font-display text-2xl font-black text-navy sm:text-3xl">{raw}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</div>
    </div>
  );
}

const BUYER_BENEFITS = [
  { Icon: IndianRupee,   title: "Zero Brokerage",        desc: "What you see is what you pay. No hidden commissions. No broker fee on top of rent or purchase price — ever." },
  { Icon: ShieldCheck,   title: "RERA-Verified Listings", desc: "Every property on NxtSft.com is cross-checked against the RERA portal. No fake listings. No fly-by-night developers." },
  { Icon: Search,        title: "AI-Powered Matching",    desc: "Our recommendation engine learns your preferences and surfaces the most relevant homes first — not the most boosted." },
  { Icon: Building2,     title: "Direct Owner Connect",   desc: "Chat directly with the owner or developer. No middleman controlling information or pushing you toward unsuitable properties." },
  { Icon: BarChart2,     title: "Price Transparency",     desc: "Access historical price trends, comparable transactions, and neighbourhood analytics to make an informed offer." },
  { Icon: MapPin,        title: "Rich Location Data",     desc: "Schools, hospitals, metro stations, markets — every listing comes with a full neighbourhood profile so you never buy blind." },
];

const OWNER_BENEFITS = [
  { Icon: TrendingUp,  title: "Earn Up to 4% More",       desc: "Owners who list directly on NxtSft.com consistently achieve 2–4% higher rent or sale price vs. broker-negotiated deals — because there's no middleman taking a cut." },
  { Icon: Users,       title: "Verified Buyer Pool",       desc: "Every enquiry comes from a KYC-verified user with genuine intent. No broker mass-blasts, no time-wasters." },
  { Icon: Zap,         title: "List in Under 5 Minutes",   desc: "Our guided listing flow takes less than five minutes. Add photos, set your price, go live. It's that simple." },
  { Icon: ShieldCheck, title: "Your Terms, Always",        desc: "You decide who sees your property, when to arrange viewings, and who to deal with. Zero broker interference." },
  { Icon: Home,        title: "Free — Always",             desc: "Listing on NxtSft.com is completely free for property owners. We monetise through buyers and premium services, not by charging you." },
  { Icon: Star,        title: "30% Faster Closure",        desc: "Direct owner–buyer connects on NxtSft.com close deals 30% faster on average than broker-mediated transactions." },
];

const WHATSAPP_STEPS = [
  { n: "01", title: "Save our number", desc: "Save +91 90000 NXTSFT (placeholder) to your contacts. Then send a WhatsApp message with 'LIST' to get started." },
  { n: "02", title: "Share property details", desc: "Send the address, property type, carpet area, expected price/rent, and available date. Photos are optional at this stage." },
  { n: "03", title: "We verify & publish", desc: "Our team calls you within 4 hours to verify ownership and complete the listing. Your property goes live within 24 hours." },
  { n: "04", title: "Receive verified enquiries", desc: "All enquiries routed directly to your WhatsApp or phone. No broker intermediary, ever." },
];

const LEADERSHIP = [
  { role: "Founder & CEO" },
  { role: "Chief Technology Officer" },
  { role: "Chief Product Officer" },
  { role: "Chief Growth Officer" },
  { role: "Chief People Officer" },
  { role: "Chief Financial Officer" },
];

const FAQS = [
  { q: "What exactly is NxtSft.com?", a: "NxtSft.com is India's technology-first real estate marketplace. We connect property buyers, renters, sellers, and developers directly — removing information asymmetry, fake listings, and broker commissions from the equation. Our platform is RERA-verified, AI-powered, and completely free for buyers." },
  { q: "Is NxtSft.com really zero brokerage for buyers?", a: "Yes, absolutely. NxtSft.com charges zero brokerage to buyers and renters. The price listed on the platform is the price you pay. We earn through premium listing plans for property owners and developers — never by taking a percentage of your deal." },
  { q: "Are all listings RERA-verified?", a: "Yes. Every project listing on NxtSft.com is cross-verified against the relevant state RERA portal. Individual owner listings are verified through our KYC process. If a listing cannot be verified, it is not published. We'd rather show fewer listings than compromise on quality." },
  { q: "How do I list my property on NxtSft.com?", a: "You can list via our web form at nxtsft.com/list (takes under 5 minutes), via WhatsApp (send 'LIST' to our number), or by calling our owner support team. Listing is completely free. We'll verify your ownership documents and publish your property within 24 hours." },
  { q: "What cities does NxtSft.com operate in?", a: "We are currently active in Mumbai, Delhi NCR, Bengaluru, Hyderabad, Pune, Chennai, Kolkata, Ahmedabad, Jaipur, Kochi, and 20+ more cities. We're expanding rapidly — if your city isn't listed yet, register your interest and we'll notify you when we launch there." },
  { q: "How does the AI matching work?", a: "Our recommendation engine analyses your search behaviour, shortlists, saved properties, and stated preferences to understand what you're really looking for — not just what you typed. Over time it surfaces more relevant results without you having to refine your search manually." },
  { q: "I'm an NRI. Can I invest through NxtSft.com?", a: "Yes. We have a dedicated NRI investment desk. We can help you navigate FEMA rules, connect you with RERA-compliant projects, arrange virtual tours, and assist with Power of Attorney arrangements for remote transactions. Visit our NRI Guide page for more details." },
  { q: "Is my data safe on NxtSft.com?", a: "Yes. We are compliant with India's Digital Personal Data Protection Act (DPDPA). Your contact details are never sold to brokers or third parties. We never share your information with unverified parties." },
];

const CONTACTS = [
  { Icon: Mail,  label: "General Enquiries", value: "hello@nxtsft.com",       href: "mailto:hello@nxtsft.com" },
  { Icon: Mail,  label: "Buyer / Renter Support", value: "care@nxtsft.com",   href: "mailto:care@nxtsft.com" },
  { Icon: Mail,  label: "Owner / Developer Support", value: "list@nxtsft.com", href: "mailto:list@nxtsft.com" },
  { Icon: Mail,  label: "Careers",            value: "careers@nxtsft.com",    href: "mailto:careers@nxtsft.com" },
  { Icon: Mail,  label: "Partnerships",       value: "partners@nxtsft.com",   href: "mailto:partners@nxtsft.com" },
  { Icon: Globe, label: "Media & Press",      value: "press@nxtsft.com",      href: "mailto:press@nxtsft.com" },
];

/* ── Sticky sidebar navigation ───────────────────────────────── */
function SideNav({ active }: { active: string }) {
  return (
    <nav className="hidden xl:block sticky top-24 w-44 shrink-0 self-start">
      <ul className="space-y-1">
        {NAV_SECTIONS.map(({ id, label }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active === id
                  ? "bg-accent/8 font-semibold text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ── Section wrapper ─────────────────────────────────────────── */
function Section({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 py-16 sm:py-20 ${className}`}
    >
      {children}
    </section>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export function AboutContent() {
  useScrollReveal();
  const [activeSection, setActiveSection] = useState("about");

  /* Track which section is in view for the sticky nav */
  useEffect(() => {
    const sectionEls = NAV_SECTIONS.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const top = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
          );
          setActiveSection(top.target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    sectionEls.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-navy text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -right-20 -top-10 h-96 w-96 animate-blob rounded-full opacity-20 blur-3xl"
            style={{ background: "oklch(0.72 0.12 186)" }} />
          <div className="absolute -left-10 top-1/3 h-72 w-72 animate-blob-slow rounded-full opacity-15 blur-3xl"
            style={{ background: "oklch(0.76 0.14 76)" }} />
          <div className="absolute right-10 top-10 h-24 w-24 animate-spin-slow rounded-full border border-white/8" />
          <div className="absolute inset-x-0 bottom-0 text-white/[0.05]"><CitySVG /></div>
        </div>
        <div className="relative mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-gradient-accent">About Us</div>
          <h1 className="font-display text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            Welcome to <span className="text-gradient-hero">NxtSft.com</span>
          </h1>
          <p
            data-reveal
            className="mt-5 max-w-2xl text-lg text-white/70"
            style={{ transitionDelay: "160ms" }}
          >
            We&apos;re tearing down the walls of Indian real estate — no commissions, no middlemen,
            no guesswork. Just verified homes, honest prices and AI that actually understands what
            you&apos;re looking for.
          </p>
          <div
            data-reveal
            className="mt-7 flex flex-wrap gap-2.5"
            style={{ transitionDelay: "240ms" }}
          >
            {["Zero Commission", "RERA-Verified", "AI-Matched", "10,000+ Homes"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-sm"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Vision / Mission ───────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <div className="grid gap-8 md:grid-cols-2">
          <div
            data-reveal="left"
            className="rounded-2xl border border-border bg-white p-7 shadow-sm"
          >
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-gradient-accent">
              Vision
            </div>
            <h2 className="mb-3 font-display text-xl font-black text-navy">
              For every Indian, everywhere
            </h2>
            <p className="text-foreground/75 leading-relaxed">
              A pan-India marketplace that empowers buyers, renters, sellers, developers and agents
              — from Tier-3 first-time buyers to 500-unit developers.
            </p>
          </div>
          <div
            data-reveal="right"
            className="rounded-2xl border border-border bg-white p-7 shadow-sm"
          >
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-gradient-accent">
              Mission
            </div>
            <h2 className="mb-3 font-display text-xl font-black text-navy">
              Tools, data, and support
            </h2>
            <p className="text-foreground/75 leading-relaxed">
              Deliver an integrated platform where every stakeholder has access to best-in-class
              tools, data and support — backed by AI.
            </p>
          </div>
        </div>

        {/* Market stats */}
        <div className="mt-10 rounded-2xl border border-border bg-white p-8 shadow-sm">
          <div data-reveal className="mb-7">
            <div className="text-xs font-bold uppercase tracking-widest text-gradient-accent">
              The Opportunity
            </div>
            <h2 className="mt-2 font-display text-xl font-black text-navy">
              India&apos;s real estate market in numbers
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((s, i) => (
              <StatCard key={s.label} raw={s.raw} label={s.label} delay={i * 80} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ─────────────────────────────── */}
      <section className="bg-white px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div data-reveal className="mb-10 text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-gradient-accent">
              Our Values
            </div>
            <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
              What we stand for
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ Icon, title, desc }, i) => (
              <div
                key={title}
                data-reveal="scale"
                className="flex flex-col rounded-2xl border border-border bg-secondary/30 p-5 transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Icon size={22} strokeWidth={1.75} />
                </span>
                <h3 className="mb-1 font-display text-base font-bold text-navy">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mobile quick-nav ──────────────────────────────────── */}
      <div className="sticky top-16 z-30 overflow-x-auto border-b border-border bg-background/95 backdrop-blur-md xl:hidden">
        <div className="flex min-w-max gap-1 px-4 py-2">
          {NAV_SECTIONS.map(({ id, label }) => (
            <a key={id} href={`#${id}`}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeSection === id ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
              }`}>
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* ── Main layout: sidebar + content ────────────────────── */}
      <div className="mx-auto flex max-w-5xl gap-10 px-6">
        <SideNav active={activeSection} />

        <div className="min-w-0 flex-1">

          {/* ══ ABOUT US ══════════════════════════════════════════ */}
          <Section id="about">
            <div data-reveal className="mb-3 text-xs font-bold uppercase tracking-widest text-gradient-accent">
              Who we are
            </div>
            <h2 className="font-display text-3xl font-black leading-snug text-navy sm:text-4xl">
              NxtSft.com is a disruptive real estate platform
              that makes buying, selling and renting{" "}
              <span className="text-accent">transparent and broker-free</span>.
            </h2>

            <div className="mt-8 grid gap-8 md:grid-cols-2 md:items-center">
              <div className="space-y-5 text-foreground/75 leading-relaxed">
                <p>
                  NxtSft.com was built because our founders — like millions of Indians — experienced
                  first-hand the frustration of paying 1–2 months' rent as brokerage just to access
                  information that should have been free. Brokers existed not because they added
                  value, but because they held information hostage.
                </p>
                <p>
                  We set out to fix this. By building a platform where property data, owner contacts,
                  RERA registrations, price histories, and locality analytics are freely accessible
                  to every buyer and renter — we have removed the broker's only advantage: information
                  asymmetry.
                </p>
                <p>
                  Today, NxtSft.com serves buyers, renters, sellers, developers and agents across
                  30+ cities with RERA-verified listings, AI-powered matching, and a commitment that
                  is simple: <strong className="text-navy">no buyer ever pays brokerage on our platform</strong>.
                </p>
              </div>
              <PhotoBox className="aspect-[4/3]" />
            </div>

            {/* Values */}
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {[
                { Icon: ShieldCheck, title: "Transparency First",   desc: "Every listing RERA-verified. Every price honest. No hidden charges at any step." },
                { Icon: Users,       title: "People Over Middlemen", desc: "Buyers connect directly with owners. Owners receive verified enquiries. No broker gatekeeping." },
                { Icon: BarChart2,   title: "Data-Driven",          desc: "Price analytics, locality trends, and demand signals available to everyone — not just agents." },
                { Icon: Zap,         title: "Technology-Led",       desc: "AI matching, smart alerts, automated CRM — built for the India of today, not the India of 2005." },
              ].map(({ Icon, title, desc }, i) => (
                <div key={title} data-reveal="scale" className="flex gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm"
                  style={{ transitionDelay: `${i * 60}ms` }}>
                  <span className="mt-0.5 grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <div>
                    <h3 className="font-display text-sm font-bold text-navy">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <hr className="border-border" />

          {/* ══ FOR BUYERS & RENTERS ══════════════════════════════ */}
          <Section id="buyers">
            <div data-reveal className="mb-3 text-xs font-bold uppercase tracking-widest text-gradient-accent">
              For Buyers &amp; Renters
            </div>
            <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">
              Find your home without paying a single rupee to a broker.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              We've done two things to help you find the perfect home: verified every listing, and
              given you access to the same information brokers used to hoard.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BUYER_BENEFITS.map(({ Icon, title, desc }, i) => (
                <div key={title} data-reveal="scale"
                  className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
                  style={{ transitionDelay: `${i * 60}ms` }}>
                  <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <h3 className="mb-1 font-display text-sm font-bold text-navy">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>

            <div data-reveal className="mt-8 flex flex-wrap gap-3">
              <Link href="/properties"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90">
                Browse Properties <ArrowRight size={14} />
              </Link>
              <Link href="/nri-guide"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-navy transition hover:bg-secondary">
                NRI Investment Guide
              </Link>
            </div>
          </Section>

          <hr className="border-border" />

          {/* ══ FOR PROPERTY OWNERS ═══════════════════════════════ */}
          <Section id="owners" className="bg-secondary/20 -mx-6 px-6 rounded-2xl">
            <div data-reveal className="mb-3 text-xs font-bold uppercase tracking-widest text-gradient-accent">
              For Property Owners
            </div>
            <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">
              List free. Earn more. No broker, ever.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Landlords and sellers who list directly on NxtSft.com earn 2–4% more and close 30% faster —
              because there's no broker taking a cut and no incentive to steer buyers away from your property.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {OWNER_BENEFITS.map(({ Icon, title, desc }, i) => (
                <div key={title} data-reveal="scale"
                  className="flex flex-col rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                  style={{ transitionDelay: `${i * 60}ms` }}>
                  <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <h3 className="mb-1 font-display text-sm font-bold text-navy">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>

            <div data-reveal className="mt-8 flex flex-wrap gap-3">
              <Link href="/list"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90">
                List Your Property Free <ArrowRight size={14} />
              </Link>
            </div>
          </Section>

          <hr className="border-border" />

          {/* ══ WHATSAPP LISTING ══════════════════════════════════ */}
          <Section id="whatsapp">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <div data-reveal className="mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    <MessageCircle size={12} /> WhatsApp Listing
                  </span>
                </div>
                <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">
                  List your property in 4 messages.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Can't sit at a computer? No problem. Send us a WhatsApp and we'll handle the rest.
                  Your property goes live within 24 hours — completely free.
                </p>

                <ol className="mt-8 space-y-5">
                  {WHATSAPP_STEPS.map(({ n, title, desc }) => (
                    <li key={n} className="flex gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 font-display text-xs font-black text-white">
                        {n}
                      </div>
                      <div className="pt-1">
                        <div className="font-semibold text-sm text-navy">{title}</div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <a href="https://wa.me/919000000000?text=LIST"
                  target="_blank" rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center gap-2.5 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Send 'LIST' on WhatsApp
                </a>
              </div>

              {/* Phone mockup visual */}
              <div data-reveal="right" className="flex justify-center">
                <div className="relative w-[220px]">
                  <div className="rounded-3xl border-4 border-navy bg-white shadow-2xl overflow-hidden">
                    {/* Status bar */}
                    <div className="bg-navy px-4 py-2 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center">
                        <MessageCircle size={14} className="text-white" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-white">NxtSft.com</div>
                        <div className="text-[8px] text-white/60">Online</div>
                      </div>
                    </div>
                    {/* Chat bubbles */}
                    <div className="bg-[#ece5dd] p-3 space-y-2 min-h-[280px]">
                      <div className="ml-auto max-w-[75%] rounded-2xl rounded-tr-sm bg-emerald-100 p-2.5 text-[10px] text-navy shadow-sm">
                        LIST
                      </div>
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white p-2.5 text-[10px] text-navy shadow-sm">
                        Welcome to NxtSft.com! Send us your property address to get started 🏠
                      </div>
                      <div className="ml-auto max-w-[75%] rounded-2xl rounded-tr-sm bg-emerald-100 p-2.5 text-[10px] text-navy shadow-sm">
                        2BHK, Koramangala, Bengaluru — ₹28,000/mo
                      </div>
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white p-2.5 text-[10px] text-navy shadow-sm">
                        Perfect! We'll verify &amp; publish in 24 hrs. Our team will call you shortly ✅
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <hr className="border-border" />

          {/* ══ OUR TEAM ══════════════════════════════════════════ */}
          <Section id="team">
            <div data-reveal className="mb-3 text-xs font-bold uppercase tracking-widest text-gradient-accent">
              Our Team
            </div>
            <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">
              Our rockstar leadership
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              We don't just have leaders — we have builders. People who've been in the trenches,
              who understand real estate and technology, and who bring out the best in every person
              around them.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3">
              {LEADERSHIP.map(({ role }, i) => (
                <div key={role} data-reveal="scale"
                  className="flex flex-col items-center text-center"
                  style={{ transitionDelay: `${i * 80}ms` }}>
                  <PhotoBox className="w-full max-w-[180px] aspect-[3/4]" />
                  <div className="mt-3 text-sm font-bold text-navy">{role}</div>
                </div>
              ))}
            </div>

            <div data-reveal className="mt-8 rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
              <p className="font-display text-lg font-black leading-snug text-navy sm:text-xl">
                &ldquo;We hire people who are better than us at what they do — and then we trust
                them completely.&rdquo;
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Founder, NxtSft.com</p>
              <div className="mt-4">
                <Link href="/careers"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-secondary">
                  Join our team <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </Section>

          <hr className="border-border" />

          {/* ══ FAQs ══════════════════════════════════════════════ */}
          <Section id="faq">
            <div data-reveal className="mb-3 text-xs font-bold uppercase tracking-widest text-gradient-accent">
              FAQs
            </div>
            <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">
              Frequently asked questions
            </h2>
            <div className="mt-8 rounded-2xl border border-border bg-white px-6">
              {FAQS.map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </Section>

          <hr className="border-border" />

          {/* ══ CONTACT US ════════════════════════════════════════ */}
          <Section id="contact">
            <div data-reveal className="mb-3 text-xs font-bold uppercase tracking-widest text-gradient-accent">
              Contact Us
            </div>
            <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">
              We're always here to help.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Whether you're a buyer, owner, developer, or just curious — reach out and we'll get
              back to you within one business day.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CONTACTS.map(({ Icon, label, value, href }) => (
                <a key={label} href={href} data-reveal="scale"
                  className="flex items-start gap-3 rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md">
                  <span className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
                    <div className="mt-0.5 text-sm font-medium text-navy">{value}</div>
                  </div>
                </a>
              ))}
            </div>

            {/* CTA strip */}
            <div data-reveal
              className="relative mt-12 overflow-hidden rounded-3xl bg-navy px-8 py-10 text-center text-white sm:px-14">
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div className="absolute -right-10 -top-10 h-52 w-52 animate-blob rounded-full bg-accent/20 blur-3xl" />
                <div className="absolute -left-8 bottom-0 h-40 w-40 animate-blob-slow rounded-full bg-gold/15 blur-3xl" />
                <div className="absolute inset-x-0 bottom-0 text-white/[0.05]"><CitySVG /></div>
              </div>
              <div className="relative">
                <h2 className="font-display text-xl font-black sm:text-2xl">
                  Start your journey with <span className="text-gradient-gold">NxtSft.com</span>
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-white/70">
                  Whether you're buying, renting or selling — we're here to make it seamless.
                </p>
                <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link href="/properties"
                    className="rounded-xl bg-accent px-7 py-3 font-display text-sm font-bold text-white shadow-lg shadow-accent/40 transition hover:opacity-90">
                    Browse Properties
                  </Link>
                  <Link href="/list"
                    className="rounded-xl border border-white/25 bg-white/10 px-7 py-3 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">
                    List Your Property
                  </Link>
                </div>
              </div>
            </div>
          </Section>

        </div>{/* end content column */}
      </div>{/* end layout row */}
    </>
  );
}
