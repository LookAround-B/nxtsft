import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell, StatCard, Section, Badge, useActiveHash } from "@/components/portal/PortalShell";
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
  const h = useActiveHash();
  return (
    <PortalShell brand="NestIQ Home" role="End User" accent="red" user={{ name: "Ananya Rao", initials: "AR" }} nav={nav} basePath="/user-portal">
      {render(h)}
    </PortalShell>
  );
}

const Head = ({ t, s }: { t: string; s?: string }) => (<div className="mb-6"><h2 className="font-display text-2xl font-bold text-navy">{t}</h2>{s && <p className="mt-1 text-sm text-muted-foreground">{s}</p>}</div>);

function render(h: string) {
  switch (h) {
    case "saved": return <Saved />;
    case "mylist": return <MyListings />;
    case "visits": return <Visits />;
    case "search": return <Searches />;
    case "emi": return <EMI />;
    case "kyc": return <KYC />;
    case "pref": return <Pref />;
    default: return <Home />;
  }
}

function Home() {
  return (
    <>
      <Head t="Welcome back, Ananya" s="Picking up where you left off." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Shortlisted" value="12" sub="3 new this wk" />
        <StatCard label="Visits Scheduled" value="2" sub="Sat 11am next" />
        <StatCard label="My Listings" value="1" sub="Active" />
        <StatCard label="AI Match Avg" value="88%" sub="Top: 94%" accent="text-accent" />
      </div>
      <Section title="Top picks for you" action={<Link to="/properties" className="text-xs font-semibold text-accent">Browse more →</Link>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.slice(0, 3).map((p) => (
            <Link key={p.id} to="/properties/$id" params={{ id: p.id }} className="group overflow-hidden rounded-lg border border-border bg-white">
              <div className="relative aspect-[4/3] overflow-hidden"><img src={p.image} alt="" className="h-full w-full object-cover transition group-hover:scale-110" /><span className="absolute right-2 top-2 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">{p.matchScore}%</span></div>
              <div className="p-3"><div className="text-xs text-muted-foreground">{p.locality}</div><div className="text-sm font-semibold text-navy">{p.title}</div><div className="mt-1 font-display text-base font-bold text-accent">{p.priceLabel}</div></div>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}

function Saved() {
  const [items, setItems] = useState(properties);
  return (
    <>
      <Head t="Shortlisted" s={`${items.length} homes saved.`} />
      <Section title="Saved properties">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-lg border border-border bg-white">
              <Link to="/properties/$id" params={{ id: p.id }}><img src={p.image} alt="" className="aspect-[4/3] w-full object-cover" /></Link>
              <div className="p-3">
                <div className="text-xs text-muted-foreground">{p.locality}</div>
                <div className="text-sm font-semibold text-navy">{p.title}</div>
                <div className="mt-1 flex items-center justify-between"><span className="font-display text-base font-bold text-accent">{p.priceLabel}</span><button onClick={() => { setItems((arr) => arr.filter((x) => x.id !== p.id)); toast(`Removed ${p.title.split("—")[0].trim()}`); }} className="text-xs font-semibold text-accent">Remove</button></div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function MyListings() {
  return (
    <>
      <Head t="My Listings" s="What you've put on the market." />
      <Section title="Active" action={<button onClick={() => toast.success("New listing draft created")} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">+ Post Another</button>}>
        <div className="overflow-hidden rounded-lg border border-border">
          <img src={properties[2].image} alt="" className="h-40 w-full object-cover" />
          <div className="p-4">
            <div className="text-sm font-semibold text-navy">My 1 BHK Koregaon Park</div>
            <div className="text-xs text-muted-foreground">Posted 12 days ago</div>
            <div className="mt-2 flex gap-2"><Badge tone="success">Active</Badge><Badge tone="new">142 views</Badge></div>
            <div className="mt-3 flex gap-2"><button onClick={() => toast.success("Listing boosted")} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">Boost</button><button onClick={() => toast("Edit mode")} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">Edit</button></div>
          </div>
        </div>
      </Section>
    </>
  );
}

function Visits() {
  return (
    <>
      <Head t="Site Visits" s="Tours you've booked." />
      <Section title="Upcoming">
        <div className="rounded-lg border border-border bg-secondary/40 p-4">
          <div className="font-display text-sm font-bold text-navy">Skyline Residences</div>
          <div className="text-xs text-muted-foreground">Sat, 11:00 AM · with Priya Sharma</div>
          <div className="mt-3 flex gap-2"><button onClick={() => toast.success("Visit rescheduled")} className="rounded-md bg-mid-blue px-3 py-1 text-xs font-semibold text-white">Reschedule</button><button onClick={() => toast.error("Visit cancelled")} className="rounded-md border border-border px-3 py-1 text-xs font-semibold">Cancel</button></div>
        </div>
      </Section>
    </>
  );
}

function Searches() {
  const saved = [
    { name: "3 BHK in Bandra under ₹4 Cr", new: 3 },
    { name: "Villas in Whitefield", new: 1 },
    { name: "Rentals in Pune under ₹40K", new: 7 },
  ];
  return (
    <>
      <Head t="Saved Searches" s="We'll ping you when new homes match." />
      <Section title="Your alerts">
        {saved.map((s) => (
          <div key={s.name} className="flex items-center justify-between border-b border-border py-3 last:border-0">
            <div><div className="font-semibold text-navy">{s.name}</div><div className="text-xs text-muted-foreground">{s.new} new this week</div></div>
            <button onClick={() => toast(`Alert deleted`)} className="text-xs font-semibold text-accent">Remove</button>
          </div>
        ))}
      </Section>
    </>
  );
}

function EMI() {
  const [P, setP] = useState(25000000);
  const [r, setR] = useState(8.6);
  const [n, setN] = useState(20);
  const monthly = ((P * (r / 1200)) * Math.pow(1 + r / 1200, n * 12)) / (Math.pow(1 + r / 1200, n * 12) - 1);
  return (
    <>
      <Head t="EMI Calculator" s="Estimate your monthly payment." />
      <Section title="Inputs">
        <div className="grid gap-4 md:grid-cols-3">
          <div><label className="text-xs uppercase tracking-wider text-muted-foreground">Loan Amount (₹)</label><input type="number" value={P} onChange={(e) => setP(Number(e.target.value))} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm" /></div>
          <div><label className="text-xs uppercase tracking-wider text-muted-foreground">Interest %</label><input type="number" step="0.1" value={r} onChange={(e) => setR(Number(e.target.value))} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm" /></div>
          <div><label className="text-xs uppercase tracking-wider text-muted-foreground">Tenure (yrs)</label><input type="number" value={n} onChange={(e) => setN(Number(e.target.value))} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm" /></div>
        </div>
        <div className="mt-5 rounded-lg bg-navy p-5 text-white">
          <div className="text-xs uppercase tracking-widest text-white/60">Estimated EMI</div>
          <div className="mt-1 font-display text-4xl font-bold text-gold">₹ {Math.round(monthly).toLocaleString("en-IN")} <span className="text-sm text-white/50">/month</span></div>
        </div>
      </Section>
    </>
  );
}

function KYC() {
  return (
    <>
      <Head t="Documents (KYC)" s="Verify once, transact faster." />
      <Section title="Status">
        {[["Aadhaar", "Verified", "success"], ["PAN Card", "Verified", "success"], ["Income Proof", "Pending", "warm"]].map(([d, s, t]) => (
          <div key={d} className="flex items-center justify-between border-b border-border py-3 last:border-0">
            <span className="text-sm">{d}</span>
            <div className="flex items-center gap-2"><Badge tone={t as "success" | "warm"}>{s}</Badge>{s === "Pending" && <button onClick={() => toast.success("Document uploaded")} className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Upload</button>}</div>
          </div>
        ))}
      </Section>
    </>
  );
}

function Pref() {
  const [budget, setBudget] = useState(40000000);
  const [city, setCity] = useState("Mumbai");
  return (
    <>
      <Head t="Preferences" s="Sharpen your AI match." />
      <Section title="My preferences">
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="text-xs uppercase tracking-wider text-muted-foreground">Preferred City</label><select value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"><option>Mumbai</option><option>Bengaluru</option><option>Pune</option><option>Delhi</option><option>Hyderabad</option></select></div>
          <div><label className="text-xs uppercase tracking-wider text-muted-foreground">Max Budget (₹)</label><input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm" /></div>
        </div>
        <button onClick={() => toast.success("Preferences saved")} className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">Save</button>
      </Section>
    </>
  );
}