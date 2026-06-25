"use client";
import { useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  ShieldCheck,
  Building2,
  IndianRupee,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  CreditCard,
  Home,
  MapPin,
  Users,
  ArrowRight,
  Scale,
  Landmark,
  Wallet,
  BadgeCheck,
} from "lucide-react";
// SiteHeader/SiteFooter are provided globally by SiteChrome — do not render here.

/* ── Decorative city skyline (reused from About) ───────────── */
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

/* ── Key stat pill ──────────────────────────────────────────── */
function StatPill({
  value,
  label,
  delay = 0,
}: {
  value: string;
  label: string;
  delay?: number;
}) {
  return (
    <div
      data-reveal="scale"
      className="flex flex-col items-center rounded-2xl border border-white/15 bg-white/10 px-6 py-5 text-center backdrop-blur"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="font-display text-3xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/60">
        {label}
      </div>
    </div>
  );
}

/* ── Section heading helper ─────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold uppercase tracking-widest text-gradient-accent">
      {children}
    </div>
  );
}

/* ── Checklist item ──────────────────────────────────────────── */
function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-foreground/80">
      <CheckCircle2
        size={15}
        className="mt-0.5 shrink-0 text-accent"
        strokeWidth={2.5}
      />
      <span>{text}</span>
    </li>
  );
}

/* ── Account type card ───────────────────────────────────────── */
function AccountCard({
  abbr,
  name,
  points,
  delay = 0,
}: {
  abbr: string;
  name: string;
  points: string[];
  delay?: number;
}) {
  return (
    <div
      data-reveal="scale"
      className="flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="mb-3 inline-flex items-center gap-2">
        <span className="rounded-lg bg-accent px-2.5 py-1 font-display text-xs font-black text-white">
          {abbr}
        </span>
        <span className="text-xs text-muted-foreground">{name}</span>
      </div>
      <ul className="mt-1 space-y-2">
        {points.map((p) => (
          <CheckItem key={p} text={p} />
        ))}
      </ul>
    </div>
  );
}

