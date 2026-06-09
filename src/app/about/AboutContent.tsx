'use client';
import { useEffect, useState, useRef } from 'react';
import { ShieldCheck, Users, BarChart2, Zap } from 'lucide-react';

/* ── Count-up hook ─────────────────────────────── */
function useCountUp(target: number, duration = 1400, active = false) {
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

/* ── City skyline decoration ───────────────────── */
function CitySVG() {
  return (
    <svg
      className="absolute bottom-0 left-0 w-full pointer-events-none select-none"
      viewBox="0 0 900 90"
      preserveAspectRatio="xMidYMax slice"
      fill="currentColor"
      aria-hidden
    >
      <rect x="0"   y="68" width="28"  height="22"/>
      <rect x="30"  y="48" width="20"  height="42"/>
      <rect x="52"  y="58" width="14"  height="32"/>
      <rect x="68"  y="32" width="32"  height="58"/>
      <rect x="72"  y="20" width="6"   height="14"/>
      <rect x="102" y="52" width="18"  height="38"/>
      <rect x="122" y="40" width="34"  height="50"/>
      <rect x="158" y="64" width="14"  height="26"/>
      <rect x="174" y="24" width="40"  height="66"/>
      <rect x="178" y="12" width="6"   height="14"/>
      <rect x="216" y="54" width="18"  height="36"/>
      <rect x="236" y="44" width="28"  height="46"/>
      <rect x="266" y="62" width="14"  height="28"/>
      <rect x="282" y="36" width="36"  height="54"/>
      <rect x="320" y="56" width="18"  height="34"/>
      <rect x="340" y="28" width="44"  height="62"/>
      <rect x="346" y="14" width="8"   height="16"/>
      <rect x="386" y="50" width="20"  height="40"/>
      <rect x="408" y="40" width="30"  height="50"/>
      <rect x="440" y="60" width="16"  height="30"/>
      <rect x="458" y="30" width="40"  height="60"/>
      <rect x="464" y="16" width="7"   height="16"/>
      <rect x="500" y="52" width="18"  height="38"/>
      <rect x="520" y="42" width="32"  height="48"/>
      <rect x="554" y="64" width="14"  height="26"/>
      <rect x="570" y="34" width="38"  height="56"/>
      <rect x="610" y="54" width="20"  height="36"/>
      <rect x="632" y="26" width="46"  height="64"/>
      <rect x="638" y="12" width="8"   height="16"/>
      <rect x="680" y="50" width="20"  height="40"/>
      <rect x="702" y="44" width="30"  height="46"/>
      <rect x="734" y="64" width="14"  height="26"/>
      <rect x="750" y="32" width="40"  height="58"/>
      <rect x="792" y="58" width="18"  height="32"/>
      <rect x="812" y="40" width="34"  height="50"/>
      <rect x="848" y="60" width="16"  height="30"/>
      <rect x="866" y="36" width="34"  height="54"/>
      <rect x="0"   y="88" width="900" height="4"/>
    </svg>
  );
}

/* ── Stat counter card ─────────────────────────── */
function StatCard({ raw, label, delay }: { raw: string; label: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  /* parse a numeric prefix from the raw string: "$1T" → 1, "40M+" → 40 */
  const numMatch = raw.match(/[\d.]+/);
  const num = numMatch ? parseFloat(numMatch[0]) : 0;
  const prefix = raw.match(/^[^0-9]*/)?.[0] ?? '';
  const suffix = raw.slice((prefix + numMatch?.[0]).length);

  const count = useCountUp(num, 1400, active);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect(); } },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal="scale"
      className="flex flex-col"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="font-display text-3xl font-black text-accent sm:text-4xl">
        {prefix}{active ? (Number.isInteger(num) ? count : count.toFixed(0)) : 0}{suffix}
      </div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

const VALUES = [
  { Icon: ShieldCheck, title: 'Transparency First', desc: 'Every listing is RERA-verified. No hidden fees, no grey-market deals.' },
  { Icon: Users,       title: 'People-Centric',    desc: 'Dedicated relationship managers ensure no buyer or seller is left without support.' },
  { Icon: BarChart2,   title: 'Data-Driven',        desc: 'Price analytics, locality trends and demand signals — all in real time.' },
  { Icon: Zap,         title: 'Technology-Led',     desc: 'AI matching, smart alerts and automated CRM workflows built for modern India.' },
];

const STATS: { raw: string; label: string }[] = [
  { raw: '$1T',     label: 'RE market by 2030' },
  { raw: '13%',     label: 'Share of GDP' },
  { raw: '40M+',    label: 'Transactions / yr' },
  { raw: '₹12K Cr', label: 'PropTech TAM' },
];

export function AboutContent() {
  /* global scroll-reveal observer for this client tree */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-visible])');
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { (e.target as HTMLElement).setAttribute('data-visible', ''); obs.unobserve(e.target); }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* ── Hero ───────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-navy text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {/* blobs */}
          <div className="absolute -right-20 -top-10 h-80 w-80 animate-blob rounded-full opacity-20 blur-3xl"
            style={{ background: 'oklch(0.72 0.12 186)' }} />
          <div className="absolute -left-10 top-1/2 h-60 w-60 animate-blob-slow rounded-full opacity-15 blur-3xl"
            style={{ background: 'oklch(0.76 0.14 76)' }} />
          {/* spinning rings */}
          <div className="absolute right-8 top-8 h-20 w-20 animate-spin-slow rounded-full border border-white/8" />
          {/* city skyline */}
          <div className="absolute inset-x-0 bottom-0 text-white/[0.06]">
            <CitySVG />
          </div>
        </div>

        <div className="relative mx-auto max-w-4xl px-6 py-20 sm:py-24">
          <div
            data-reveal="fade"
            data-visible=""
            className="text-xs font-bold uppercase tracking-widest text-gradient-accent"
          >
            About Us
          </div>
          <h1
            data-reveal
            className="mt-3 font-display text-4xl font-black leading-tight text-white sm:text-5xl"
            style={{ transitionDelay: '80ms' }}
          >
            Real estate,{' '}
            <span className="text-gradient-hero">re-engineered</span>{' '}
            for India.
          </h1>
          <p
            data-reveal
            className="mt-5 max-w-2xl text-lg text-white/70"
            style={{ transitionDelay: '160ms' }}
          >
            NxtSft.com democratises real estate transactions by building a transparent, technology-first marketplace — eliminating friction, opacity and information asymmetry from every step.
          </p>
        </div>
      </section>

      {/* ── Vision / Mission ───────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <div className="grid gap-8 md:grid-cols-2">
          <div
            data-reveal="left"
            className="rounded-2xl border border-border bg-white p-7 shadow-sm"
          >
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-gradient-accent">Vision</div>
            <h2 className="mb-3 font-display text-xl font-black text-navy">For every Indian, everywhere</h2>
            <p className="text-foreground/75 leading-relaxed">
              A pan-India marketplace that empowers buyers, renters, sellers, developers and agents — from Tier-3 first-time buyers to 500-unit developers.
            </p>
          </div>
          <div
            data-reveal="right"
            className="rounded-2xl border border-border bg-white p-7 shadow-sm"
          >
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-gradient-accent">Mission</div>
            <h2 className="mb-3 font-display text-xl font-black text-navy">Tools, data, and support</h2>
            <p className="text-foreground/75 leading-relaxed">
              Deliver an integrated platform where every stakeholder has access to best-in-class tools, data and support — backed by AI.
            </p>
          </div>
        </div>

        {/* Market stats */}
        <div className="mt-10 rounded-2xl border border-border bg-white p-8 shadow-sm">
          <div data-reveal className="mb-7">
            <div className="text-xs font-bold uppercase tracking-widest text-gradient-accent">The Opportunity</div>
            <h2 className="mt-2 font-display text-xl font-black text-navy">India&apos;s real estate market in numbers</h2>
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
            <div className="text-xs font-bold uppercase tracking-widest text-gradient-accent">Our Values</div>
            <h2 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">What we stand for</h2>
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

      {/* ── CTA strip ──────────────────────────── */}
      <section className="px-6 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <div
            data-reveal
            className="relative overflow-hidden rounded-3xl bg-navy px-8 py-10 text-center text-white sm:px-14"
          >
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute -right-10 -top-10 h-52 w-52 animate-blob rounded-full bg-accent/20 blur-3xl" />
              <div className="absolute -left-8 bottom-0 h-40 w-40 animate-blob-slow rounded-full bg-gold/15 blur-3xl" />
              <div className="absolute inset-x-0 bottom-0 text-white/[0.05]"><CitySVG /></div>
            </div>
            <div className="relative">
              <h2 className="font-display text-2xl font-black sm:text-3xl">
                Start your journey with <span className="text-gradient-gold">NxtSft.com</span>
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm text-white/70">
                Whether you&apos;re buying, renting or selling — we&apos;re here to make it seamless.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href="/properties"
                  className="w-full rounded-xl bg-accent px-8 py-3 font-display text-sm font-bold text-white shadow-lg shadow-accent/40 transition hover:opacity-90 sm:w-auto"
                >
                  Browse Properties
                </a>
                <a
                  href="/pricing"
                  className="w-full rounded-xl border border-white/25 bg-white/10 px-8 py-3 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 sm:w-auto"
                >
                  View Plans
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
