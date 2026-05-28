import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PortalShell, StatCard, Section, Badge, useActiveHash } from "@/components/portal/PortalShell";
import { leads, activities, properties } from "@/data/static";

export const Route = createFileRoute("/sales-portal")({
  head: () => ({ meta: [{ title: "NestIQ Field — Sales Rep" }] }),
  component: Sales,
});

const nav = [
  { label: "My Leads", to: "/sales-portal", icon: "✦" },
  { label: "Lead Details", to: "/sales-portal#detail", icon: "▤" },
  { label: "Activity Log", to: "/sales-portal#log", icon: "≡" },
  { label: "Click-to-Call", to: "/sales-portal#call", icon: "☏" },
  { label: "Site Visits", to: "/sales-portal#visits", icon: "▣" },
  { label: "My Commission", to: "/sales-portal#commission", icon: "₹" },
  { label: "Listings", to: "/sales-portal#listings", icon: "▦" },
];

function Sales() {
  const h = useActiveHash();
  return (
    <PortalShell brand="NestIQ Field" role="Sales Rep" accent="amber" user={{ name: "Priya Sharma", initials: "PS" }} nav={nav} basePath="/sales-portal">
      {render(h)}
    </PortalShell>
  );
}

const Head = ({ t, s }: { t: string; s?: string }) => (<div className="mb-6"><h2 className="font-display text-2xl font-bold text-navy">{t}</h2>{s && <p className="mt-1 text-sm text-muted-foreground">{s}</p>}</div>);

function render(h: string) {
  switch (h) {
    case "detail": return <Detail />;
    case "log": return <Log />;
    case "call": return <Call />;
    case "visits": return <Visits />;
    case "commission": return <Commission />;
    case "listings": return <Listings />;
    default: return <MyLeads />;
  }
}

