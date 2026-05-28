import { createFileRoute, Link } from "@tanstack/react-router";
import { PortalShell, StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { properties } from "@/data/static";

export const Route = createFileRoute("/user-portal")({
  head: () => ({ meta: [{ title: "NestIQ Home — My Account" }] }),
  component: User,
});

const nav = [
  { label: "My Home", to: "/user-portal", icon: "◆" },
  { label: "Shortlisted", to: "/user-portal#saved", icon: "♥" },
  { label: "My Listings", to: "/user-portal#mylist", icon: "▤" },
  { label: "Site Visits", to: "/user-portal#visits", icon: "▣" },
  { label: "Saved Searches", to: "/user-portal#search", icon: "⌕" },
  { label: "EMI Calculator", to: "/user-portal#emi", icon: "₹" },
  { label: "Documents (KYC)", to: "/user-portal#kyc", icon: "≡" },
  { label: "Preferences", to: "/user-portal#pref", icon: "⚙" },
];

function User() {
  const saved = properties.slice(0, 3);
  return (
    <PortalShell brand="NestIQ Home" role="End User" accent="red" user={{ name: "Ananya Rao", initials: "AR" }} nav={nav} basePath="/user-portal">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Shortlisted" value="12" sub="3 new this wk" />
        <StatCard label="Visits Scheduled" value="2" sub="Sat 11am next" />
        <StatCard label="My Listings" value="1" sub="Active" />
        <StatCard label="AI Match Avg" value="88%" sub="Top: 94%" accent="text-accent" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Shortlisted Properties" action={<Link to="/properties" className="text-xs font-semibold text-accent">Browse more →</Link>}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {saved.map((p) => (
                <Link key={p.id} to="/properties/$id" params={{ id: p.id }} className="group overflow-hidden rounded-lg border border-border bg-white">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={p.image} alt="" className="h-full w-full object-cover transition group-hover:scale-110" />
                    <span className="absolute right-2 top-2 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">{p.matchScore}%</span>
                  </div>
                  <div className="p-3">
                    <div className="text-xs text-muted-foreground">{p.locality}</div>
                    <div className="text-sm font-semibold text-navy">{p.title.slice(0, 28)}…</div>
                    <div className="mt-1 font-display text-base font-bold text-accent">{p.priceLabel}</div>
                  </div>
                </Link>
              ))}
            </div>
          </Section>

          <Section title="EMI Calculator">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Loan Amount</label>
                <input defaultValue="₹ 2,50,00,000" className="mt-1 w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Interest %</label>
                <input defaultValue="8.6" className="mt-1 w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Tenure (yrs)</label>
                <input defaultValue="20" className="mt-1 w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-5 rounded-lg bg-navy p-5 text-white">
              <div className="text-xs uppercase tracking-widest text-white/60">Estimated EMI</div>
              <div className="mt-1 font-display text-4xl font-bold text-gold">₹ 2,18,420 <span className="text-sm text-white/50">/month</span></div>
            </div>
          </Section>
        </div>

        <div>
          <Section title="My Listing">
            <div className="overflow-hidden rounded-lg border border-border">
              <img src={properties[2].image} alt="" className="h-32 w-full object-cover" />
              <div className="p-3">
                <div className="text-sm font-semibold text-navy">My 1 BHK Koregaon Park</div>
                <div className="text-xs text-muted-foreground">Posted 12 days ago</div>
                <div className="mt-2 flex gap-2 text-[10px] uppercase tracking-wider">
                  <Badge tone="success">Active</Badge>
                  <Badge tone="new">142 views</Badge>
                </div>
              </div>
            </div>
            <button className="mt-3 w-full rounded-md bg-accent py-2 text-sm font-semibold text-accent-foreground">+ Post Another</button>
          </Section>

          <Section title="KYC Status">
            {[["Aadhaar", "Verified", "success"], ["PAN Card", "Verified", "success"], ["Income Proof", "Pending", "warm"]].map(([d, s, t]) => (
              <div key={d} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <span className="text-sm">{d}</span>
                <Badge tone={t as "success" | "warm"}>{s}</Badge>
              </div>
            ))}
          </Section>

          <Section title="Site Visits">
            <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs">
              <div className="font-display text-sm font-bold text-navy">Skyline Residences</div>
              <div className="text-muted-foreground">Sat, 11:00 AM · with Priya Sharma</div>
              <button className="mt-2 rounded-md bg-mid-blue px-3 py-1 text-xs font-semibold text-white">Reschedule</button>
            </div>
          </Section>
        </div>
      </div>
    </PortalShell>
  );
}