/* ── Growth market card ──────────────────────────────────────── */
function CityCard({
  city,
  tag,
  highlight,
  note,
  delay = 0,
}: {
  city: string;
  tag: string;
  highlight: string;
  note: string;
  delay?: number;
}) {
  return (
    <div
      data-reveal="scale"
      className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-bold text-navy">{city}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
        </div>
        <span className="flex-shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-accent">
          {tag}
        </span>
      </div>
      <div className="mt-auto pt-3 border-t border-border text-sm font-bold text-emerald-700">
        {highlight}
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export function NriGuideContent() {
  useScrollReveal();

  return (
    <>
      <main>
        {/* ── Hero ──────────────────────────────────────────── */}
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
            <div className="absolute right-32 top-32 h-12 w-12 animate-spin-slow rounded-full border border-white/5" />
            <div className="absolute inset-x-0 bottom-0 text-white/[0.05]">
              <CitySVG />
            </div>
          </div>

          <div className="relative mx-auto max-w-5xl px-6 py-20 sm:py-28">
            <div
              data-reveal="fade"
              data-visible=""
              className="mb-3 flex items-center gap-2"
            >
              <Globe size={14} className="text-accent" />
              <span className="text-xs font-bold uppercase tracking-widest text-gradient-accent">
                NRI Investment Guide
              </span>
            </div>
            <h1
              data-reveal
              className="font-display text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl"
              style={{ transitionDelay: "80ms" }}
            >
              Invest in India from{" "}
              <span className="text-gradient-hero">Anywhere in the World</span>
            </h1>
            <p
              data-reveal
              className="mt-5 max-w-2xl text-lg text-white/70 leading-relaxed"
              style={{ transitionDelay: "160ms" }}
            >
              Everything Non-Resident Indians need to know about buying property in India
              — FEMA rules, tax obligations, RERA compliance, home loans, and repatriation
              limits, all in one place.
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
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                Talk to an Expert
              </Link>
            </div>

            {/* Stat pills */}
            <div
              data-reveal
              className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4"
              style={{ transitionDelay: "300ms" }}
            >
              <StatPill value="10.5%" label="YoY Price Growth" />
              <StatPill value="4–6%" label="Rental Yield" delay={80} />
              <StatPill value="USD 1M" label="Repatriation Cap / Yr" delay={160} />
              <StatPill value="7.5–9%" label="Home Loan Rate" delay={240} />
            </div>
          </div>
        </section>

        {/* ── Why NRIs Choose India ─────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div data-reveal className="mb-10">
            <SectionLabel>The Opportunity</SectionLabel>
            <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
              Why NRIs are flocking to Indian real estate
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
              India's property market is one of the most compelling investment destinations for
              the global Indian diaspora — buoyed by strong fundamentals, a weaker rupee, and
              surging demand in metro cities.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                Icon: TrendingUp,
                title: "Strong Appreciation",
                desc: "Delhi-NCR residential prices grew 10.5% year-on-year (Knight Frank India 2024). Gurgaon, Noida and Greater Noida are leading this surge.",
              },
              {
                Icon: IndianRupee,
                title: "Attractive Yields",
                desc: "Metro cities deliver 4–6% annual rental yields (CBRE India). Stable passive income denominated in INR, with no cap on ownership.",
              },
              {
                Icon: Globe,
                title: "Currency Advantage",
                desc: "A weaker rupee stretches every foreign-currency dollar, pound or dirham — making Indian property significantly more affordable.",
              },
              {
                Icon: ShieldCheck,
                title: "RERA Protection",
                desc: "The Real Estate Regulation Act mandates transparency, project registration and fund discipline — a strong safety net for remote investors.",
              },
            ].map(({ Icon, title, desc }, i) => (
              <div
                key={title}
                data-reveal="scale"
                className="flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg"
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
        </section>

        {/* ── FEMA Eligibility ─────────────────────────────────── */}
        <section className="bg-white px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div data-reveal className="mb-10">
              <SectionLabel>Legal Framework</SectionLabel>
              <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
                Who is eligible under FEMA?
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div
                data-reveal="left"
                className="rounded-2xl border border-border bg-secondary/30 p-7"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Users size={20} strokeWidth={1.75} />
                  </span>
                  <h3 className="font-display text-lg font-bold text-navy">Who Can Invest</h3>
                </div>
                <ul className="space-y-2.5">
                  {[
                    "Indian citizens residing outside India for more than 182 days in a financial year (NRI status)",
                    "Overseas Citizens of India (OCI cardholders) on the same footing as NRIs",
                    "No cap on the number of properties you can own in India",
                    "Joint ownership with other NRIs, OCIs, or resident Indians is fully permitted",
                  ].map((p) => (
                    <CheckItem key={p} text={p} />
                  ))}
                </ul>
              </div>
              <div
                data-reveal="right"
                className="rounded-2xl border border-amber-200 bg-amber-50 p-7"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                    <Scale size={20} strokeWidth={1.75} />
                  </span>
                  <h3 className="font-display text-lg font-bold text-navy">Important Notes</h3>
                </div>
                <ul className="space-y-2.5">
                  {[
                    "Joint ownership with non-NRI/non-OCI foreign nationals is restricted (unless inherited)",
                    "Persons of Indian Origin (PIOs) who have not obtained OCI status should seek separate legal advice",
                    "FEMA regulations are governed by the Reserve Bank of India — always verify current rules",
                  ].map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-foreground/80">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── What You Can Buy ─────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div data-reveal className="mb-10">
            <SectionLabel>Property Types</SectionLabel>
            <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
              What properties can NRIs buy?
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Permitted */}
            <div
              data-reveal="left"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-7"
            >
              <div className="mb-5 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" strokeWidth={2.5} />
                <h3 className="font-display text-lg font-bold text-emerald-800">Permitted</h3>
              </div>
              <div className="space-y-3">
                {[
                  {
                    Icon: Building2,
                    label: "Residential Properties",
                    desc: "Apartments, villas, plotted developments, townhouses",
                  },
                  {
                    Icon: Home,
                    label: "Commercial Properties",
                    desc: "Office spaces, retail shops, warehouses, mixed-use buildings",
                  },
                ].map(({ Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3 rounded-xl bg-white/70 p-4">
                    <span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <div>
                      <div className="font-semibold text-sm text-navy">{label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Restricted */}
            <div
              data-reveal="right"
              className="rounded-2xl border border-red-200 bg-red-50 p-7"
            >
              <div className="mb-5 flex items-center gap-2">
                <XCircle size={18} className="text-red-500" strokeWidth={2.5} />
                <h3 className="font-display text-lg font-bold text-red-800">Restricted</h3>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                NRIs and OCIs cannot directly purchase these property types under FEMA:
              </p>
              <div className="space-y-3">
                {[
                  { label: "Agricultural Land", desc: "Farms, cultivated land, orchards" },
                  { label: "Plantation Properties", desc: "Tea, coffee, rubber estates etc." },
                  { label: "Farmhouses", desc: "Rural residential on agricultural land" },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-start gap-3 rounded-xl bg-white/70 p-4">
                    <XCircle size={14} className="mt-0.5 flex-shrink-0 text-red-400" />
                    <div>
                      <div className="font-semibold text-sm text-navy">{label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground/70">
                Note: Restricted properties may still be inherited or received as a gift from a
                resident Indian under certain conditions.
              </p>
            </div>
          </div>
        </section>

        {/* ── Payment Modes ────────────────────────────────────── */}
        <section className="bg-white px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div data-reveal className="mb-10">
              <SectionLabel>Banking & Payments</SectionLabel>
              <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
                Permitted payment accounts
              </h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                All property payments must be routed through RBI-approved NRI accounts. Cash
                transactions are not permitted.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <AccountCard
                abbr="NRE"
                name="Non-Resident External"
                points={[
                  "Freely repatriable — funds can be sent back abroad anytime",
                  "Principal and interest both repatriable",
                  "Tax-free interest income in India",
                  "Best for investing from abroad",
                ]}
                delay={0}
              />
              <AccountCard
                abbr="NRO"
                name="Non-Resident Ordinary"
                points={[
                  "For managing income earned in India (rent, dividends)",
                  "Repatriation capped at USD 1 million per financial year",
                  "Form 15CA/CB required for repatriation",
                  "Interest is taxable in India",
                ]}
                delay={80}
              />
              <AccountCard
                abbr="FCNR"
                name="Foreign Currency Non-Resident"
                points={[
                  "Deposits held in foreign currency (USD, GBP, EUR, etc.)",
                  "Insulates savings from INR depreciation",
                  "Interest and principal fully repatriable",
                  "Ideal for tenure-based FDs",
                ]}
                delay={160}
              />
            </div>

            {/* Repatriation callout */}
            <div
              data-reveal
              className="mt-8 flex flex-wrap items-start gap-4 rounded-2xl border border-accent/20 bg-accent/5 p-6"
            >
              <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                <Wallet size={20} strokeWidth={1.75} />
              </span>
              <div className="flex-1">
                <h4 className="font-display font-bold text-navy">Repatriation Limits</h4>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  You can repatriate up to{" "}
                  <span className="font-semibold text-navy">USD 1 million per financial year</span>{" "}
                  (inclusive of all transactions). Rental income is repatriable after applicable TDS
                  deductions. Form 15CA / Form 15CB from a Chartered Accountant is mandatory for
                  remittances above the prescribed threshold.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Home Loans ───────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div data-reveal className="mb-10">
            <SectionLabel>Financing</SectionLabel>
            <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
              Home loan eligibility for NRIs
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div data-reveal="left" className="rounded-2xl border border-border bg-white p-7 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                  <CreditCard size={20} strokeWidth={1.75} />
                </span>
                <h3 className="font-display text-lg font-bold text-navy">Eligibility Criteria</h3>
              </div>
              <ul className="space-y-2.5">
                {[
                  "Age between 21 and 60 years",
                  "Minimum annual income of approx. USD 26,000 (for US-based NRIs); varies by country",
                  "Good credit score in country of residence",
                  "Down payment of 10–20% of property value",
                  "Valid passport, visa, and work permit or employment contract",
                ].map((p) => (
                  <CheckItem key={p} text={p} />
                ))}
              </ul>
            </div>
            <div data-reveal="right" className="rounded-2xl border border-border bg-white p-7 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Landmark size={20} strokeWidth={1.75} />
                </span>
                <h3 className="font-display text-lg font-bold text-navy">Rates & Lenders</h3>
              </div>
              <div className="mb-4 rounded-xl bg-secondary/40 px-4 py-3">
                <div className="text-xs text-muted-foreground">Current Home Loan Rate (2025)</div>
                <div className="font-display text-2xl font-black text-navy">7.5 – 9%</div>
                <div className="text-xs text-muted-foreground">per annum (floating rate basis)</div>
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Popular Lenders
              </div>
              <div className="flex flex-wrap gap-2">
                {["HDFC Bank", "ICICI Bank", "SBI Home Loans", "Axis Bank", "Bank of Baroda"].map(
                  (bank) => (
                    <span
                      key={bank}
                      className="rounded-full border border-border bg-secondary/30 px-3 py-1 text-xs font-semibold text-navy"
                    >
                      {bank}
                    </span>
                  ),
                )}
              </div>
              <p className="mt-4 text-xs text-muted-foreground/70">
                EMI repayments must be made from NRE or NRO accounts only. Loan tenure typically
                up to 20–25 years.
              </p>
            </div>
          </div>
        </section>

        {/* ── Documents ────────────────────────────────────────── */}
        <section className="bg-white px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div data-reveal className="mb-10">
              <SectionLabel>Documentation</SectionLabel>
              <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
                Documents you&apos;ll need
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Identity & Residency",
                  Icon: BadgeCheck,
                  items: [
                    "Valid Indian passport",
                    "Current visa or OCI card",
                    "Work permit or employment contract",
                    "Address proof from country of residence",
                  ],
                },
                {
                  title: "Financial Documents",
                  Icon: IndianRupee,
                  items: [
                    "Last 3 years' Income Tax Returns (ITR)",
                    "6 months' salary slips",
                    "6 months' NRE/NRO bank statements",
                    "PAN card (mandatory for transactions above ₹50 lakh) or Form 60",
                  ],
                },
                {
                  title: "Property Documents",
                  Icon: FileText,
                  items: [
                    "Property title deed and sale agreement",
                    "Encumbrance certificate",
                    "RERA registration certificate",
                    "NOC from housing society / builder",
                    "Power of Attorney (if transacting via representative)",
                  ],
                },
              ].map(({ title, Icon, items }, i) => (
                <div
                  key={title}
                  data-reveal="scale"
                  className="rounded-2xl border border-border bg-secondary/20 p-6"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <h3 className="font-display text-sm font-bold text-navy">{title}</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {items.map((item) => (
                      <CheckItem key={item} text={item} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tax Implications ─────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div data-reveal className="mb-10">
            <SectionLabel>Tax Guide</SectionLabel>
            <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
              Tax implications for NRI property owners
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              India has Double Taxation Avoidance Agreements (DTAAs) with over 90 countries — you
              likely won&apos;t pay tax twice on the same income.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Rental income */}
            <div
              data-reveal="left"
              className="rounded-2xl border border-border bg-white p-7 shadow-sm"
            >
              <h3 className="mb-4 font-display text-lg font-bold text-navy">Rental Income</h3>
              <div className="space-y-4">
                <div className="rounded-xl bg-secondary/40 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    TDS by Tenant
                  </div>
                  <div className="font-display text-2xl font-black text-navy">30%</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Deducted at source before rent is paid to NRI
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {[
                    "Net rental income taxed at applicable income slab rates",
                    "30% standard deduction on gross annual rent before tax calculation",
                    "Property tax paid is deductible",
                    "Home loan interest is deductible for let-out properties",
                  ].map((p) => (
                    <CheckItem key={p} text={p} />
                  ))}
                </ul>
              </div>
            </div>

            {/* Capital gains */}
            <div
              data-reveal="right"
              className="rounded-2xl border border-border bg-white p-7 shadow-sm"
            >
              <h3 className="mb-4 font-display text-lg font-bold text-navy">Capital Gains on Sale</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                      Short-Term
                    </div>
                    <div className="font-display text-lg font-black text-amber-800">Slab Rate</div>
                    <div className="text-[10px] text-amber-700/70 mt-0.5">Held under 24 months</div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                      Long-Term
                    </div>
                    <div className="font-display text-lg font-black text-emerald-800">20%</div>
                    <div className="text-[10px] text-emerald-700/70 mt-0.5">Held over 24 months + indexation</div>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {[
                    "TDS of 20–30% deducted by buyer at time of property sale",
                    "Indexation benefit reduces taxable gains for long-term holdings",
                    "Reinvest gains in another property (Section 54) to defer tax",
                    "DTAA with your country of residence may reduce final liability",
                  ].map((p) => (
                    <CheckItem key={p} text={p} />
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* DTAA callout */}
          <div
            data-reveal
            className="mt-8 rounded-2xl border border-border bg-secondary/20 p-6"
          >
            <div className="flex flex-wrap items-start gap-4">
              <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-navy/10 text-navy">
                <Globe size={20} strokeWidth={1.75} />
              </span>
              <div className="flex-1">
                <h4 className="font-display font-bold text-navy">
                  Double Taxation Avoidance Agreements (DTAA)
                </h4>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  India has DTAAs with over 90 countries including the USA, UAE, UK, Canada,
                  Australia and Singapore. To claim DTAA benefits, obtain a{" "}
                  <span className="font-semibold text-navy">Tax Residency Certificate (TRC)</span>{" "}
                  from the tax authority in your country of residence. Consult a qualified CA to
                  determine how this applies to your specific situation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Power of Attorney ────────────────────────────────── */}
        <section className="bg-white px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div data-reveal className="mb-10">
              <SectionLabel>Power of Attorney</SectionLabel>
              <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
                Managing transactions remotely
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div
                data-reveal="left"
                className="rounded-2xl border border-border bg-secondary/20 p-7"
              >
                <h3 className="mb-4 font-display text-base font-bold text-navy">
                  What a PoA holder can do
                </h3>
                <ul className="space-y-2.5">
                  {[
                    "Sign and execute sale agreements on your behalf",
                    "Register the property at the sub-registrar's office",
                    "Handle banking transactions related to the property",
                    "Manage rental agreements and maintenance",
                    "Pay property tax and utility bills",
                  ].map((p) => (
                    <CheckItem key={p} text={p} />
                  ))}
                </ul>
              </div>
              <div
                data-reveal="right"
                className="flex flex-col gap-4"
              >
                <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-accent" />
                    <span className="font-display text-sm font-bold text-navy">Best Practice</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Use a{" "}
                    <span className="font-semibold text-navy">specific, limited PoA</span> — one that
                    covers only the defined real estate transaction. Avoid a general PoA. Have it
                    notarised and apostilled in your country of residence, then registered in India.
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <span className="font-display text-sm font-bold text-navy">
                      After Transaction
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Revoke the PoA as soon as the transaction is complete. Keep certified copies of
                    the registration documents and retain the original PoA for your records.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── RERA Compliance ──────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div data-reveal className="mb-10">
            <SectionLabel>RERA Compliance</SectionLabel>
            <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
              Your shield against fraud — RERA
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              The Real Estate (Regulation and Development) Act, 2016 is a landmark law that
              protects homebuyers — especially those investing from abroad who can&apos;t physically
              inspect projects.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Project Registration",
                desc: "All projects above 500 sq.m or 8 units must be RERA-registered before any marketing or sale. Always verify on your state's RERA portal.",
              },
              {
                title: "Fund Protection",
                desc: "Developers must deposit 70% of buyer funds in a separate escrow account, ensuring money is used only for that project's construction.",
              },
              {
                title: "Timeline Accountability",
                desc: "Builders are legally bound to deliver by the registered possession date. Delays attract interest compensation for buyers.",
              },
              {
                title: "Title Verification",
                desc: "Check title deeds, encumbrance certificates and ensure there are no court disputes or mortgages on the property before signing.",
              },
              {
                title: "Permits & Clearances",
                desc: "Verify environmental clearances, building plan approvals, and OC (Occupancy Certificate) for completed projects.",
              },
              {
                title: "Developer Track Record",
                desc: "Research past projects — delivery timelines, quality complaints, RERA violations — before committing to a new project.",
              },
            ].map(({ title, desc }, i) => (
              <div
                key={title}
                data-reveal="scale"
                className="rounded-2xl border border-border bg-white p-5 shadow-sm"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <BadgeCheck size={14} className="text-accent" />
                  <h3 className="font-display text-sm font-bold text-navy">{title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Top Mistakes ─────────────────────────────────────── */}
        <section className="bg-white px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div data-reveal className="mb-10">
              <SectionLabel>Pitfalls</SectionLabel>
              <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
                5 mistakes NRIs must avoid
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  n: "01",
                  title: "Skipping Title Verification",
                  desc: "Buying without a clear title check can result in costly legal disputes years later.",
                },
                {
                  n: "02",
                  title: "Ignoring RERA",
                  desc: "Investing in an unregistered project offers zero legal recourse if the builder defaults.",
                },
                {
                  n: "03",
                  title: "Overlooking Tax",
                  desc: "Missing TDS obligations, misreporting capital gains, or ignoring DTAA benefits can lead to penalties.",
                },
                {
                  n: "04",
                  title: "Poor Location Research",
                  desc: "Buying in a low-demand micro-market can lock up capital with minimal appreciation or rentability.",
                },
                {
                  n: "05",
                  title: "No Professional Help",
                  desc: "Skipping a property lawyer, CA, and property manager is the most expensive shortcut you can take.",
                },
              ].map(({ n, title, desc }, i) => (
                <div
                  key={n}
                  data-reveal="scale"
                  className="relative flex flex-col rounded-2xl border border-border bg-secondary/20 p-5"
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <div className="mb-3 font-display text-3xl font-black text-border">{n}</div>
                  <h3 className="mb-1.5 font-display text-sm font-bold text-navy">{title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Growth Markets ───────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div data-reveal className="mb-10">
            <SectionLabel>Where to Invest</SectionLabel>
            <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
              High-potential markets for NRIs
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              These markets offer a combination of infrastructure development, price
              appreciation potential, and strong NRI demand.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CityCard
              city="Gurgaon"
              tag="Premium"
              highlight="Luxury high-rises, strong corporate demand"
              note="Delhi NCR — established market, MNC hub"
              delay={0}
            />
            <CityCard
              city="Noida / Greater Noida"
              tag="Value"
              highlight="Affordable modern flats, metro connectivity"
              note="Delhi NCR — Jewar Airport infrastructure"
              delay={80}
            />
            <CityCard
              city="Dwarka Expressway"
              tag="Hotspot"
              highlight="12–15% annual appreciation potential"
              note="Delhi NCR — fastest-growing corridor"
              delay={160}
            />
            <CityCard
              city="Bengaluru"
              tag="Tech Hub"
              highlight="4–5% rental yields, strong IT demand"
              note="Whitefield, Electronic City, Sarjapur"
              delay={0}
            />
            <CityCard
              city="Hyderabad"
              tag="Emerging"
              highlight="Competitive pricing, pharma/IT growth"
              note="HITEC City, Gachibowli corridor"
              delay={80}
            />
            <CityCard
              city="Chandigarh"
              tag="NRI Favourite"
              highlight="Planned city, strong Punjab NRI connection"
              note="Mohali & Panchkula corridors growing"
              delay={160}
            />
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
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
                  Ready to Invest?
                </div>
                <h2 className="font-display text-2xl font-black sm:text-3xl">
                  Start your NRI investment journey with{" "}
                  <span className="text-gradient-gold">NxtSft.com</span>
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm text-white/70 leading-relaxed">
                  Browse RERA-verified properties across India, connect with trusted developers,
                  and get dedicated NRI support from our team — all from the comfort of your home
                  abroad.
                </p>
                <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/properties"
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3 font-display text-sm font-bold text-white shadow-lg shadow-accent/40 transition hover:opacity-90"
                  >
                    Browse Properties <ArrowRight size={14} />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-8 py-3 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    Contact an NRI Expert
                  </Link>
                </div>
                <p className="mt-5 text-xs text-white/40">
                  This guide is for informational purposes only. Consult a qualified CA and
                  property lawyer before making investment decisions.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
