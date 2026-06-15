"use client";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { downloadCSV } from "@/lib/download-csv";
import { TabHeader } from "./shared";

export function BillingTab() {
  const invoices: Array<[string, string, string, string, string]> = [
    ["INV-2041", "Lodha Group", "₹4,20,000", "Paid", "May 24"],
    ["INV-2040", "Prestige", "₹2,80,000", "Paid", "May 22"],
    ["INV-2039", "Sobha", "₹1,75,000", "Overdue", "May 14"],
    ["INV-2038", "Kolte Patil", "₹95,000", "Paid", "May 10"],
    ["INV-2037", "DLF", "₹6,40,000", "Pending", "May 09"],
  ];
  const revTrend = [42, 58, 51, 67, 74, 88, 82, 96, 104, 112, 118, 124];

  return (
    <>
      <TabHeader
        title="Billing & Revenue"
        subtitle="Subscriptions, invoices and payouts."
        action={
          <button
            onClick={() => toast.success("Statement PDF downloading…")}
            className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition"
          >
            Download Statement
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="MRR" value="₹12.4 Cr" sub="↑ +8.4% wk" />
        <StatCard label="ARR Projection" value="₹148.8 Cr" sub="↑ +12% YoY" />
        <StatCard label="Outstanding" value="₹8.15 L" sub="3 overdue" accent="text-amber-600" />
        <StatCard label="Payouts MTD" value="₹62.4 L" />
      </div>

      <Section title="Revenue Trend — Last 12 months (₹ Cr)">
        <div className="flex h-32 items-end gap-1.5">
          {revTrend.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-sm bg-gold"
                style={{ height: `${(v / 124) * 100}px` }}
              />
              <span className="text-[9px] text-muted-foreground">
                {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Recent Invoices"
        action={
          <button
            onClick={() =>
              downloadCSV(
                "invoices.csv",
                ["Invoice", "Customer", "Amount", "Status", "Date"],
                invoices.map((r) => r),
              )
            }
            className="text-xs font-semibold text-accent hover:underline"
          >
            Export CSV →
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">Invoice</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(([id, c, a, s, d]) => (
                <tr key={id}>
                  <td className="font-mono text-xs">{id}</td>
                  <td className="font-semibold text-navy">{c}</td>
                  <td className="font-mono text-sm">{a}</td>
                  <td>
                    <Badge tone={s === "Paid" ? "success" : s === "Overdue" ? "hot" : "warm"}>
                      {s}
                    </Badge>
                  </td>
                  <td className="text-xs text-muted-foreground">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
