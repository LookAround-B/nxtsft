"use client";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { unlockedContacts, disputes as disputeData } from "@/data/static";
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

  const [unlocks, setUnlocks] = useState(unlockedContacts.map((u) => ({ ...u })));
  const [disputeList, setDisputeList] = useState(disputeData.map((d) => ({ ...d })));

  const totalRevenue = subs.reduce((s, sub) => s + sub.amount, 0) / 100;
  const activeCount = subs.filter((s) => s.status === "Active").length;
  const totalUnlocks = unlocks.length;
  const closedDeals = unlocks.filter((u) => u.closed).length;

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const toggleClosed = (id: string) => {
    setUnlocks((prev) => prev.map((u) => (u.id === id ? { ...u, closed: !u.closed } : u)));
    toast.success("Closure status updated");
  };

  const resolveDispute = (id: string) => {
    setDisputeList((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: "Resolved" as const, refundIssued: true } : d,
      ),
    );
    toast.success(`Dispute ${id} resolved and refund issued`);
  };

  return (
    <>
      <PageHead
        title="Subscriptions"
        subtitle="All plan purchases, unlocks, and closure tracking."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} sub={`${subs.length} subscription${subs.length !== 1 ? "s" : ""}`} />
        <StatCard label="Active Plans" value={String(activeCount)} sub={`${subs.length - activeCount} inactive`} />
        <StatCard label="Contacts Unlocked" value={String(totalUnlocks)} sub="Across all users" />
        <StatCard
          label="Deals Closed"
          value={String(closedDeals)}
          sub={`${totalUnlocks - closedDeals} in progress`}
          accent="text-emerald-600"
        />
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
          <p className="py-8 text-center text-sm text-muted-foreground">Loading subscriptions…</p>
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

      <Section title="Contact Unlock Records">
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Property</th>
                <th>Owner / Phone</th>
                <th>Unlocked At</th>
                <th>Closure</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {unlocks.map((u) => (
                <tr key={u.id}>
                  <td className="font-mono text-xs">{u.id}</td>
                  <td className="font-semibold text-navy">{u.user}</td>
                  <td className="max-w-45">
                    <div className="truncate text-sm font-medium text-navy">{u.property}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{u.subId}</div>
                  </td>
                  <td>
                    <div className="text-xs font-semibold text-navy">{u.owner}</div>
                    <div className="font-mono text-xs text-muted-foreground">{u.phone}</div>
                  </td>
                  <td className="font-mono text-xs text-muted-foreground">{u.unlockedAt}</td>
                  <td>
                    <Badge tone={u.closed ? "success" : "warm"}>
                      {u.closed ? "Closed" : "In Progress"}
                    </Badge>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleClosed(u.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                    >
                      {u.closed ? (
                        <>
                          <XCircle size={12} /> Reopen
                        </>
                      ) : (
                        <>
                          <CheckCircle size={12} /> Mark closed
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Dispute Log"
        action={
          <Badge tone="hot">
            {disputeList.filter((d) => d.status === "Pending").length} pending
          </Badge>
        }
      >
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Property</th>
                <th>Reason</th>
                <th>Date</th>
                <th>Status</th>
                <th>Refund</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {disputeList.map((d) => (
                <tr key={d.id}>
                  <td className="font-mono text-xs">{d.id}</td>
                  <td className="font-semibold text-navy">{d.user}</td>
                  <td className="max-w-45">
                    <div className="truncate text-sm font-medium text-navy">{d.property}</div>
                  </td>
                  <td className="max-w-50 text-xs text-muted-foreground">{d.reason}</td>
                  <td className="font-mono text-xs text-muted-foreground">{d.date}</td>
                  <td>
                    <Badge tone={d.status === "Resolved" ? "success" : "hot"}>{d.status}</Badge>
                  </td>
                  <td>
                    <Badge tone={d.refundIssued ? "success" : "warm"}>
                      {d.refundIssued ? "Issued" : "Pending"}
                    </Badge>
                  </td>
                  <td>
                    {d.status === "Pending" && (
                      <button
                        onClick={() => resolveDispute(d.id)}
                        className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white"
                      >
                        Resolve &amp; Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
