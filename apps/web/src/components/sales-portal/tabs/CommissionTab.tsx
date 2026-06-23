"use client";
import { StatCard, Section } from "@/components/portal/PortalShell";
import { Head, Field } from "./shared";
import { trpc } from "@/lib/trpc";

function fmt(rupees: number): string {
  if (rupees >= 10_00_000) return `₹${(rupees / 10_00_000).toFixed(2)} L`;
  if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(0)}K`;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export function CommissionTab() {
  const { data, isLoading } = trpc.leads.myCommissions.useQuery();

  const ytdTarget = 20_00_000; // ₹20L target
  const ytdEarned = data?.ytd ?? 0;
  const progressPct = Math.min(100, Math.round((ytdEarned / ytdTarget) * 100));

  return (
    <>
      <Head t="My Commission" s="Payouts & history." />

      {data?.kycPending && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <span>⚠️</span>
          <span>Pending KYC — complete your KYC to receive payouts without delay.</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Pending Payout"
          value={isLoading ? "…" : fmt(data?.pending ?? 0)}
          sub="awaiting clearance"
          accent="text-accent"
        />
        <StatCard
          label="Earned MTD"
          value={isLoading ? "…" : fmt(data?.mtd ?? 0)}
          sub="this month"
        />
        <StatCard
          label="YTD"
          value={isLoading ? "…" : fmt(data?.ytd ?? 0)}
          sub="year to date"
        />
      </div>

      <Section title="YTD Target Achievement">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{fmt(ytdEarned)} earned</span>
            <span>{progressPct}% of {fmt(ytdTarget)} target</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {fmt(ytdTarget - ytdEarned)} remaining to hit annual target
          </div>
        </div>
      </Section>

      <Section title="Recent payouts">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : !data?.items.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No commissions yet. Close a lead as Converted to earn commission.
          </p>
        ) : (
          data.items.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border-b border-border py-3 last:border-0"
            >
              <div>
                <div className="font-semibold text-navy">
                  {c.leadId ? `Lead …${c.leadId.slice(-6).toUpperCase()} Closed` : "Manual Entry"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {fmt(c.dealValue)} deal · {c.periodMonth ?? "—"} · {c.status}
                </div>
              </div>
              <span className="font-mono text-sm font-bold text-accent">{fmt(c.amount)}</span>
            </div>
          ))
        )}
      </Section>

      <Section title="Payment Details">
        <div className="grid gap-4 md:grid-cols-2">
          <Field k="Commission Rate" v="2% of closed deal value" />
          <Field k="Payout Schedule" v="5th of following month" />
          <Field k="KYC Status" v={data?.kycPending ? "Pending — complete to receive payouts" : "Verified"} />
        </div>
      </Section>
    </>
  );
}