function MyLeads() {
  const mine = leads.slice(0, 4);
  return (
    <>
      <Head t="My Leads" s="Your active queue — call, WhatsApp or annotate." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="My Open Leads" value="14" sub="+2 today" />
        <StatCard label="Closed MTD" value="4" sub="+1 this wk" />
        <StatCard label="Visits This Wk" value="6" sub="2 tomorrow" />
        <StatCard label="Commission MTD" value="₹2.18 L" sub="+₹48K pending" accent="text-accent" />
      </div>
      <Section title="Assigned to you">
        {mine.map((l) => (
          <div key={l.id} className="border-b border-border py-4 last:border-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2"><span className="font-semibold text-navy">{l.name}</span><Badge tone={l.status.toLowerCase() as "hot" | "warm" | "cold" | "new"}>{l.status}</Badge></div>
                <div className="mt-1 text-xs text-muted-foreground">{l.interest} · {l.city} · ₹{(l.value / 100000).toFixed(1)}L</div>
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{l.id} · {l.lastActivity}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toast.success(`Calling ${l.name}`)} className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">☏ Call</button>
                <button onClick={() => toast.success(`WhatsApp opened for ${l.name}`)} className="rounded-md bg-mid-blue px-3 py-1.5 text-xs font-semibold text-white">WhatsApp</button>
                <button onClick={() => toast("Note saved")} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">+ Note</button>
              </div>
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}

function Detail() {
  const l = leads[0];
  return (
    <>
      <Head t={`Lead Detail — ${l.name}`} s={`${l.id} · ${l.interest}`} />
      <Section title="Profile">
        <div className="grid gap-4 md:grid-cols-2">
          <Field k="Name" v={l.name} /><Field k="Phone" v={l.phone} /><Field k="City" v={l.city} /><Field k="Source" v={l.source} /><Field k="Budget" v={`₹${(l.value / 100000).toFixed(1)} L`} /><Field k="Last Activity" v={l.lastActivity} />
        </div>
      </Section>
      <Section title="Timeline">
        {activities.slice(0, 4).map((a, i) => (
          <div key={i} className="border-b border-border py-2 text-sm last:border-0"><div className="font-semibold text-navy">{a.action}</div><div className="text-xs text-muted-foreground">{a.outcome} · {a.ts}</div></div>
        ))}
      </Section>
    </>
  );
}
const Field = ({ k, v }: { k: string; v: string }) => (<div className="rounded-lg border border-border p-3"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div><div className="mt-1 font-semibold text-navy">{v}</div></div>);

function Log() {
  return (<><Head t="Activity Log" s="Everything you've done today." /><Section title="Log">{[...activities, ...activities].map((a, i) => (<div key={i} className="border-b border-border py-3 last:border-0"><div className="flex justify-between text-xs"><span className="font-semibold text-navy">{a.action}</span><span className="font-mono text-muted-foreground">{a.ts}</span></div><div className="text-xs text-muted-foreground">{a.outcome}</div></div>))}</Section></>);
}

function Call() {
  return (
    <>
      <Head t="Click-to-Call" s="One-tap dial via our PSTN gateway." />
      <Section title="Quick dial">
        <div className="grid gap-3 sm:grid-cols-2">
          {leads.slice(0, 5).map((l) => (
            <button key={l.id} onClick={() => toast.success(`Dialing ${l.phone}…`)} className="flex items-center justify-between rounded-lg border border-border p-4 text-left hover:border-accent">
              <div><div className="font-semibold text-navy">{l.name}</div><div className="font-mono text-xs text-muted-foreground">{l.phone}</div></div>
              <span className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">☏ Dial</span>
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}

function Visits() {
  const slots = [
    { day: "Today", time: "4:30 PM", lead: "Rohan Mehta", prop: "Skyline Residences", addr: "Bandra West, Mumbai" },
    { day: "Tomorrow", time: "11:00 AM", lead: "Aisha Khan", prop: "Green Acres Villa", addr: "Whitefield, Bengaluru" },
    { day: "Sat", time: "2:00 PM", lead: "Suresh Iyer", prop: "Heritage Bungalow", addr: "Greater Kailash, Delhi" },
  ];
  return (
    <><Head t="Site Visits" s="Your scheduled tours." /><Section title="Upcoming">{slots.map((v, i) => (<div key={i} className="flex items-center justify-between border-b border-border py-3 last:border-0"><div><div className="font-semibold text-navy">{v.prop} — {v.lead}</div><div className="text-xs text-muted-foreground">{v.addr}</div></div><div className="flex items-center gap-2"><div className="text-right"><div className="font-display text-sm font-bold text-accent">{v.day}</div><div className="text-xs text-muted-foreground">{v.time}</div></div><button onClick={() => toast.success(`Reminder sent to ${v.lead}`)} className="rounded-md border border-border px-3 py-1 text-xs font-semibold">Remind</button></div></div>))}</Section></>
  );
}

function Commission() {
  const rows = [["L-1019 Closed", "₹62L deal", "₹1.24L"], ["L-1011 Closed", "₹38L deal", "₹76K"], ["L-1007 Closed", "₹45L deal", "₹90K"]];
  return (
    <>
      <Head t="My Commission" s="Payouts & history." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending Payout" value="₹1.24 L" sub="Clears 5th" accent="text-accent" />
        <StatCard label="Earned MTD" value="₹2.18 L" sub="+₹48K wk" />
        <StatCard label="YTD" value="₹14.4 L" sub="+₹3.1L vs LY" />
      </div>
      <Section title="Recent payouts">
        {rows.map(([t, d, c]) => (<div key={t} className="flex items-center justify-between border-b border-border py-3 last:border-0"><div><div className="font-semibold text-navy">{t}</div><div className="text-xs text-muted-foreground">{d}</div></div><span className="font-mono text-sm font-bold text-accent">{c}</span></div>))}
      </Section>
    </>
  );
}

function Listings() {
  return (
    <><Head t="Assigned Listings" s="Properties tagged to you." /><Section title="Inventory"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{properties.map((p) => (<div key={p.id} className="overflow-hidden rounded-lg border border-border"><img src={p.image} alt="" className="h-32 w-full object-cover" /><div className="p-3"><div className="text-xs text-muted-foreground">{p.locality}</div><div className="font-semibold text-navy">{p.title}</div><div className="mt-1 font-display text-base font-bold text-accent">{p.priceLabel}</div></div></div>))}</div></Section></>
  );
}