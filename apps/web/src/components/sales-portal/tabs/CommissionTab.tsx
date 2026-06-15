"use client";
import { StatCard, Section } from "@/components/portal/PortalShell";
import { Head, Field } from "./shared";

export function CommissionTab() {
  const rows: [string, string, string][] = [
    ["L-1019 Closed", "₹62L deal", "₹1.24L"],
    ["L-1011 Closed", "₹38L deal", "₹76K"],
    ["L-1007 Closed", "₹45L deal", "₹90K"],
  ];

  const ytdEarned = 14.4;
  const ytdTarget = 20;
  const progressPct = Math.min(100, Math.round((ytdEarned / ytdTarget) * 100));
  const pendingKYC = true;

  return (
    <>
      <Head t="My Commission" s="Payouts & history." />

      {pendingKYC && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <span>⚠️</span>
          <span>Pending KYC — complete your KYC to receive payouts without delay.</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending Payout" value="₹1.24 L" sub="Clears 5th" accent="text-accent" />
        <StatCard label="Earned MTD" value="₹2.18 L" sub="+₹48K wk" />
        <StatCard label="YTD" value="₹14.4 L" sub="+₹3.1L vs LY" />
      </div>

      {/* YTD progress bar */}
      <Section title="YTD Target Achievement">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>₹{ytdEarned}L earned</span>
            <span>
              {progressPct}% of ₹{ytdTarget}L target
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            ₹{(ytdTarget - ytdEarned).toFixed(1)}L remaining to hit annual target
          </div>
        </div>
      </Section>

      <Section title="Recent payouts">
        {rows.map(([t, d, c]) => (
          <div
            key={t}
            className="flex items-center justify-between border-b border-border py-3 last:border-0"
          >
            <div>
              <div className="font-semibold text-navy">{t}</div>
              <div className="text-xs text-muted-foreground">{d}</div>
            </div>
            <span className="font-mono text-sm font-bold text-accent">{c}</span>
          </div>
        ))}
      </Section>

      <Section title="Payment Details">
        <div className="grid gap-4 md:grid-cols-2">
          <Field k="Payment Method" v="NEFT to HDFC ****4521" />
          <Field k="Expected Payout Date" v="5th July 2026" />
        </div>
      </Section>
    </>
  );
}
