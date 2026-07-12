"use client";
import { StatCard, Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { PageHead } from "./PageHead";

function fmtINR(rupees: number): string {
  if (rupees >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(2)} Cr`;
  if (rupees >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(2)} L`;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export function CommissionsTab() {
  const q = trpc.admin.commissionsOverview.useQuery();
  const d = q.data;
  const byRep = d?.byRep ?? [];

  return (
    <>
      <PageHead title="Commissions" subtitle="Team payouts and ledger." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Payable This Cycle"
          value={q.isLoading ? "…" : fmtINR(d?.payable ?? 0)}
          sub="Pending payout"
        />
        <StatCard
          label="On Hold"
          value={q.isLoading ? "…" : fmtINR(d?.onHold ?? 0)}
          sub="Rep KYC pending"
          accent="text-amber-600"
        />
        <StatCard
          label="Paid YTD"
          value={q.isLoading ? "…" : fmtINR(d?.ytdPaid ?? 0)}
          sub="Cleared this year"
        />
      </div>
      <Section title="By Rep">
        {q.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading commissions…</p>
        ) : byRep.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No commissions recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2">Rep</th>
                  <th>Commissions</th>
                  <th>Earned</th>
                  <th>Pending</th>
                  <th>KYC</th>
                </tr>
              </thead>
              <tbody>
                {byRep.map((r) => (
                  <tr key={r.repId}>
                    <td className="font-semibold text-navy">{r.name}</td>
                    <td className="font-mono text-xs">{r.closed}</td>
                    <td className="font-mono text-xs">{fmtINR(r.earned)}</td>
                    <td className="font-mono text-xs text-amber-600">{fmtINR(r.pending)}</td>
                    <td>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          r.kycVerified
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {r.kycVerified ? "Verified" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-navy bg-secondary/40 font-bold">
                  <td className="font-bold text-navy">Total</td>
                  <td className="font-mono text-xs">{byRep.reduce((s, r) => s + r.closed, 0)}</td>
                  <td className="font-mono text-xs font-bold text-navy">
                    {fmtINR(byRep.reduce((s, r) => s + r.earned, 0))}
                  </td>
                  <td className="font-mono text-xs font-bold text-amber-600">
                    {fmtINR(byRep.reduce((s, r) => s + r.pending, 0))}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
