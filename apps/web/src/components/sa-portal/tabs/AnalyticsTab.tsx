"use client";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { TabHeader } from "./shared";

export function AnalyticsTab() {
  const cities: Array<[string, number]> = [
    ["Mumbai", 38],
    ["Bengaluru", 27],
    ["Pune", 14],
    ["Delhi", 11],
    ["Hyderabad", 7],
    ["Chennai", 3],
  ];
  const channels: Array<[string, number]> = [
    ["Organic", 62],
    ["Direct", 48],
    ["Paid", 36],
    ["Referral", 22],
    ["Social", 18],
    ["Email", 12],
  ];
  const userGrowth = [820, 910, 1050, 980, 1120, 1280, 1400, 1350, 1500, 1680, 1820, 2040];
  const funnel: Array<[string, number, number]> = [
    ["Visits", 58420, 100],
    ["Leads", 4120, 7],
    ["Site Visits", 842, 1.4],
    ["Closed", 187, 0.3],
  ];

  return (
    <>
      <TabHeader
        title="Global Analytics"
        subtitle="Cross-portal traffic, conversion and geography."
        action={<Badge tone="success">Realtime</Badge>}
      />
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Sessions / day" value="58,420" sub="↑ +11% wk" />
        <StatCard label="Avg. Session" value="4m 12s" sub="↑ +0:18" />
        <StatCard label="Bounce" value="32%" sub="↓ −2.1 pts" />
        <StatCard label="Lead → Visit" value="14.8%" sub="↑ +0.6 pts" />
        <StatCard label="New Users / wk" value="42" sub="↑ +8%" />
        <StatCard label="Avg Rev / Listing" value="₹1.4L" sub="↑ +₹12K" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Revenue by City">
          {cities.map(([c, p]) => (
            <div key={c} className="border-b border-border py-3 last:border-0">
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-semibold text-navy">{c}</span>
                <span className="font-mono text-xs">{p}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-mid-blue transition-all"
                  style={{ width: `${p}%` }}
                />
              </div>
            </div>
          ))}
        </Section>
        <Section title="Channel Mix">
          <div className="flex h-48 items-end gap-2">
            {channels.map(([l, v]) => (
              <div key={l} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-sm bg-gold"
                  style={{ height: `${Math.max(8, v * 3)}px` }}
                />
                <span className="text-[10px] text-muted-foreground">{l}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="User Growth — Last 12 months">
          <div className="flex h-48 items-end gap-1.5">
            {userGrowth.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-accent/80"
                  style={{ height: `${(v / 2040) * 160}px` }}
                />
                <span className="text-[9px] text-muted-foreground">
                  {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-right">
            Peak: 2,040 new users in Dec
          </p>
        </Section>

        <Section title="Conversion Funnel">
          {funnel.map(([label, count, pct]) => (
            <div key={label} className="border-b border-border py-3 last:border-0">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-navy">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {count.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{pct}%</span>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-secondary">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-accent to-gold transition-all"
                  style={{ width: `${Math.min(100, pct === 100 ? 100 : pct * 10)}%` }}
                />
              </div>
            </div>
          ))}
          <p className="mt-3 text-xs text-muted-foreground">
            Funnel: Visits → Leads → Site Visits → Closed
          </p>
        </Section>
      </div>
    </>
  );
}
