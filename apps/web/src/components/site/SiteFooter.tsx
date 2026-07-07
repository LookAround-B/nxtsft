"use client";
import Link from "next/link";
import { MapPin, ExternalLink, Instagram, Youtube, Facebook, Twitter, Linkedin } from "lucide-react";
import { LinkPreview } from "@/components/ui/LinkPreview";
import { trpc } from "@/lib/trpc";
import { DailyVisitorsCount } from "./DailyVisitorsCount";
import { MapLinkPreview } from "@/components/ui/MapLinkPreview";
import { OFFICE_COORDS, OFFICE_MAPS_URL } from "@/lib/map";

const FOOTER_LINKS = {
  discover: [
    { href: "/properties", label: "All Properties" },
    { href: "/properties?type=Apartment", label: "Apartments" },
    { href: "/properties?type=Villa", label: "Villas" },
    { href: "/properties?type=Plot", label: "Plots & Land" },
    { href: "/properties?type=Office", label: "Commercial" },
    { href: "/pg", label: "PG / Co-living" },
    { href: "/interiors", label: "Interior Designers" },
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
    { href: "/unsubscribe", label: "Unsubscribe" },
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
  // Stat values here are fallbacks only — live counts come from
  // trpc.social.stats (scraped from each profile's public meta tags).
  {
    key: "instagram",
    Icon: Instagram,
    href: "https://www.instagram.com/nxtsft",
    label: "Instagram",
    handle: "@nxtsft",
    tile: "bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600",
    stats: [
      { label: "Posts", value: "149" },
      { label: "Followers", value: "79" },
    ],
  },
  {
    key: "facebook",
    Icon: Facebook,
    href: "https://www.facebook.com/share/1FCiksdpRP/",
    label: "Facebook",
    handle: "NxtSft",
    tile: "bg-[#1877F2]",
    stats: [{ label: "Likes", value: "705" }],
  },
  {
    key: "linkedin",
    Icon: Linkedin,
    href: "https://www.linkedin.com/company/truenxtsft/",
    label: "LinkedIn",
    handle: "truenxtsft",
    tile: "bg-[#0A66C2]",
    stats: [{ label: "Followers", value: "43" }],
  },
  { Icon: Youtube, href: "#", label: "YouTube" },
  { Icon: Twitter, href: "#", label: "X / Twitter" },
] as const;

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
  // Live follower/post counts; falls back to the hardcoded values while
  // loading or when a platform blocks the server-side profile fetch.
  const statsQ = trpc.social.stats.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

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
            <div className="mt-4">
              <MapLinkPreview
                href={OFFICE_MAPS_URL}
                lat={OFFICE_COORDS.lat}
                lng={OFFICE_COORDS.lng}
                className="flex items-start gap-1.5 text-sm text-white/45 underline-offset-4 transition hover:text-white/80 hover:underline"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gold)]" />
                Awfis, Kirloskar Business Park, Hebbal, Bengaluru, Karnataka 560024, India
              </MapLinkPreview>
            </div>
            <div className="mt-5 flex items-center gap-2.5">
              {SOCIALS.map((s) => {
                const iconBtn =
                  "flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/55 transition hover:border-[var(--gold)] hover:text-[var(--gold)]";
                if (!("handle" in s)) {
                  return (
                    <a key={s.label} href={s.href} aria-label={s.label} className={iconBtn}>
                      <s.Icon className="h-4 w-4" />
                    </a>
                  );
                }
                return (
                  <LinkPreview
                    key={s.label}
                    href={s.href}
                    ariaLabel={s.label}
                    align="start"
                    className={iconBtn}
                    preview={
                      <span className="block w-56">
                        {/* banner + overlapping avatar, mini profile-card style */}
                        <span className={`block h-12 rounded-lg ${s.tile}`} />
                        <span className="-mt-5 flex justify-center">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-white shadow ${s.tile}`}
                          >
                            <s.Icon className="h-5 w-5" />
                          </span>
                        </span>
                        <span className="mt-1 block text-center">
                          <span className="block text-sm font-bold text-navy">{s.label}</span>
                          <span className="block text-xs text-muted-foreground">{s.handle}</span>
                        </span>
                        <span className="mt-2 mb-1 flex justify-center gap-6 border-t border-border pt-2 pb-1">
                          {s.stats.map((st) => {
                            const live = statsQ.data?.[s.key];
                            const value =
                              (st.label === "Posts" ? live?.posts : live?.followers) ?? st.value;
                            return { ...st, value };
                          }).map((st) => (
                            <span key={st.label} className="block text-center">
                              <span className="block text-sm font-bold text-navy">{st.value}</span>
                              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                                {st.label}
                              </span>
                            </span>
                          ))}
                        </span>
                      </span>
                    }
                  >
                    <s.Icon className="h-4 w-4" />
                  </LinkPreview>
                );
              })}
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

        {/* Daily visitors ticker (GOL-292) */}
        <div className="mt-10 flex justify-center">
          <DailyVisitorsCount />
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
            © 2026 NXTSFT PROPTECH INNOVATIONS 
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
