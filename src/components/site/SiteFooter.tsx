import { Link } from "@tanstack/react-router";
import { portals } from "@/data/static";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-navy text-white/80">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-gold font-display text-lg font-bold">N</div>
            <span className="font-display text-xl font-bold text-white">NestIQ</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            India's next-generation real estate ecosystem. Find. Own. Live Smarter.
          </p>
          <p className="mt-4 font-mono text-xs text-gold">nestiq.in</p>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-white">Explore</h4>
          <ul className="mt-5 space-y-3 text-sm">
            <li><Link to="/" className="hover:text-accent">Home</Link></li>
            <li><Link to="/properties" className="hover:text-accent">Properties</Link></li>
            <li><Link to="/about" className="hover:text-accent">About NestIQ</Link></li>
            <li><Link to="/contact" className="hover:text-accent">Contact Sales</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-white">Quick Links — Portals</h4>
          <ul className="mt-5 space-y-3 text-sm">
            {portals.map((p) => (
              <li key={p.path}>
                <Link to={p.path} className="group flex items-center justify-between gap-4 hover:text-accent">
                  <span>{p.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-white/40 group-hover:text-accent">{p.role}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-white">Reach Us</h4>
          <ul className="mt-5 space-y-3 text-sm text-white/70">
            <li>Cyber City, Gurugram 122002</li>
            <li>+91 1800-NESTIQ-1</li>
            <li>care@nestiq.in</li>
            <li className="font-mono text-xs text-gold">GSTIN 06AABCN1234X1Z5</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-white/40 md:flex-row">
          <span>© 2025 NestIQ Technology Pvt. Ltd. — Strictly Confidential</span>
          <span>Apna Ghar, Apni Pehchaan.</span>
        </div>
      </div>
    </footer>
  );
}
