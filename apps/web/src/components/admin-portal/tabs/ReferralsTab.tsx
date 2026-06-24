"use client";
import { useState } from "react";
import {
  Trophy, Users, Gift, Wallet, CheckCircle, XCircle, Clock,
  TrendingUp, Star, Filter, Download, IndianRupee,
} from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";

/* ── Static demo data ──────────────────────────────────────────── */
const TOP_REFERRERS = [
  { rank: 1, name: "Priya Sharma",   city: "Bengaluru", refs: 28, pending: 3, paid: "₹12,400", status: "active" },
  { rank: 2, name: "Rahul Verma",    city: "Mumbai",    refs: 21, pending: 1, paid: "₹9,750",  status: "active" },
  { rank: 3, name: "Anjali Singh",   city: "Hyderabad", refs: 16, pending: 2, paid: "₹7,200",  status: "active" },
  { rank: 4, name: "Karthik M.",     city: "Chennai",   refs: 12, pending: 0, paid: "₹5,500",  status: "active" },
  { rank: 5, name: "Meera Pillai",   city: "Kochi",     refs: 9,  pending: 1, paid: "₹4,050",  status: "active" },
  { rank: 6, name: "Devraj S.",      city: "Pune",      refs: 7,  pending: 2, paid: "₹3,150",  status: "active" },
  { rank: 7, name: "Shalini K.",     city: "Jaipur",    refs: 5,  pending: 0, paid: "₹2,250",  status: "inactive" },
];

const REFERRAL_SUBMISSIONS = [
  { id: "R001", referrer: "Priya Sharma",  type: "Buyer",         referred: "Vikram Nair",        city: "Bengaluru", status: "approved", reward: "₹500",  date: "2026-06-20" },
  { id: "R002", referrer: "Rahul Verma",   type: "Owner Listing", referred: "3 BHK, Andheri W",   city: "Mumbai",    status: "pending",  reward: "₹120",  date: "2026-06-22" },
  { id: "R003", referrer: "Anjali Singh",  type: "Board Photo",   referred: "Plot, Gachibowli",   city: "Hyderabad", status: "pending",  reward: "₹50",   date: "2026-06-23" },
  { id: "R004", referrer: "Priya Sharma",  type: "Agent",         referred: "Raju Bhai Brokers",  city: "Bengaluru", status: "approved", reward: "₹300",  date: "2026-06-18" },
  { id: "R005", referrer: "Karthik M.",    type: "Buyer",         referred: "Suresh Iyer",        city: "Chennai",   status: "paid",     reward: "₹500",  date: "2026-06-15" },
  { id: "R006", referrer: "Meera Pillai",  type: "Owner Listing", referred: "2 BHK, MG Road",    city: "Kochi",     status: "rejected", reward: "₹120",  date: "2026-06-14" },
  { id: "R007", referrer: "Devraj S.",     type: "Board Photo",   referred: "Plot, Wakad",        city: "Pune",      status: "pending",  reward: "₹50",   date: "2026-06-23" },
  { id: "R008", referrer: "Rahul Verma",   type: "Buyer",         referred: "Nidhi Kapoor",       city: "Mumbai",    status: "pending",  reward: "₹500",  date: "2026-06-24" },
];

const PAYOUT_QUEUE = [
  { id: "P001", user: "Priya Sharma",  amount: "₹2,100", method: "UPI",           requested: "2026-06-22", upiId: "priya@ybl"   },
  { id: "P002", user: "Anjali Singh",  amount: "₹500",   method: "Bank Transfer", requested: "2026-06-23", upiId: "HDFC·7890"   },
  { id: "P003", user: "Devraj S.",     amount: "₹300",   method: "UPI",           requested: "2026-06-23", upiId: "devraj@paytm"},
  { id: "P004", user: "Meera Pillai",  amount: "₹1,050", method: "NxtSft Credits",requested: "2026-06-24", upiId: "—"           },
];

type StatusKey = "all" | "pending" | "approved" | "paid" | "rejected";

const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  paid:     "bg-blue-100 text-blue-700 border-blue-200",
  rejected: "bg-red-100 text-red-600 border-red-200",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending:  <Clock size={11} />,
  approved: <CheckCircle size={11} />,
  paid:     <IndianRupee size={11} />,
  rejected: <XCircle size={11} />,
};

