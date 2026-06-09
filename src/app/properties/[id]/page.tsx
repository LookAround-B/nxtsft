'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { Lock, MapPin, Phone, MessageCircle, Check, Star, Share2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { properties, ownerSlug } from '@/data/static';
import { useAuth } from '@/lib/auth';
import { captureLead } from '@/lib/leads';

const SECTION_IDS = ['section-overview', 'section-about', 'section-amenities', 'section-visit', 'section-nearby', 'section-emi'];

function estimateEMI(principal: number) {
  const P = principal * 0.8;
  const r = 0.086 / 12;
  const n = 240;
  const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi).toLocaleString('en-IN');
}

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [active, setActive] = useState(0);
  const [contactUnlocked, setContactUnlocked] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [tourDay, setTourDay] = useState(0);
  const [tourSlot, setTourSlot] = useState(0);
  const [tourRequested, setTourRequested] = useState(false);
  const [tabsVisible, setTabsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('section-overview');
  const { session, credits, useCredit } = useAuth();

  useEffect(() => {
    const galleryEl = document.getElementById('property-gallery');
    if (!galleryEl) return;
    const visObs = new IntersectionObserver(([e]) => setTabsVisible(!e.isIntersecting), { threshold: 0 });
    visObs.observe(galleryEl);
    const sectionObs: IntersectionObserver[] = [];
    SECTION_IDS.forEach((sid) => {
      const el = document.getElementById(sid);
      if (!el) return;
      const o = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActiveTab(sid); },
        { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
      );
      o.observe(el);
      sectionObs.push(o);
    });
    return () => { visObs.disconnect(); sectionObs.forEach((o) => o.disconnect()); };
  }, []);

  const p = properties.find((x) => x.id === id);
  if (!p) { notFound(); return null; }

  const TOUR_SLOTS = ['10:00 AM – 12:00 PM', '12:00 PM – 02:00 PM', '02:00 PM – 04:00 PM', '04:00 PM – 06:00 PM', '06:00 PM – 08:00 PM'];
  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const tourDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return { short: DAY_SHORT[d.getDay()], date: d.getDate(), mon: MON_SHORT[d.getMonth()] };
  });
  const enquiryCount = ((p.id.charCodeAt(0) + p.id.charCodeAt(p.id.length - 1)) % 7) + 2;

  const handleShare = () => {
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: p.title, text: `${p.priceLabel} — ${p.locality}, ${p.city} | NxtSft.com`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
      setShareCopied(true);
      toast.success('Link copied!', { description: 'Property link copied to clipboard.' });
      setTimeout(() => setShareCopied(false), 2000);
    }
  };
  const signedIn = !!session;

  const SECTION_TABS = [
    { id: 'section-overview',  label: 'Overview' },
    { id: 'section-about',     label: 'About' },
    { id: 'section-amenities', label: 'Amenities' },
    { id: 'section-visit',     label: 'Schedule Visit' },
    { id: 'section-nearby',    label: 'Nearby' },
    ...(p.purpose === 'Sale' ? [{ id: 'section-emi', label: 'EMI Calculator' }] : []),
  ];
  const scrollToSection = (sid: string) => {
    const el = document.getElementById(sid);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: 'smooth' });
  };

  const similar = properties.filter((x) => x.id !== p.id && x.city === p.city).slice(0, 3);
  const similarFallback = similar.length ? similar : properties.filter((x) => x.id !== p.id).slice(0, 3);

  const specs: Array<[string, string | number]> = [
    ['Configuration', p.bhk],
    ['Carpet Area', `${p.area} sqft`],
    ['Bedrooms', p.bedrooms || '—'],
    ['Bathrooms', p.bathrooms],
    ['Balconies', p.balconies],
    ['Parking', `${p.parking} spots`],
    ['Furnishing', p.furnishing],
    ['Facing', p.facing],
    ['Floor', p.floor],
    ['Age', p.age],
    ['Possession', p.possession],
    ['Type', p.type],
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link href="/" className="text-muted-foreground hover:text-accent">Home</Link>
            <span className="text-muted-foreground">/</span>
            <Link href="/properties" className="text-muted-foreground hover:text-accent">Properties</Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-navy">{p.locality}, {p.city}</span>
          </div>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-sm transition hover:border-accent hover:text-accent"
          >
            {shareCopied ? <Check size={12} strokeWidth={2.5} /> : <Share2 size={12} />}
            {shareCopied ? 'Copied!' : 'Share'}
          </button>
        </div>

        {/* Hero gallery */}
        <div id="property-gallery" className="mt-5 grid gap-3 lg:grid-cols-4 lg:grid-rows-2 lg:h-[520px]">
          <button
            onClick={() => setActive(0)}
            className="relative col-span-1 row-span-2 overflow-hidden rounded-2xl border border-border lg:col-span-2 group"
          >
            <img src={p.gallery[active]} alt={p.title} className="h-72 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-96 lg:h-full" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <span className="rounded-md bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">{p.purpose}</span>
              {p.featured && <span className="inline-flex items-center gap-1 rounded-md bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-navy-deep"><Star size={10} className="fill-current" /> Featured</span>}
              <span className="rounded-md bg-navy-deep/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold backdrop-blur">{p.matchScore}% match</span>
            </div>
          </button>
          {p.gallery.slice(1, 5).map((src: string, i: number) => (
            <button
              key={src + i}
              onClick={() => setActive(i + 1)}
              className={`relative hidden overflow-hidden rounded-2xl border lg:block ${active === i + 1 ? 'border-accent ring-2 ring-accent/40' : 'border-border'}`}
            >
              <img src={src} alt={`${p.title} ${i + 2}`} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
              {i === 3 && p.gallery.length > 5 && (
                <div className="absolute inset-0 grid place-items-center bg-navy-deep/60 font-display text-lg font-bold text-white backdrop-blur-sm">
                  +{p.gallery.length - 5} photos
                </div>
              )}
            </button>
          ))}
        </div>
        {/* Mobile thumbnails */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {p.gallery.map((src: string, i: number) => (
            <button key={src + i} onClick={() => setActive(i)} className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${active === i ? 'border-accent' : 'border-border'}`}>
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            <div id="section-overview">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{p.locality}, {p.city}</div>
              <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-navy sm:text-4xl">{p.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-navy"><Check size={11} strokeWidth={2.5} /> RERA {p.rera.slice(0, 14)}…</span>
                <span className="rounded-md bg-gold/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-navy">{p.matchScore}% AI Match</span>
                <span className="rounded-md bg-mid-blue/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-navy">{p.builder}</span>
              </div>
              {/* Mobile price */}
              <div className="mt-4 flex items-baseline justify-between rounded-xl border border-accent/20 bg-accent/8 p-4 lg:hidden">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Asking</div>
                  <div className="font-display text-3xl font-bold text-accent">{p.priceLabel}</div>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  <div>{p.pricePerSqft}/sqft</div>
                  <div>EMI ₹{p.purpose === 'Sale' ? estimateEMI(p.price) : '—'}/mo</div>
                </div>
              </div>
            </div>

            {/* Key specs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {specs.map(([l, v]) => (
                <div key={l} className="rounded-lg border border-border bg-white p-3 sm:p-4">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
                  <div className="mt-1 font-display text-sm font-bold text-navy sm:text-base">{v}</div>
                </div>
              ))}
            </div>

            {/* Exact address — unlock gated */}
            <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-navy">Exact address</h2>
                {!contactUnlocked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-navy">
                    <Lock className="h-3 w-3" /> {signedIn ? 'Unlock required' : 'Login required'}
                  </span>
                )}
              </div>
              {contactUnlocked ? (
                <p className="mt-3 text-sm leading-relaxed text-foreground/80 sm:text-base">
                  Tower B, Plot 42, {p.locality}, {p.city} — 400050. RERA: <span className="font-mono text-xs">{p.rera}</span>
                </p>
              ) : (
                <div className="relative mt-3 overflow-hidden rounded-lg border border-dashed border-border bg-secondary/60 p-5">
                  <p className="select-none text-sm leading-relaxed text-foreground/40 blur-sm">
                    Tower B, Plot 42, Pali Hill Road, Bandra West — 400050. Building marker: GPS 19.0599°N · 72.8295°E.
                  </p>
                  <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-white via-white/85 to-white/40">
                    <Link href="/pricing" className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
                      <Lock className="h-3.5 w-3.5" /> Unlock to view exact address
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div id="section-about" className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold text-navy">About this property</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80 sm:text-base">{p.description}</p>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-5 text-center">
                <div>
                  <div className="font-display text-lg font-bold text-accent">+6.4%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">12-mo forecast</div>
                </div>
                <div>
                  <div className="font-display text-lg font-bold text-accent">{p.matchScore}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">AI lifestyle match</div>
                </div>
                <div>
                  <div className="font-display text-lg font-bold text-accent">{p.pricePerSqft}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Per sqft</div>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div id="section-amenities" className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold text-navy">Amenities ({p.amenities.length})</h2>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {p.amenities.map((a: string) => (
                  <div key={a} className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs font-medium text-navy">
                    <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent/20 text-accent"><Check size={11} strokeWidth={2.5} /></span>
                    {a}
                  </div>
                ))}
              </div>
            </div>

            {/* Site visit scheduler */}
            <div id="section-visit" className="overflow-hidden rounded-xl border border-border bg-white">
              {/* Card header with social proof */}
              <div className="flex items-center justify-between gap-4 border-b border-border bg-gradient-to-r from-accent/6 to-transparent px-5 py-5 sm:px-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-navy">Request a site visit</h2>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <strong className="text-navy">{enquiryCount} people</strong>&nbsp;already requested a visit for this property
                  </div>
                </div>
                <div className="hidden shrink-0 rounded-xl bg-accent/10 p-3 sm:block">
                  <CalendarDays size={22} className="text-accent" />
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {/* Day chips */}
                <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Select a date</div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                  {tourDays.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setTourDay(i)}
                      className={`flex shrink-0 flex-col items-center rounded-xl border-2 px-4 py-2.5 transition ${
                        tourDay === i
                          ? 'border-accent bg-accent/8 text-accent'
                          : 'border-border bg-white text-foreground/60 hover:border-accent/50 hover:text-accent'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wide">{d.short}</span>
                      <span className="font-display text-xl font-black leading-none mt-0.5">{d.date}</span>
                    </button>
                  ))}
                </div>

                {/* Time slot chips */}
                <div className="mt-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Select a time</div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                  {TOUR_SLOTS.map((slot, i) => (
                    <button
                      key={slot}
                      onClick={() => setTourSlot(i)}
                      className={`shrink-0 rounded-xl border-2 px-4 py-2 text-xs font-semibold transition ${
                        tourSlot === i
                          ? 'border-accent bg-accent/8 text-accent'
                          : 'border-border bg-white text-foreground/60 hover:border-accent/50 hover:text-accent'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>

                {/* Selected slot summary */}
                <div className="mt-4 rounded-xl bg-accent/6 px-4 py-3 text-sm font-semibold text-accent">
                  {tourDays[tourDay].short} {tourDays[tourDay].date} {tourDays[tourDay].mon} &nbsp;·&nbsp; {TOUR_SLOTS[tourSlot]}
                </div>

                {/* CTA */}
                {signedIn ? (
                  <button
                    onClick={() => {
                      if (tourRequested) return;
                      captureLead('Schedule Visit', p, session!);
                      setTourRequested(true);
                      toast.success('Site visit requested!', {
                        description: `${p.owner.name} will confirm your slot for ${tourDays[tourDay].short} ${tourDays[tourDay].date} ${tourDays[tourDay].mon}, ${TOUR_SLOTS[tourSlot]}.`,
                      });
                    }}
                    className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display text-sm font-bold shadow-sm transition ${
                      tourRequested
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'bg-accent text-white shadow-accent/20 hover:opacity-90'
                    }`}
                  >
                    {tourRequested ? <><Check size={15} strokeWidth={2.5} /> Visit Requested</> : 'Request a Site Visit'}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-display text-sm font-bold text-white shadow-sm shadow-accent/20 transition hover:opacity-90"
                  >
                    <Lock size={14} /> Sign in to request a visit
                  </Link>
                )}
              </div>
            </div>

            {/* Nearby */}
            <div id="section-nearby" className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold text-navy">What's nearby</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(p.nearby as [string, string][]).map(([name, dist]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-mid-blue/30 text-mid-blue"><MapPin size={16} strokeWidth={1.75} /></span>
                      <span className="text-sm font-medium text-navy">{name}</span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{dist}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* EMI estimator */}
            {p.purpose === 'Sale' && (
              <div id="section-emi" className="rounded-xl border border-border bg-gradient-to-br from-secondary to-muted p-5 sm:p-6">
                <h2 className="font-display text-xl font-bold text-navy">EMI Estimator</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-4">
                  {[
                    ['Down Payment (20%)', `₹${(p.price * 0.2 / 100000).toFixed(1)} L`],
                    ['Loan Amount', `₹${(p.price * 0.8 / 10000000).toFixed(2)} Cr`],
                    ['Tenure', '20 years'],
                    ['Monthly EMI', `₹${estimateEMI(p.price)}`],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
                      <div className="mt-1 font-display text-base font-bold text-navy">{v}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground">* Indicative at 8.6% p.a. interest. Actuals vary by bank, profile and tenure.</p>
              </div>
            )}
          </div>

          {/* Sticky sidebar */}
          <aside
            className="space-y-5 lg:sticky lg:self-start transition-[top] duration-300"
            style={{ top: tabsVisible ? '7.75rem' : '5rem' }}
          >
            <div className="hidden rounded-xl border border-border bg-white p-6 shadow-sm lg:block">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Asking Price</div>
              <div className="mt-1 font-display text-4xl font-bold text-accent">{p.priceLabel}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {p.pricePerSqft}/sqft
                {p.purpose === 'Sale' && ` · EMI ₹${estimateEMI(p.price)}/mo`}
              </div>
              <button
                onClick={handleShare}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-2 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent"
              >
                {shareCopied ? <Check size={12} strokeWidth={2.5} /> : <Share2 size={12} />}
                {shareCopied ? 'Link copied!' : 'Share this property'}
              </button>
              {signedIn ? (
                <>
                  <button onClick={() => { captureLead('Schedule Visit', p, session!); toast.success('Site visit requested', { description: `${p.owner.name} will confirm a slot within 30 min.` }); }} className="mt-5 w-full rounded-md bg-accent py-3 font-display text-sm font-bold text-white shadow-sm shadow-accent/30 hover:opacity-90">Schedule Site Visit</button>
                  <button onClick={() => { captureLead('Request Callback', p, session!); toast.success('Callback requested', { description: `${p.owner.name} will call ${session?.phone} shortly.` }); }} className="mt-2 w-full rounded-md border border-border py-3 font-display text-sm font-bold text-navy hover:bg-secondary">Request Callback</button>
                </>
              ) : (
                <>
                  <Link href="/login" className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-accent py-3 font-display text-sm font-bold text-white shadow-sm shadow-accent/30 hover:opacity-90"><Lock className="h-4 w-4" /> Sign in to Schedule Visit</Link>
                  <Link href="/login" className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-border py-3 font-display text-sm font-bold text-navy hover:bg-secondary"><Lock className="h-4 w-4" /> Request Callback</Link>
                  <p className="mt-3 text-center text-[11px] text-muted-foreground">Free account · 30 second sign-in</p>
                </>
              )}
            </div>

            <div className="rounded-xl border border-border bg-white p-6">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Listed By</div>
              <Link href={'/agents/' + ownerSlug(p.owner.name)} className="mt-3 flex items-center gap-3 rounded-lg p-2 -mx-2 transition hover:bg-secondary/60">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-mid-blue text-white font-display text-lg font-bold">{p.owner.initials}</div>
                <div>
                  <div className="font-display font-bold text-navy">{p.owner.name}</div>
                  <div className="text-xs text-muted-foreground">{p.owner.role} <span className="text-accent">· View listings →</span></div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-accent"><Star size={11} className="fill-current" /> {p.owner.rating} · {p.owner.deals} deals</div>
                </div>
              </Link>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[11px]">
                <div className="rounded-md bg-secondary px-3 py-2">
                  <div className="text-muted-foreground">Since</div>
                  <div className="font-display font-bold text-navy">{p.owner.since}</div>
                </div>
                <div className="rounded-md bg-secondary px-3 py-2">
                  <div className="text-muted-foreground">Response</div>
                  <div className="font-display font-bold text-navy">&lt; 30 min</div>
                </div>
              </div>
              {/* Contact unlock system */}
              {!signedIn ? (
                // Not signed in
                <>
                  <div className="mt-4 rounded-md border border-dashed border-border bg-secondary/60 px-3 py-2.5 text-center">
                    <div className="select-none font-mono text-sm font-semibold text-foreground/40 blur-[5px]">+91 98xxx 88421</div>
                  </div>
                  <Link href="/login" className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-accent py-2.5 text-sm font-semibold text-white hover:opacity-90">
                    <Lock className="h-4 w-4" /> Sign in to unlock contact
                  </Link>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">Sign in, then use 1 credit to reveal phone & address</p>
                </>
              ) : contactUnlocked ? (
                // Contact already unlocked
                <>
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <Check size={14} className="text-emerald-600" strokeWidth={2.5} />
                    <span className="text-xs font-semibold text-emerald-700">Contact Unlocked</span>
                  </div>
                  <a href={`tel:${p.owner.phone.replace(/\s/g, '')}`} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-accent py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
                    <Phone size={14} /> Call {p.owner.phone}
                  </a>
                  <button onClick={() => { captureLead('WhatsApp', p, session!); toast.success('Opening WhatsApp…', { description: `Chat with ${p.owner.name} about ${p.title}.` }); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
                    <MessageCircle size={14} /> WhatsApp Agent
                  </button>
                </>
              ) : credits > 0 ? (
                // Signed in, has credits
                <>
                  <div className="mt-4 rounded-md border border-dashed border-border bg-secondary/60 px-3 py-2.5 text-center">
                    <div className="select-none font-mono text-sm font-semibold text-foreground/40 blur-[5px]">+91 98xxx 88421</div>
                  </div>
                  <button
                    onClick={() => {
                      if (useCredit()) {
                        setContactUnlocked(true);
                        captureLead('Unlock Contact', p, session!);
                        toast.success('Contact unlocked!', { description: `${credits - 1} credit${credits - 1 !== 1 ? 's' : ''} remaining.` });
                      }
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-accent py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90"
                  >
                    <Lock className="h-4 w-4" /> Unlock Contact — 1 Credit
                  </button>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">{credits} credit{credits !== 1 ? 's' : ''} remaining in your plan</p>
                </>
              ) : (
                // Signed in, no credits
                <>
                  <div className="mt-4 rounded-md border border-dashed border-border bg-secondary/60 px-3 py-2.5 text-center">
                    <div className="select-none font-mono text-sm font-semibold text-foreground/40 blur-[5px]">+91 98xxx 88421</div>
                  </div>
                  <Link href="/pricing" className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-accent py-2.5 text-sm font-semibold text-white hover:opacity-90">
                    <Lock className="h-4 w-4" /> Get a Plan to Unlock
                  </Link>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">Plans from ₹99 · No brokerage</p>
                </>
              )}
            </div>

            <div className="rounded-xl border border-border bg-white p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="font-display text-base font-bold text-navy">Send an enquiry</div>
                {!signedIn && <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              {signedIn ? (
                <form>
                  <div className="mt-3 space-y-2">
                    <input defaultValue={session?.name} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Your name" />
                    <input defaultValue={session?.phone} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Phone (+91)" />
                    <textarea rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder={`I'm interested in ${p.title.split('—')[0].trim()}…`} />
                  </div>
                  <button type="button" onClick={() => toast.success('Enquiry sent', { description: `${p.owner.name} usually responds in < 30 min.` })} className="mt-3 w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-accent-foreground">Send enquiry</button>
                </form>
              ) : (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">Sign in to send a direct enquiry to {p.owner.name}. Your name and phone auto-fill from your profile.</p>
                  <Link href="/login" className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-accent py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"><Lock className="h-4 w-4" /> Sign in to enquire</Link>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Similar */}
        <div className="mt-16">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">Similar properties</h2>
            <Link href="/properties" className="text-sm font-semibold text-accent hover:underline">View all →</Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similarFallback.map((sp) => (
              <Link key={sp.id} href={'/properties/' + sp.id} className="group overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-2xl">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={sp.image} alt={sp.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                  <span className="absolute right-3 top-3 rounded-md bg-navy-deep/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">{sp.matchScore}%</span>
                </div>
                <div className="p-4">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{sp.locality}, {sp.city}</div>
                  <h3 className="mt-1 font-display text-base font-bold text-navy">{sp.title}</h3>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-display text-lg font-bold text-accent">{sp.priceLabel}</span>
                    <span className="text-xs text-muted-foreground">{sp.bhk} · {sp.area}sqft</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky section tab bar — slides in from above after scrolling past gallery */}
      <nav
        aria-label="Page sections"
        className={`fixed left-0 right-0 top-0 z-30 border-b border-border bg-white/96 shadow-sm backdrop-blur-md transition-transform duration-300 ${
          tabsVisible ? 'translate-y-16 sm:translate-y-20' : '-translate-y-full'
        }`}
      >
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6 [&::-webkit-scrollbar]:hidden">
          <div className="flex">
            {SECTION_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); scrollToSection(tab.id); }}
                className={`relative shrink-0 px-4 py-3.5 text-[13px] font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'text-accent'
                    : 'text-foreground/55 hover:text-foreground'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <SiteFooter />
    </div>
  );
}
