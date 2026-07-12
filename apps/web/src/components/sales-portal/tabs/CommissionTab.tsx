"use client";
import { Wallet } from "lucide-react";
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

  return (
    <>
      <Head t="My Earnings" s="Payouts & history." />

      {/* KYC warning */}
      {data?.kycPending && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <span>⚠️</span>
          <span>Pending KYC — complete your KYC to receive payouts without delay.</span>
        </div>
      )}

      {/* KPI cards — real, from leads.myCommissions */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Pending Payout"
          value={isLoading ? "…" : fmt(data?.pending ?? 0)}
          sub="awaiting clearance"
          accent="text-accent"
        />
        <StatCard label="Earned MTD" value={isLoading ? "…" : fmt(data?.mtd ?? 0)} sub="this month" />
        <StatCard label="YTD Total" value={isLoading ? "…" : fmt(data?.ytd ?? 0)} sub="year to date" />
      </div>

      {/* Recent payouts */}
      <Section title="Recent Payouts">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : !data?.items.length ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center">
            <Wallet size={28} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-navy">No payouts yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Close a lead or convert a subscription to earn your first payout.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.items.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-semibold text-navy">
                    {c.leadId ? `Lead …${c.leadId.slice(-6).toUpperCase()} Closed` : "Manual Entry"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmt(c.dealValue)} deal · {c.periodMonth ?? "—"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-sm font-bold text-accent">{fmt(c.amount)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      c.status === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : c.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Payment details */}
      <Section title="Payment Details">
        <div className="grid gap-4 md:grid-cols-2">
          <Field k="Commission Rate" v="₹500 per qualifying new sale" />
          <Field k="Payout Schedule" v="5th of following month" />
          <Field k="KYC Status" v={data?.kycPending ? "Pending — complete to receive payouts" : "Verified"} />
          <Field k="Payment Method" v="UPI / Bank Transfer (NEFT)" />
        </div>
      </Section>
    </>
  );
}
