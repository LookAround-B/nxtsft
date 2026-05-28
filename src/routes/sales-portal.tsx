import { createFileRoute } from "@tanstack/react-router";
import { PortalShell, StatCard, Section, Badge } from "@/components/portal/PortalShell";
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
  { label: "My Commission", to: "/sales-portal#comm", icon: "₹" },
  { label: "Listings", to: "/sales-portal#listings", icon: "▦" },
];

function Sales() {
  const mine = leads.slice(0, 4);
  return (
    <PortalShell brand="NestIQ Field" role="Sales Rep" accent="amber" user={{ name: "Priya Sharma", initials: "PS" }} nav={nav} basePath="/sales-portal">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="My Open Leads" value="14" sub="+2 today" />
        <StatCard label="Closed MTD" value="4" sub="+1 this wk" />
        <StatCard label="Visits This Wk" value="6" sub="2 tomorrow" />
        <StatCard label="Commission MTD" value="₹2.18 L" sub="+₹48K pending" accent="text-accent" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="My Assigned Leads" action={<button className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">Filter</button>}>
            {mine.map((l) => (
              <div key={l.id} className="border-b border-border py-4 last:border-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-navy">{l.name}</span>
                      <Badge tone={l.status.toLowerCase() as "hot" | "warm" | "cold" | "new"}>{l.status}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{l.interest} · {l.city} · ₹{(l.value / 100000).toFixed(1)}L</div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{l.id} · last activity {l.lastActivity}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">☏ Call</button>
                    <button className="rounded-md bg-mid-blue px-3 py-1.5 text-xs font-semibold text-white">WhatsApp</button>
                    <button className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">+ Note</button>
                  </div>
                </div>
              </div>
            ))}
          </Section>

          <Section title="Upcoming Site Visits">
            {[
              { day: "Today", time: "4:30 PM", lead: "Rohan Mehta", prop: "Skyline Residences", addr: "Bandra West, Mumbai" },
              { day: "Tomorrow", time: "11:00 AM", lead: "Aisha Khan", prop: "Green Acres Villa", addr: "Whitefield, Bengaluru" },
              { day: "Sat", time: "2:00 PM", lead: "Suresh Iyer", prop: "Heritage Bungalow", addr: "Greater Kailash, Delhi" },
            ].map((v, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                <div>
                  <div className="font-semibold text-navy">{v.prop} — {v.lead}</div>
                  <div className="text-xs text-muted-foreground">{v.addr}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-sm font-bold text-accent">{v.day}</div>
                  <div className="text-xs text-muted-foreground">{v.time}</div>
                </div>
              </div>
            ))}
          </Section>
        </div>

        <div>
          <Section title="My Commission Tracker">
            <div className="rounded-lg bg-navy p-4 text-white">
              <div className="text-xs uppercase tracking-widest text-white/60">Pending Payout</div>
              <div className="mt-1 font-display text-3xl font-bold text-gold">₹1.24 L</div>
              <div className="mt-1 text-xs text-white/60">Clears 5th next month</div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {[["L-1019 Closed", "₹62L deal", "₹1.24L"], ["L-1011 Closed", "₹38L deal", "₹76K"], ["L-1007 Closed", "₹45L deal", "₹90K"]].map(([t, d, c]) => (
                <div key={t} className="flex items-center justify-between border-b border-border py-2">
                  <div>
                    <div className="text-sm font-semibold text-navy">{t}</div>
                    <div className="text-xs text-muted-foreground">{d}</div>
                  </div>
                  <span className="font-mono text-sm font-bold text-accent">{c}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="My Activity Log">
            {activities.slice(0, 4).map((a, i) => (
              <div key={i} className="border-b border-border py-2 text-xs last:border-0">
                <div className="flex justify-between"><span className="font-semibold text-navy">{a.action}</span><span className="font-mono text-muted-foreground">{a.ts}</span></div>
                <div className="text-muted-foreground">{a.outcome}</div>
              </div>
            ))}
          </Section>

          <Section title="Assigned Listings">
            {properties.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-border py-2 last:border-0">
                <img src={p.image} alt="" className="h-10 w-14 rounded object-cover" />
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-navy">{p.title}</div>
                  <div className="text-muted-foreground">{p.priceLabel}</div>
                </div>
              </div>
            ))}
          </Section>
        </div>
      </div>
    </PortalShell>
  );
}