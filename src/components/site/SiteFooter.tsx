import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-navy pb-20 text-white/80 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:grid-cols-2 md:grid-cols-3">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Nestiqo" className="h-[6.75rem] w-auto object-contain brightness-0 invert" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            India's next-generation real estate ecosystem.<br />Find. Own. Live Smarter.
          </p>
          <p className="mt-5 inline-block rounded-md bg-white/8 px-2.5 py-1 font-mono text-xs text-gold">nestiqo.in</p>
        </div>

        {/* Explore */}
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/50">Explore</h4>
          <ul className="mt-5 space-y-3 text-sm">
            {[
              { href: '/', label: 'Home' },
              { href: '/properties', label: 'Properties' },
              { href: '/about', label: 'About Nestiqo' },
              { href: '/contact', label: 'Contact Sales' },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="text-white/65 transition hover:text-white">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/50">Reach Us</h4>
          <ul className="mt-5 space-y-3 text-sm text-white/55">
            <li>Cyber City, Gurugram 122002</li>
            <li>+91 1800-NESTIQO-1</li>
            <li>care@nestiqo.in</li>
            <li className="pt-1 font-mono text-xs text-gold">GSTIN 06AABCN1234X1Z5</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-white/35 md:flex-row">
          <span>© 2026 Nestiqo Technology Pvt. Ltd. — All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="italic">Apna Ghar, Apni Pehchaan.</span>
            <Link href="/admin-login" className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-semibold tracking-wide text-white/30 transition hover:bg-white/10 hover:text-white/60">
              Staff Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
