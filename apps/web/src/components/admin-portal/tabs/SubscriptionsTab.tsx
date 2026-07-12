"use client";
import { useState } from "react";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHead } from "./PageHead";

type AdminSub = {
  id: string;
  planName: string;
  amount: number; // paise
  status: string;
  cycle: string;
  startDate: string;
  endDate: string;
  renewalDate: string | null;
  user: { id: string; name: string; email: string } | null;
};

export function SubscriptionsTab() {
  const [statusFilter, setStatusFilter] = useState("");
  const subQ = trpc.subscriptions.adminList.useQuery({ status: statusFilter || undefined, limit: 100 });
  const subs = (subQ.data?.items ?? []) as unknown as AdminSub[];
  const cancelSub = trpc.subscriptions.cancel.useMutation({
    onSuccess: () => { subQ.refetch(); toast.success("Subscription cancelled"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const totalRevenue = subs.reduce((s, sub) => s + sub.amount, 0) / 100;
  const activeCount = subs.filter((s) => s.status === "Active").length;

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <PageHead
        title="Subscriptions"
        subtitle="All plan purchases, unlocks, and closure tracking."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} sub={`${subs.length} subscription${subs.length !== 1 ? "s" : ""}`} />
        <StatCard label="Active Plans" value={String(activeCount)} sub={`${subs.length - activeCount} inactive`} />
      </div>

      <Section
        title="Plan Purchases"
        action={
          <Select value={statusFilter || "__all"} onValueChange={(v) => setStatusFilter(v === "__all" ? "" : v)}>
            <SelectTrigger size="sm" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All statuses</SelectItem>
              {["Active", "Cancelled", "Expired", "Failed"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        {subQ.isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : subs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No subscriptions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Cycle</th>
                  <th>Start</th>
                  <th>Renewal</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <div className="font-semibold text-navy">{sub.user?.name ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{sub.user?.email ?? ""}</div>
                    </td>
                    <td><Badge tone="new">{sub.planName}</Badge></td>
                    <td className="font-mono text-sm font-semibold text-navy">₹{(sub.amount / 100).toLocaleString("en-IN")}</td>
                    <td className="text-xs">{sub.cycle}</td>
                    <td className="text-xs text-muted-foreground">{fmtDate(sub.startDate)}</td>
                    <td className="text-xs text-muted-foreground">{sub.renewalDate ? fmtDate(sub.renewalDate) : "—"}</td>
                    <td><Badge tone={sub.status === "Active" ? "success" : "cold"}>{sub.status}</Badge></td>
                    <td className="text-right">
                      {sub.status === "Active" ? (
                        <button
                          onClick={() => cancelSub.mutate({ subscriptionId: sub.id })}
                          disabled={cancelSub.isPending}
                          className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

    </>
  );
}
