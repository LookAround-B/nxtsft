import Link from "next/link";
import { MapPin, ExternalLink, Instagram, Youtube, Facebook, Twitter } from "lucide-react";

const FOOTER_LINKS = {
  discover: [
    { href: "/properties", label: "All Properties" },
    { href: "/properties?type=Apartment", label: "Apartments" },
    { href: "/properties?type=Villa", label: "Villas" },
    { href: "/properties?type=Plot", label: "Plots & Land" },
    { href: "/properties?type=Office", label: "Commercial" },
    { href: "/properties?type=Home%20Interiors", label: "Home Interiors" },
  ],
  company: [
    { href: "/about", label: "About Us" },
    { href: "/pricing", label: "Pricing Plans" },
    { href: "/contact", label: "Contact" },
    { href: "/careers", label: "Careers" },
    { href: "/agents", label: "Find an Agent" },
    { href: "/nri-guide", label: "For NRIs" },
  ],
  quick: [
    { href: "/contact", label: "Help & Support" },
    { href: "/login", label: "Sign In" },
    { href: "/register", label: "Create Account" },
    { href: "/refer", label: "Refer & Earn" },
    { href: "/admin-login", label: "Staff Portal", external: true },
  ],
  cities: [
    { href: "/properties?city=Mumbai", label: "Mumbai" },
    { href: "/properties?city=Bengaluru", label: "Bengaluru" },
    { href: "/properties?city=Delhi%20NCR", label: "Delhi NCR" },
    { href: "/properties?city=Hyderabad", label: "Hyderabad" },
    { href: "/properties?city=Pune", label: "Pune" },
    { href: "/properties?city=Chennai", label: "Chennai" },
  ],
};

const CONTACTS = [
  { role: "General", email: "hello@nxtsft.com" },
  { role: "Support", email: "care@nxtsft.com" },
  { role: "Careers", email: "careers@nxtsft.com" },
  { role: "Partnerships", email: "partners@nxtsft.com" },
];

const SOCIALS = [
  { Icon: Instagram, href: "#", label: "Instagram" },
  { Icon: Facebook, href: "#", label: "Facebook" },
  { Icon: Youtube, href: "#", label: "YouTube" },
  { Icon: Twitter, href: "#", label: "X / Twitter" },
];

const HL = "text-[11px] font-bold uppercase tracking-[2px] mb-4 text-[var(--gold)]";
const LINK = "text-sm text-white/55 transition hover:text-white";

function LinkColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; external?: boolean }[];
}) {
  return (
    <div>
      <h3 className={HL}>{title}</h3>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className={`inline-flex items-center gap-1 ${LINK}`}>
              {l.label}
              {l.external && <ExternalLink className="h-3 w-3 opacity-50" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-navy">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      {/* ── Main: brand + link columns ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-14 pb-10 sm:px-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4">
            <img
              src="/logo.png"
              alt="NxtSft.com"
              className="h-10 w-auto object-contain brightness-0 invert"
            />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
              India&apos;s next-generation real estate ecosystem — RERA-verified listings, AI-powered
              matching, zero commission and an integrated CRM+ERP suite.
            </p>
            <div className="mt-4 flex items-start gap-1.5 text-sm text-white/45">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gold)]" />
              Sterling Heights, Kompally, Hyderabad 500100, India
            </div>
            <div className="mt-5 flex items-center gap-2.5">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/55 transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="md:col-span-2">
            <LinkColumn title="Discover" links={FOOTER_LINKS.discover} />
          </div>
          <div className="md:col-span-2">
            <LinkColumn title="Company" links={FOOTER_LINKS.company} />
          </div>
          <div className="md:col-span-2">
            <LinkColumn title="Quick Links" links={FOOTER_LINKS.quick} />
          </div>
          <div className="md:col-span-2">
            <LinkColumn title="Top Cities" links={FOOTER_LINKS.cities} />
          </div>
        </div>
      </div>

      {/* ── Contact strip ── */}
      <div className="relative z-10 border-t border-white/8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-7 sm:px-6 md:grid-cols-4">
          {CONTACTS.map(({ role, email }) => (
            <div key={email}>
              <p className="mb-0.5 text-[11px] uppercase tracking-wide text-white/35">{role}</p>
              <a href={`mailto:${email}`} className="text-sm text-white/80 transition hover:text-[var(--gold)]">
                {email}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* ── Copyright bar ── */}
      <div className="relative z-10 border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-5 sm:flex-row sm:justify-between sm:px-6">
          <span className="text-xs text-white/35">
            © 2026 NxtSFT PropTech innovations — All rights reserved.
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href="/terms" className="text-xs text-white/35 transition hover:text-white/70">
              Terms
            </Link>
            <Link href="/privacy" className="text-xs text-white/35 transition hover:text-white/70">
              Privacy
            </Link>
            <Link href="/refund" className="text-xs text-white/35 transition hover:text-white/70">
              Refund Policy
            </Link>
            <Link href="/cookie-policy" className="text-xs text-white/35 transition hover:text-white/70">
              Cookies
            </Link>
            <Link href="/fraud-advisory" className="text-xs text-white/35 transition hover:text-white/70">
              Fraud Advisory
            </Link>
            <Link
              href="/admin-login"
              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold tracking-wide text-white/40 transition hover:bg-white/10 hover:text-white/70"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div className="relative z-10 border-t border-white/8">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <p className="text-[11px] leading-relaxed text-white/30">
            <strong className="text-white/45">NxtSft.com is a technology platform (ITeS) only — NOT a real estate broker, agent, or dealer under RERA.</strong>{" "}
            We provide SaaS software, digital advertising, and listing services. We do not facilitate property
            transactions, collect booking/token amounts, or hold any funds related to property sale or rent.
            All transactions are solely between Buyer and Seller/Developer/Agent.{" "}
            Property details are sourced from advertisers and public records (RERA websites, project brochures).
            Users must independently verify all information before making any property decision.
            Payments on this platform are only for SaaS, listing fees, and lead credit packs — see{" "}
            <Link href="/refund" className="underline hover:text-white/60">Refund Policy</Link> and{" "}
            <Link href="/terms" className="underline hover:text-white/60">Terms of Use</Link>.
          </p>
        </div>
      </div>
    </footer>
  );
}
