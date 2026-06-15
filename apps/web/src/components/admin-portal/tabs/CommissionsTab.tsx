"use client";
import { toast } from "sonner";
import { StatCard, Section } from "@/components/portal/PortalShell";
import { teamMembers } from "@/data/static";
import { PageHead } from "./PageHead";

const maskedBank: Record<string, string> = {
  "U-21": "HDFC ****4821",
  "U-22": "ICICI ****7293",
  "U-23": "SBI ****0065",
  "U-24": "Axis ****3312",
};
const paymentMethod: Record<string, string> = {
  "U-21": "NEFT",
  "U-22": "IMPS",
  "U-23": "NEFT",
  "U-24": "UPI",
};

export function CommissionsTab() {
  const totalEarned = teamMembers.reduce((s, m) => s + m.closedMTD * 0.62, 0);
  const totalPending = teamMembers.reduce((s, m) => s + m.closedMTD * 0.18, 0);
  return (
    <>
      <PageHead title="Commissions" subtitle="Team payouts and ledger." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Payable This Cycle" value="₹6.42 L" sub="Clears 5th" />
        <StatCard label="On Hold" value="₹84,000" sub="Pending KYC" accent="text-amber-600" />
        <StatCard label="YTD Paid" value="₹38.2 L" sub="+₹4.1L vs LY" />
      </div>
      <Section title="By Rep">
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">Rep</th>
                <th>Closed MTD</th>
                <th>Earned</th>
                <th>Pending</th>
                <th>Payment Method</th>
                <th>Bank Account</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((m) => (
                <tr key={m.id}>
                  <td className="font-semibold text-navy">{m.name}</td>
                  <td>{m.closedMTD}</td>
                  <td className="font-mono text-xs">₹{(m.closedMTD * 0.62).toFixed(2)} L</td>
                  <td className="font-mono text-xs text-amber-600">
                    ₹{(m.closedMTD * 0.18).toFixed(2)} L
                  </td>
                  <td className="text-xs">{paymentMethod[m.id] ?? "NEFT"}</td>
                  <td className="font-mono text-xs text-muted-foreground">
                    {maskedBank[m.id] ?? "****0000"}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() =>
                        toast.success(`Released ₹${(m.closedMTD * 0.18).toFixed(2)}L to ${m.name}`)
                      }
                      className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Release
                    </button>
                  </td>
                </tr>
              ))}
              {/* Total summary row */}
              <tr className="border-t-2 border-navy bg-secondary/40 font-bold">
                <td className="font-bold text-navy">Total</td>
                <td>{teamMembers.reduce((s, m) => s + m.closedMTD, 0)}</td>
                <td className="font-mono text-xs font-bold text-navy">
                  ₹{totalEarned.toFixed(2)} L
                </td>
                <td className="font-mono text-xs font-bold text-amber-600">
                  ₹{totalPending.toFixed(2)} L
                </td>
                <td colSpan={3}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
