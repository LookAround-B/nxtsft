import Link from 'next/link';
import { portals } from '@/data/static';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-navy pb-20 text-white/80 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:grid-cols-2 md:grid-cols-4">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white font-display text-lg font-black">N</div>
            <span className="font-display text-xl font-black text-white">NestIt</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            India's next-generation real estate ecosystem.<br />Find. Own. Live Smarter.
          </p>
          <p className="mt-5 inline-block rounded-md bg-white/8 px-2.5 py-1 font-mono text-xs text-gold">nestit.in</p>
        </div>

        {/* Explore */}
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/50">Explore</h4>
          <ul className="mt-5 space-y-3 text-sm">
            {[
              { href: '/', label: 'Home' },
              { href: '/properties', label: 'Properties' },
              { href: '/about', label: 'About NestIt' },
              { href: '/contact', label: 'Contact Sales' },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="text-white/65 transition hover:text-white">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Portals */}
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/50">Portals</h4>
          <ul className="mt-5 space-y-3 text-sm">
            {portals.map((p) => (
              <li key={p.path}>
                <Link
                  href={p.path}
                  className="group flex items-center justify-between gap-4 text-white/65 transition hover:text-white"
                >
                  <span>{p.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-white/35 group-hover:text-white/60">{p.role}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/50">Reach Us</h4>
          <ul className="mt-5 space-y-3 text-sm text-white/55">
            <li>Cyber City, Gurugram 122002</li>
            <li>+91 1800-NESTIT-1</li>
            <li>care@nestit.in</li>
            <li className="pt-1 font-mono text-xs text-gold">GSTIN 06AABCN1234X1Z5</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-white/35 md:flex-row">
          <span>© 2025 NestIt Technology Pvt. Ltd. — All rights reserved.</span>
          <span className="italic">Apna Ghar, Apni Pehchaan.</span>
        </div>
      </div>
    </footer>
  );
}
