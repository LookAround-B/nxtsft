"use client";
import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import {
  Trophy, Users, Wallet, CheckCircle, XCircle, Clock,
  TrendingUp, Star, Filter, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Section, Badge } from "@/components/portal/PortalShell";
import { Pagination } from "@/components/ui/pagination";
import { trpc } from "@/lib/trpc";
import { TableSkeleton } from "@/components/ui/skeleton";

type StatusKey = "all" | "Pending" | "Approved" | "Rejected";

const TYPE_LABEL: Record<string, string> = {
  buyer_tenant: "Buyer / Tenant",
  property_owner: "Property Owner",
  board: "Board Photo",
};

const STATUS_COLORS: Record<string, string> = {
  Pending:  "bg-amber-100 text-amber-700 border-amber-200",
  Approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Rejected: "bg-red-100 text-red-600 border-red-200",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  Pending:  <Clock size={11} />,
  Approved: <CheckCircle size={11} />,
  Rejected: <XCircle size={11} />,
};

export function ReferralsTab() {
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<string | null>(null);

  const statsQ = trpc.referrals.stats.useQuery();
  const leaderboardQ = trpc.referrals.topReferrers.useQuery({ limit: 7 });
  const listQ = trpc.referrals.list.useQuery(
    { status: statusFilter === "all" ? undefined : statusFilter, page, limit: 20 },
    { placeholderData: keepPreviousData },
  );
  const utils = trpc.useUtils();
  const reviewMut = trpc.referrals.review.useMutation({
    onSuccess: () => {
      void utils.referrals.list.invalidate();
      void utils.referrals.stats.invalidate();
      void utils.referrals.topReferrers.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const submissions = listQ.data?.items ?? [];
  const total = listQ.data?.total ?? 0;
  const totalPages = listQ.data?.totalPages ?? 1;
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const decide = (id: string, decision: "Approved" | "Rejected") => {
    reviewMut.mutate({ id, decision }, {
      onSuccess: () => toast.success(decision === "Approved" ? "Submission approved — reward credited." : "Submission rejected."),
    });
  };

  const viewed = submissions.find((s) => s.id === viewing);

  return (
    <div className="space-y-6">

      {/* ── KPI row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Submissions", value: String(statsQ.data?.total ?? 0),   sub: "all time",       icon: Users,      accent: false },
          { label: "Pending Review",    value: String(statsQ.data?.pending ?? 0), sub: "need action",    icon: Clock,      accent: (statsQ.data?.pending ?? 0) > 0 },
          { label: "Total Paid Out",    value: fmt(statsQ.data?.totalPaidOut ?? 0), sub: "approved rewards", icon: TrendingUp, accent: false },
          { label: "Top Referrer",      value: leaderboardQ.data?.[0]?.name ?? "—", sub: leaderboardQ.data?.[0] ? fmt(leaderboardQ.data[0].earned) : "no data yet", icon: Wallet, accent: false },
        ].map(({ label, value, sub, icon: Icon, accent }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm ${
              accent ? "border-amber-200 bg-amber-50" : "border-border bg-white"
            }`}
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl mb-2 ${accent ? "bg-amber-100 text-amber-600" : "bg-secondary text-muted-foreground"}`}>
              <Icon size={16} />
            </div>
            <div className={`truncate font-display text-2xl font-black ${accent ? "text-amber-700" : "text-navy"}`}>{value}</div>
            <div className="text-[11px] font-semibold text-navy/70">{label}</div>
            <div className="truncate text-[10px] text-muted-foreground">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Top referrers leaderboard ─────────────────────────────── */}
      <Section title="Top Referrers">
        {(leaderboardQ.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No approved referrals yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Referrer</th>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-center">Approved Refs</th>
                  <th className="px-4 py-3 text-right">Earned</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardQ.data!.map((u) => (
                  <tr key={u.rank} className={`border-b border-border transition hover:bg-secondary/20 ${u.rank === 1 ? "bg-amber-50/60" : ""}`}>
                    <td className="px-4 py-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-xl font-display text-sm font-black ${
                        u.rank === 1 ? "bg-amber-400 text-white" :
                        u.rank === 2 ? "bg-slate-200 text-slate-600" :
                        u.rank === 3 ? "bg-orange-200 text-orange-700" :
                        "bg-secondary text-muted-foreground"
                      }`}>
                        {u.rank === 1 ? <Trophy size={14} /> : u.rank}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-navy">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.city || "—"}</td>
                    <td className="px-4 py-3 text-center font-bold text-navy">{u.refs}</td>
                    <td className="px-4 py-3 text-right font-display font-bold text-emerald-600">{fmt(u.earned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5">
          <Star size={13} className="text-amber-500 fill-amber-500 shrink-0" />
          <span className="text-xs text-amber-800">Ranked by lifetime approved reward amount.</span>
        </div>
      </Section>

      {/* ── All submissions ───────────────────────────────────────── */}
      <Section
        title="All Referral Submissions"
        action={
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-muted-foreground" />
            <div className="flex gap-1">
              {(["all", "Pending", "Approved", "Rejected"] as StatusKey[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize transition ${
                    statusFilter === s ? "bg-accent text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/60"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {listQ.isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : submissions.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No submissions match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="px-3 py-3 text-left">Referrer</th>
                  <th className="px-3 py-3 text-left">Type</th>
                  <th className="px-3 py-3 text-left">Customer</th>
                  <th className="px-3 py-3 text-left">Location</th>
                  <th className="px-3 py-3 text-center">Reward</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-right">Date</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((r) => (
                  <tr key={r.id} className="border-b border-border transition hover:bg-secondary/15">
                    <td className="px-3 py-3 font-semibold text-navy">{r.submitter?.name ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold text-foreground/70">
                        {TYPE_LABEL[r.type] ?? r.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 max-w-[180px]">
                      <div className="truncate font-medium text-navy">{r.customerName}</div>
                      {r.customerPhone && (
                        <a
                          href={`tel:${r.customerPhone}`}
                          className="font-mono text-xs font-semibold text-accent hover:underline"
                        >
                          {r.customerPhone}
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{r.location || "—"}</td>
                    <td className="px-3 py-3 text-center font-display font-bold text-navy">{fmt(r.rewardAmount)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[r.status]}`}>
                        {STATUS_ICONS[r.status]}
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-[11px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewing(r.id)}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-secondary"
                          title="View details"
                        >
                          <Eye size={13} />
                        </button>
                        {r.status === "Pending" && (
                          <>
                            <button
                              onClick={() => decide(r.id, "Approved")}
                              disabled={reviewMut.isPending}
                              className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
                            >
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button
                              onClick={() => decide(r.id, "Rejected")}
                              disabled={reviewMut.isPending}
                              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} noun="submissions" />
      </Section>

      {/* ── Detail viewer ──────────────────────────────────────────── */}
      {viewed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewing(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-navy">Submission Details</h3>
              <button onClick={() => setViewing(null)} className="text-muted-foreground hover:text-navy">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <Row label="Referrer" value={viewed.submitter?.name ?? "—"} />
              <Row label="Type" value={TYPE_LABEL[viewed.type] ?? viewed.type} />
              <Row label="Customer Name" value={viewed.customerName} />
              <Row label="Customer Phone" value={viewed.customerPhone} />
              <Row label="Location" value={viewed.location || "—"} />
              <Row label="Requirements" value={viewed.requirements || "—"} />
              <Row label="Reward" value={fmt(viewed.rewardAmount)} />
              <Row label="Status">
                <Badge tone={viewed.status === "Approved" ? "success" : viewed.status === "Rejected" ? "cold" : "warm"}>
                  {viewed.status}
                </Badge>
              </Row>
              {viewed.imageUrl && (
                <div>
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Photo</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={viewed.imageUrl} alt="Submitted" className="w-full rounded-xl border border-border object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children ?? <span className="text-right text-navy">{value}</span>}
    </div>
  );
}