export function ReferralsTab() {
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");
  const [payoutActions, setPayoutActions] = useState<Record<string, "approved" | "rejected" | null>>(
    Object.fromEntries(PAYOUT_QUEUE.map((p) => [p.id, null])),
  );

  const filtered = statusFilter === "all"
    ? REFERRAL_SUBMISSIONS
    : REFERRAL_SUBMISSIONS.filter((r) => r.status === statusFilter);

  const pendingCount = REFERRAL_SUBMISSIONS.filter((r) => r.status === "pending").length;
  const pendingPayouts = PAYOUT_QUEUE.filter((p) => !payoutActions[p.id]).length;

  return (
    <div className="space-y-6">

      {/* ── KPI row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Referrals This Month", value: String(REFERRAL_SUBMISSIONS.length), sub: "+12% vs last month", icon: Users,       accent: false },
          { label: "Pending Review",        value: String(pendingCount),                sub: `${pendingCount} need action`,  icon: Clock,       accent: pendingCount > 0 },
          { label: "Pending Payouts",       value: String(pendingPayouts),              sub: "payout requests",  icon: Wallet,      accent: pendingPayouts > 0 },
          { label: "Total Paid Out (MTD)",  value: "₹29,150",                          sub: "across 58 txns",   icon: TrendingUp,  accent: false },
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
            <div className={`font-display text-2xl font-black ${accent ? "text-amber-700" : "text-navy"}`}>{value}</div>
            <div className="text-[11px] font-semibold text-navy/70">{label}</div>
            <div className="text-[10px] text-muted-foreground">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Top referrers leaderboard ─────────────────────────────── */}
      <Section title="Top Referrers — This Month">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Referrer</th>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-center">Total Refs</th>
                <th className="px-4 py-3 text-center">Pending</th>
                <th className="px-4 py-3 text-right">Paid Out</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {TOP_REFERRERS.map((u) => (
                <tr
                  key={u.rank}
                  className={`border-b border-border transition hover:bg-secondary/20 ${u.rank === 1 ? "bg-amber-50/60" : ""}`}
                >
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
                  <td className="px-4 py-3 text-muted-foreground">{u.city}</td>
                  <td className="px-4 py-3 text-center font-bold text-navy">{u.refs}</td>
                  <td className="px-4 py-3 text-center">
                    {u.pending > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{u.pending}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-display font-bold text-emerald-600">{u.paid}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      u.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-secondary text-muted-foreground"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5">
          <Star size={13} className="text-amber-500 fill-amber-500 shrink-0" />
          <span className="text-xs text-amber-800">
            Active partners earning <strong>₹5,000–₹30,000/month</strong>
          </span>
        </div>
      </Section>

      {/* ── All submissions ───────────────────────────────────────── */}
      <Section
        title="All Referral Submissions"
        action={
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-muted-foreground" />
            <div className="flex gap-1">
              {(["all", "pending", "approved", "paid", "rejected"] as StatusKey[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize transition ${
                    statusFilter === s
                      ? "bg-accent text-white"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/60"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button className="ml-2 flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-[11px] font-semibold text-foreground/60 transition hover:bg-secondary">
              <Download size={12} /> Export
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-3 text-left">ID</th>
                <th className="px-3 py-3 text-left">Referrer</th>
                <th className="px-3 py-3 text-left">Type</th>
                <th className="px-3 py-3 text-left">Referred</th>
                <th className="px-3 py-3 text-left">City</th>
                <th className="px-3 py-3 text-center">Reward</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-3 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border transition hover:bg-secondary/15">
                  <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">{r.id}</td>
                  <td className="px-3 py-3 font-semibold text-navy">{r.referrer}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold text-foreground/70">
                      {r.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-foreground/70 max-w-[140px] truncate">{r.referred}</td>
                  <td className="px-3 py-3 text-muted-foreground">{r.city}</td>
                  <td className="px-3 py-3 text-center font-display font-bold text-navy">{r.reward}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[r.status]}`}>
                      {STATUS_ICONS[r.status]}
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-[11px] text-muted-foreground">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Pending payout queue ──────────────────────────────────── */}
      <Section title="Pending Payout Requests">
        {PAYOUT_QUEUE.every((p) => payoutActions[p.id]) ? (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center">
            <CheckCircle size={28} className="mx-auto mb-3 text-emerald-400" />
            <p className="text-sm font-semibold text-navy">All payout requests processed!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {PAYOUT_QUEUE.map((p) => {
              const action = payoutActions[p.id];
              return (
                <div
                  key={p.id}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 transition sm:flex-row sm:items-center ${
                    action === "approved" ? "border-emerald-200 bg-emerald-50" :
                    action === "rejected" ? "border-red-200 bg-red-50 opacity-60" :
                    "border-border bg-white"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-navy">{p.user}</span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground/60">
                        {p.method}
                      </span>
                    </div>
                    <div className="mt-0.5 flex gap-3 text-[11px] text-muted-foreground">
                      <span>Req: {p.requested}</span>
                      <span>{p.upiId}</span>
                    </div>
                  </div>
                  <div className="font-display text-xl font-black text-navy">{p.amount}</div>
                  {action ? (
                    <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ${
                      action === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                    }`}>
                      {action === "approved" ? <CheckCircle size={13} /> : <XCircle size={13} />}
                      {action === "approved" ? "Approved" : "Rejected"}
                    </span>
                  ) : (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setPayoutActions((prev) => ({ ...prev, [p.id]: "approved" }))}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600"
                      >
                        <CheckCircle size={13} /> Approve
                      </button>
                      <button
                        onClick={() => setPayoutActions((prev) => ({ ...prev, [p.id]: "rejected" }))}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

    </div>
  );
}
