"use client";
import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { ReceiptText, Search, Download, IndianRupee } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { Pagination } from "@/components/ui/pagination";
import { trpc } from "@/lib/trpc";
import { ListSkeleton } from "@/components/ui/skeleton";
import { downloadCSV } from "@/lib/download-csv";
import { PageHead } from "./PageHead";

const GATEWAYS = [
  { label: "All gateways", value: "" },
  { label: "Razorpay", value: "razorpay" },
  { label: "PayU", value: "payu" },
] as const;

const STATUSES = [
  { label: "All statuses", value: "" },
  { label: "Success", value: "Success" },
  { label: "Pending", value: "Pending" },
  { label: "Failed", value: "Failed" },
  { label: "Refunded", value: "Refunded" },
] as const;

const STATUS_STYLE: Record<string, string> = {
  Success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Failed: "bg-rose-50 text-rose-700 border-rose-200",
  Refunded: "bg-slate-100 text-slate-600 border-slate-200",
};

function formatRupees(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function TransactionsTab() {
  const [gateway, setGateway] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const filters = {
    gateway: (gateway || undefined) as "razorpay" | "payu" | undefined,
    status: (status || undefined) as "Success" | "Pending" | "Failed" | "Refunded" | undefined,
    search: search.trim() || undefined,
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
  };

  const reset = (fn: () => void) => { fn(); setPage(1); };

  const query = trpc.admin.payments.useQuery(
    { ...filters, page, limit: 20 },
    { placeholderData: keepPreviousData },
  );

  const items = query.data?.items ?? [];
  const totalPages = query.data?.totalPages ?? 1;
  const total = query.data?.total ?? 0;
  const collected = query.data?.collected ?? 0;

  // Export pulls the full filtered set (up to 1000 rows) in one shot, not just
  // the current page — that's what "Export Transactions" means to an admin.
  const utils = trpc.useUtils();
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await utils.admin.payments.fetch({ ...filters, page: 1, limit: 1000 });
      downloadCSV(
        `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Name", "Email", "Plan", "Amount (₹)", "Gateway", "Method", "Status", "Payment ID", "Date"],
        all.items.map((p) => [
          p.name, p.email, p.plan, p.amount, p.gateway, p.method, p.status, p.paymentId,
          formatDate(p.createdAt),
        ]),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHead
        title="Transactions"
        subtitle="Every subscription and credit payment across Razorpay and PayU."
      />

      <Section title="Transaction History">
        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => reset(() => setSearch(e.target.value))}
              placeholder="Search by name, email or payment ID…"
              className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <select
            value={gateway}
            onChange={(e) => reset(() => setGateway(e.target.value))}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
          >
            {GATEWAYS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          <select
            value={status}
            onChange={(e) => reset(() => setStatus(e.target.value))}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <label className="flex flex-col text-[11px] font-semibold text-muted-foreground">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => reset(() => setDateFrom(e.target.value))}
              className="mt-0.5 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-[11px] font-semibold text-muted-foreground">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => reset(() => setDateTo(e.target.value))}
              className="mt-0.5 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </label>
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Download size={15} />
            {exporting ? "Exporting…" : "Export"}
          </button>
        </div>

        {/* Summary */}
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-secondary px-3 py-1.5 font-semibold text-navy">
            {total.toLocaleString("en-IN")} transactions
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
            <IndianRupee size={13} />
            {formatRupees(collected)} collected
          </span>
        </div>

        {query.isLoading && <ListSkeleton rows={6} />}

        {!query.isLoading && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-border py-10 text-center">
            <ReceiptText size={24} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No transactions match these filters.</p>
          </div>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Gateway</th>
                  <th className="px-4 py-3">Payment ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-navy">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">{p.plan}</td>
                    <td className="px-4 py-3 text-right font-bold text-navy">{formatRupees(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-foreground/70">{p.gateway}</span>
                      <div className="text-xs text-muted-foreground">{p.method}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground/70">{p.paymentId}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[p.status] ?? "bg-secondary text-foreground/70 border-border"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </Section>
    </>
  );
}
