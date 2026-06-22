"use client";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { downloadCSV } from "@/lib/download-csv";
import { TabHeader } from "./shared";
import { trpc } from "@/lib/trpc";

function fmtRupees(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function BillingTab() {
  const statsQ = trpc.superAdmin.billingStats.useQuery();
  const stats = statsQ.data;
  const payments = stats?.recentPayments ?? [];

  return (
    <>
      <TabHeader
        title="Billing & Revenue"
        subtitle="Subscriptions, invoices and payouts."
        action={
          <button
            onClick={() => toast.success("Statement PDF downloading…")}
            className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep transition hover:opacity-90"
          >
            Download Statement
          </button>
        }
      />
      {statsQ.isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading billing data…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="MRR" value={stats ? fmtRupees(stats.mrr) : "—"} sub="active subscriptions" />
            <StatCard label="ARR Projection" value={stats ? fmtRupees(stats.arr) : "—"} sub="MRR × 12" />
            <StatCard label="Outstanding" value={stats ? fmtRupees(stats.outstanding) : "—"} sub={`${stats?.outstandingCount ?? 0} failed/expired`} accent="text-amber-600" />
            <StatCard label="Payments" value={String(payments.length)} sub="recent transactions" />
          </div>

          <Section
            title="Recent Payments"
            action={
              <button
                onClick={() =>
                  downloadCSV(
                    "payments.csv",
                    ["ID", "Customer", "Amount", "Status", "Method", "Date"],
                    payments.map((p) => [
                      p.id.slice(-8),
                      p.userName,
                      fmtRupees(p.amount),
                      p.status,
                      p.method,
                      new Date(p.createdAt).toLocaleDateString("en-IN"),
                    ]),
                  )
                }
                className="text-xs font-semibold text-accent hover:underline"
              >
                Export CSV →
              </button>
            }
          >
            {payments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th className="py-2">ID</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Method</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="font-mono text-xs">{p.id.slice(-8)}</td>
                        <td className="font-semibold text-navy">{p.userName}</td>
                        <td className="font-mono text-sm">{fmtRupees(p.amount)}</td>
                        <td>
                          <Badge tone={p.status === "Success" ? "success" : p.status === "Failed" ? "hot" : "warm"}>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="text-xs">{p.method}</td>
                        <td className="text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </>
  );
}
