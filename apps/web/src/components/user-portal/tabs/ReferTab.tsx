"use client";
import { useState } from "react";
import {
  Copy, Check, Share2, Gift, Users, Home, Camera,
  Wallet, Smartphone, ArrowRight, Star, Trophy,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Section, Badge } from "@/components/portal/PortalShell";
import { Head } from "./shared";

/* ── Static demo data ──────────────────────────────────────────── */
const TOP_REFERRERS = [
  { rank: 1, name: "Priya Sharma",  city: "Bengaluru", refs: 28, earned: "₹12,400" },
  { rank: 2, name: "Rahul Verma",   city: "Mumbai",    refs: 21, earned: "₹9,750"  },
  { rank: 3, name: "Anjali Singh",  city: "Hyderabad", refs: 16, earned: "₹7,200"  },
  { rank: 4, name: "Karthik M.",    city: "Chennai",   refs: 12, earned: "₹5,500"  },
  { rank: 5, name: "Meera Pillai",  city: "Kochi",     refs: 9,  earned: "₹4,050"  },
];

const EARN_PATHS = [
  { Icon: Users,  tag: "Refer a Buyer / Tenant", reward: "₹500",  note: "per deal closed",      color: "bg-accent/10 text-accent",   border: "border-accent/25" },
  { Icon: Home,   tag: "Refer a Property Owner", reward: "₹120",  note: "per published listing", color: "bg-orange-50 text-orange-600", border: "border-orange-200" },
  { Icon: Camera, tag: "Spot & Submit a Board",  reward: "₹50",   note: "per verified board",    color: "bg-emerald-50 text-emerald-700", border: "border-emerald-200" },
];

/* ── Copy link helper ──────────────────────────────────────────── */
function CopyLinkBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = `https://nxtsft.com/register?ref=${code}`;

  const copy = () => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: "Join NxtSft.com", url: link }).catch(() => {});
    } else {
      copy();
    }
  };

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/50">
        Your referral link
      </div>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1 truncate rounded-xl bg-white/10 px-3 py-2 font-mono text-xs text-white/80">
          {link}
        </div>
        <button
          onClick={copy}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-navy shadow transition hover:opacity-90"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          onClick={share}
          className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-white/80 transition hover:bg-white/15"
        >
          <Share2 size={12} /> Share via app
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Hey! Use my referral link to join NxtSft.com: ${link}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp
        </a>
      </div>
    </div>
  );
}

export function ReferTab() {
  const { session } = useAuth();
  const name = session?.name ?? "User";
  const email = session?.email ?? "";

  const referralCode = `${name.replace(/\s+/g, "").toLowerCase().slice(0, 8)}${Math.abs(
    email.charCodeAt(0) * 7,
  ).toString().slice(0, 4)}`;

  return (
    <div className="space-y-6">
      {/* ── Hero card ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-3xl text-white"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563EB 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative p-6 sm:p-8">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/50">
            Refer &amp; Earn
          </div>
          <div className="font-display text-3xl font-black leading-tight text-white sm:text-4xl">
            No cap
            <br />
            <span className="text-[14px] font-semibold uppercase tracking-[0.2em] text-white/60">
              on earnings
            </span>
          </div>
          <p className="mt-2 text-sm text-white/65">
            Welcome back, {name.split(" ")[0]}! Share your link and earn up to{" "}
            <strong className="text-white">₹500 per referral</strong>.
          </p>
          <div className="mt-5">
            <CopyLinkBox code={referralCode} />
          </div>
        </div>
      </div>

      {/* ── Personal stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Referrals", value: "—",  sub: "updated on deal close" },
          { label: "Wallet Balance",  value: "₹0", sub: "available to redeem" },
          { label: "Pending Rewards", value: "₹0", sub: "under verification" },
          { label: "Paid Out",        value: "₹0", sub: "all time" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="font-display text-2xl font-black text-navy">{value}</div>
            <div className="mt-0.5 text-xs font-semibold text-navy/80">{label}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── 3 ways to earn ────────────────────────────────────────── */}
      <Section title="3 Ways to Earn">
        <div className="grid gap-3 sm:grid-cols-3">
          {EARN_PATHS.map((ep) => (
            <div key={ep.tag} className={`rounded-2xl border-2 p-4 ${ep.border}`}>
              <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${ep.color}`}>
                <ep.Icon size={11} />
                {ep.tag}
              </div>
              <div className="mt-3 font-display text-2xl font-black text-navy">{ep.reward}</div>
              <div className="text-xs text-muted-foreground">{ep.note}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Top referrers leaderboard ─────────────────────────────── */}
      <Section title="Top Referrers This Month">
        <div className="space-y-2">
          {TOP_REFERRERS.map((u) => (
            <div
              key={u.rank}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition hover:border-accent/30 hover:shadow-sm ${
                u.rank === 1 ? "border-amber-200 bg-amber-50" : "border-border bg-secondary/20"
              }`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-black ${
                u.rank === 1 ? "bg-amber-400 text-white" : "bg-secondary text-navy/60"
              }`}>
                {u.rank === 1 ? <Trophy size={16} /> : u.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-semibold text-sm text-navy">{u.name}</div>
                <div className="text-[11px] text-muted-foreground">{u.city} · {u.refs} referrals</div>
              </div>
              <div className="font-display text-base font-bold text-emerald-600">{u.earned}</div>
            </div>
          ))}
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
            <Star size={14} className="text-amber-500 fill-amber-500 shrink-0" />
            <span className="text-xs text-amber-800">
              Active partners earning <strong>₹5,000–₹30,000/month</strong>
            </span>
          </div>
        </div>
      </Section>

      {/* ── Recent activity ───────────────────────────────────────── */}
      <Section title="My Recent Activity">
        <div className="rounded-2xl border border-dashed border-border bg-secondary/20 py-10 text-center">
          <Gift size={30} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-semibold text-navy">No activity yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Share your referral link to start earning rewards.
          </p>
        </div>
      </Section>

      {/* ── Payout methods ────────────────────────────────────────── */}
      <Section title="Redemption Options">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "UPI",           note: "Instant payout · Recommended", Icon: Smartphone, accent: true  },
            { label: "Bank Transfer", note: "1–2 working days (NEFT/IMPS)", Icon: Wallet,     accent: false },
            { label: "NxtSft Credits",note: "Use toward property search",   Icon: Gift,       accent: false },
          ].map(({ label, note, Icon, accent }) => (
            <div
              key={label}
              className={`flex items-center gap-3 rounded-2xl border p-4 ${accent ? "border-accent/30 bg-accent/6" : "border-border"}`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent ? "bg-accent text-white" : "bg-secondary text-foreground/60"}`}>
                <Icon size={16} />
              </div>
              <div>
                <div className="text-sm font-semibold text-navy">{label}</div>
                <div className="text-[11px] text-muted-foreground">{note}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Minimum redemption ₹100. Go to <strong>Wallet</strong> tab to request a payout.
        </p>
      </Section>
    </div>
  );
}
