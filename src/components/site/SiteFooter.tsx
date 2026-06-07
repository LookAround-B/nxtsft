import Link from 'next/link';
import { MapPin, ExternalLink, Instagram, Youtube, Facebook, Twitter } from 'lucide-react';

const FOOTER_LINKS = {
  discover: [
    { href: '/properties',                    label: 'All Properties' },
    { href: '/properties?type=Apartment',     label: 'Apartments for Sale' },
    { href: '/properties?type=Villa',         label: 'Villas for Sale' },
    { href: '/properties?type=Plot',          label: 'Plots & Land' },
    { href: '/properties?type=Commercial',    label: 'Commercial Spaces' },
    { href: '/properties?type=PG',            label: 'PG & Co-living' },
  ],
  company: [
    { href: '/about',         label: 'About NxtSft.com' },
    { href: '/pricing',       label: 'Pricing Plans' },
    { href: '/contact',       label: 'Contact Us' },
    { href: '/about#careers', label: 'Careers' },
    { href: '/about#press',   label: 'Press & Media' },
  ],
  quick: [
    { href: '/contact',    label: 'Help & Support' },
    { href: '/login',      label: 'Sign In' },
    { href: '/register',   label: 'Create Account' },
    { href: '/pricing',    label: 'View Plans' },
    { href: '/admin-login',label: 'Staff Portal', external: true },
  ],
  cities: [
    { href: '/properties?city=Mumbai',     label: 'Mumbai' },
    { href: '/properties?city=Bengaluru',  label: 'Bengaluru' },
    { href: '/properties?city=Delhi%20NCR',label: 'Delhi NCR' },
    { href: '/properties?city=Hyderabad',  label: 'Hyderabad' },
    { href: '/properties?city=Pune',       label: 'Pune' },
    { href: '/properties?city=Chennai',    label: 'Chennai' },
  ],
};

const HL = 'text-xs font-bold uppercase tracking-[3px] mb-5';

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden">
      {/* Navy bg with dot pattern */}
      <div
        className="absolute inset-0 bg-navy"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      {/* ── Link columns ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 pt-14 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Discover */}
          <div>
            <h3 className={HL} style={{ color: 'var(--gold)' }}>Discover</h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.discover.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/60 transition hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className={HL} style={{ color: 'var(--gold)' }}>Company</h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.company.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/60 transition hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className={HL} style={{ color: 'var(--gold)' }}>Quick Links</h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.quick.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex items-center gap-1 text-sm text-white/60 transition hover:text-white">
                    {l.label}
                    {l.external && <ExternalLink className="w-3 h-3 opacity-50" />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Top Cities */}
          <div>
            <h3 className={HL} style={{ color: 'var(--gold)' }}>Top Cities</h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.cities.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/60 transition hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 border-t border-white/8" />

      {/* ── About Us + Connect With Us ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* About Us */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <img src="/navbar.png" alt="NxtSft.com" className="h-20 w-auto object-contain brightness-0 invert" />
            </div>
            <h3 className={HL} style={{ color: 'var(--gold)' }}>About Us</h3>
            <p className="text-sm leading-relaxed text-white/70">
              NxtSft.com is India&apos;s next-generation real estate ecosystem — connecting buyers, sellers, builders and agents through a single intelligent platform. With RERA-verified listings, AI-powered matching, zero brokerage and an integrated CRM+ERP suite, we make every property transaction transparent, efficient and trustworthy.
            </p>
            <div className="flex items-center gap-1.5 mt-4 text-sm text-white/50">
              <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--gold)' }} />
              Cyber City, Gurugram 122002, Haryana, India
            </div>
          </div>

          {/* Connect With Us */}
          <div>
            <h3 className={HL} style={{ color: 'var(--gold)' }}>Connect With Us</h3>
            <div className="space-y-4">
              {[
                { role: 'General Enquiries',           email: 'hello@nxtsft.com' },
                { role: 'Customer Support',            email: 'care@nxtsft.com' },
                { role: 'Career Opportunities',        email: 'careers@nxtsft.com' },
                { role: 'Builder / Agent Partnerships',email: 'partners@nxtsft.com' },
              ].map(({ role, email }) => (
                <div key={email}>
                  <p className="text-xs text-white/40 mb-0.5">{role}</p>
                  <a href={`mailto:${email}`} className="text-sm text-white/80 transition hover:text-gold">{email}</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 border-t border-white/8" />

      {/* ── App Download + Keep In Touch ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* App Download */}
          <div>
            <h3 className={HL} style={{ color: 'var(--gold)' }}>Experience NxtSft.com App on Mobile</h3>
            <p className="text-sm text-white/60 mb-5">Search, shortlist, buy and sell — all from your phone.</p>
            <div className="flex gap-3 flex-wrap">
              {/* Google Play */}
              <a href="#" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/20 bg-white/5 transition hover:border-gold">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3.5L13.5 12L3 20.5V3.5Z" fill="#EA4335" />
                  <path d="M3 3.5L13.5 12L8 17.5L3 20.5V3.5Z" fill="#FBBC04" />
                  <path d="M13.5 12L21 7L3 3.5L13.5 12Z" fill="#34A853" />
                  <path d="M13.5 12L21 17L3 20.5L13.5 12Z" fill="#4285F4" />
                </svg>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-white/50">Get it on</p>
                  <p className="text-sm font-semibold text-white leading-none">Google Play</p>
                </div>
              </a>
              {/* App Store */}
              <a href="#" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/20 bg-white/5 transition hover:border-gold">
                <svg width="18" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.78 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                </svg>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-white/50">Download on the</p>
                  <p className="text-sm font-semibold text-white leading-none">App Store</p>
                </div>
              </a>
            </div>
          </div>

          {/* Keep In Touch */}
          <div>
            <h3 className={HL} style={{ color: 'var(--gold)' }}>Keep In Touch</h3>
            <p className="text-sm text-white/60 mb-5">Follow us for property deals, market insights and real estate news.</p>
            <div className="flex items-center gap-3">
              {[
                { Icon: Instagram, href: '#', label: 'Instagram' },
                { Icon: Facebook,  href: '#', label: 'Facebook' },
                { Icon: Youtube,   href: '#', label: 'YouTube' },
                { Icon: Twitter,   href: '#', label: 'X / Twitter' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 rounded-full flex items-center justify-center border border-white/20 text-white/60 transition hover:border-gold hover:text-gold"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Copyright bar ── */}
      <div className="relative z-10 border-t border-white/8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-white/30">© 2026 NxtSft.com Technology Pvt. Ltd. — All rights reserved.</span>
            <div className="flex items-center gap-4">
              <span className="text-xs italic text-white/30">Apna Ghar, Apni Pehchaan. &mdash; India</span>
              <Link
                href="/admin-login"
                className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold tracking-wide text-white/30 transition hover:bg-white/10 hover:text-white/60"
              >
                Staff Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
