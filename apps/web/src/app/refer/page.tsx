"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  Share2,
  Gift,
  Users,
  Camera,
  Home,
  Wallet,
  ChevronDown,
  ChevronUp,
  Star,
  ArrowRight,
  Smartphone,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

/* ─── Earn paths ─────────────────────────────────────────────────── */
const EARN_PATHS = [
  {
    icon: Users,
    tag: "Refer a Buyer or Tenant",
    reward: "₹500",
    rewardNote: "per successful deal",
    color: "from-accent to-[oklch(0.55_0.22_27)]",
    bgLight: "bg-accent/6 border-accent/20",
    tagColor: "bg-accent/10 text-accent",
    desc: "Know someone looking to buy or rent a home? Share your referral link with them. When they sign up and close a deal through NxtSft.com, you earn ₹500 — credited to your wallet instantly.",
    steps: [
      "Share your unique referral link with a friend looking for a property.",
      "They sign up on NxtSft.com using your link and search for properties.",
      "Once they close a deal (purchase or rental agreement), we verify and credit ₹500 to your NxtSft Wallet.",
    ],
  },
  {
    icon: Home,
    tag: "Refer a Property Owner",
    reward: "₹120",
    rewardNote: "per published listing",
    color: "from-[oklch(0.65_0.18_27)] to-[oklch(0.58_0.20_27)]",
    bgLight: "bg-[oklch(0.97_0.03_27)] border-[oklch(0.65_0.18_27)/25]",
    tagColor: "bg-[oklch(0.96_0.03_27)] text-[oklch(0.50_0.18_27)]",
    desc: "Know a homeowner who wants to sell or rent out their property? Share their contact details or encourage them to list on NxtSft.com. Earn ₹120 for every listing that gets published on our platform.",
    steps: [
      "Get the property owner's name, phone number, and property address.",
      "Submit the details via the form below or share your referral link with the owner directly.",
      "Once the listing is verified and published, ₹120 is credited to your NxtSft Wallet.",
    ],
  },
  {
    icon: Camera,
    tag: "Spot & Submit a Board",
    reward: "₹50",
    rewardNote: "per verified board",
    color: "from-emerald-500 to-emerald-600",
    bgLight: "bg-emerald-50 border-emerald-200",
    tagColor: "bg-emerald-100 text-emerald-700",
    desc: 'See a "For Sale" or "To Let" board in your neighbourhood? Click a photo and submit it. If the owner is not already on NxtSft.com and agrees to list, you earn ₹50 instantly.',
    steps: [
      'Spot a "For Sale" or "To Let" sign board anywhere in your city.',
      "Photograph the board clearly and note the address.",
      "Submit via the app or the form below. We'll reach out to the owner.",
      "Earn ₹50 once the owner lists and the property is published.",
    ],
  },
];

/* ─── Reward tiers ────────────────────────────────────────────────── */
const REWARD_TIERS = [
  {
    label: "Buyer / Tenant referral",
    amount: "₹500",
    condition: "Per deal closed",
    highlight: true,
  },
  {
    label: "Owner listing referral",
    amount: "₹120",
    condition: "Per published listing",
    highlight: false,
  },
  {
    label: "Board photo submission",
    amount: "₹50",
    condition: "Per verified & listed board",
    highlight: false,
  },
  {
    label: "Agent onboarding referral",
    amount: "₹300",
    condition: "Per verified RERA agent",
    highlight: false,
  },
];

/* ─── Redemption steps ────────────────────────────────────────────── */
const REDEEM_STEPS = [
  {
    n: "01",
    title: "Earn rewards",
    desc: "Complete referral actions. Rewards are credited to your NxtSft Wallet within 48 hours of verification.",
  },
  {
    n: "02",
    title: "Open your Wallet",
    desc: "Go to your User Portal → Wallet tab to view your available balance and transaction history.",
  },
  {
    n: "03",
    title: "Choose payout method",
    desc: "Redeem via UPI (recommended), bank transfer (NEFT/IMPS), or use your balance as Credits on NxtSft.com.",
  },
  {
    n: "04",
    title: "Get paid instantly",
    desc: "UPI payouts process within minutes. Bank transfers take 1–2 working days. Minimum redemption: ₹100.",
  },
];

/* ─── FAQs ────────────────────────────────────────────────────────── */
const FAQS = [
  {
    q: "Who can participate in the NxtSft.com Refer & Earn programme?",
    a: "Any registered NxtSft.com user — buyer, seller, or tenant — can participate. You must be 18 years or older and have a verified email and phone number on your account.",
  },
  {
    q: "How do I get my unique referral link?",
    a: "Log in to your account and visit this page. Your personalised referral link is displayed at the top of the page. You can copy it, share it via WhatsApp, or send it directly by email.",
  },
  {
    q: "Why was my submission rejected?",
    a: "Common reasons: the property is already listed on NxtSft.com; the property has already been sold or rented; the contact details belong to a broker or agent; or the board photo was unclear or unverifiable. Ensure you're submitting genuine, unlisted properties.",
  },
  {
    q: "How long does reward verification take?",
    a: "Owner listing and board submissions are typically verified within 3–5 business days. Buyer/tenant deal rewards are credited within 48 hours of deal confirmation. Agent onboarding rewards are credited after RERA verification, usually within 7 business days.",
  },
  {
    q: "Is there a limit on how much I can earn?",
    a: "No cap on total earnings! You can refer as many owners, buyers, tenants, and agents as you like. The more you refer, the more you earn.",
  },
  {
    q: "Can I use my reward balance to buy Credits on NxtSft.com?",
    a: "Yes. Your NxtSft Wallet balance can be used to purchase property search Credits directly, in addition to UPI and bank payout options.",
  },
  {
    q: "What happens if a referred buyer doesn't close a deal?",
    a: "Buyer/tenant referral rewards are only paid on verified deal closures. If the referred person signs up but does not close a deal, no reward is credited for that referral. Listing and board photo rewards are independent and do not require a deal closure.",
  },
];

/* ─── Cities ──────────────────────────────────────────────────────── */
const CITIES = [
  "Mumbai",
  "Delhi NCR",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Ahmedabad",
  "Kolkata",
  "Jaipur",
  "Gurugram",
];

function CopyLinkBox({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);
  const link = `https://nxtsft.com/register?ref=${referralCode}`;

  const copy = () => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: "Join NxtSft.com",
          text: "Find your dream home on NxtSft.com — India's smart real estate platform!",
          url: link,
        })
        .catch(() => {});
    } else {
      copy();
    }
  };

  return (
    <div className="mt-6 rounded-2xl border-2 border-accent/25 bg-white p-5 shadow-sm shadow-accent/10">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Your referral link
      </div>
      <div className="flex gap-2">
        <div className="flex-1 truncate rounded-xl border border-border bg-secondary/40 px-4 py-2.5 font-mono text-sm text-foreground/70">
          {link}
        </div>
        <button
          onClick={copy}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={share}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground/70 transition hover:bg-secondary"
        >
          <Share2 size={13} /> Share via app
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Hey! I found a great property platform — NxtSft.com. Use my referral link to sign up and find your dream home: ${link}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Share on WhatsApp
        </a>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 py-5 text-left text-sm font-semibold text-navy transition hover:text-accent"
      >
        {q}
        {open ? (
          <ChevronUp size={16} className="mt-0.5 shrink-0 text-accent" />
        ) : (
          <ChevronDown size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>}
    </div>
  );
}

export default function ReferPage() {
  const { session } = useAuth();
  const [activeEarn, setActiveEarn] = useState(0);
  const referralCode = session
    ? `${session.name.replace(/\s+/g, "").toLowerCase().slice(0, 8)}${Math.abs(
        session.email.charCodeAt(0) * 7,
      )
        .toString()
        .slice(0, 4)}`
    : "NXTSFT2026";
  const ActiveEarnIcon = EARN_PATHS[activeEarn].icon;

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden border-b border-border"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563EB 100%)" }}
      >
        {/* Dot pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm">
                <Gift size={12} />
                Refer &amp; Earn — NxtSft.com
              </div>
              <h1 className="mt-5 font-display text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                Refer friends.
                <br />
                Earn real money.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-white/70">
                Share NxtSft.com with buyers, tenants, and property owners in your network — and
                earn up to <strong className="text-white">₹500 per referral</strong>, paid directly
                to your UPI or bank account.
              </p>

              {/* Stats */}
              <div className="mt-8 flex flex-wrap gap-6">
                {[
                  ["₹500", "per buyer deal"],
                  ["₹120", "per listing"],
                  ["₹50", "per board photo"],
                  ["No cap", "on earnings"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <div className="font-display text-2xl font-black text-white">{v}</div>
                    <div className="text-[11px] uppercase tracking-wider text-white/50">{l}</div>
                  </div>
                ))}
              </div>

              {session ? (
                <CopyLinkBox referralCode={referralCode} />
              ) : (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-navy shadow-lg transition hover:shadow-xl"
                  >
                    Create free account <ArrowRight size={15} />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
                  >
                    Sign in to refer
                  </Link>
                </div>
              )}
            </div>

            {/* Right — social proof card */}
            <div>
              <div className="rounded-3xl border border-white/15 bg-white/10 p-8 backdrop-blur-md">
                <div className="mb-6 text-[11px] font-bold uppercase tracking-widest text-white/50">
                  Top referrers this month
                </div>
                <div className="space-y-4">
                  {[
                    { name: "Priya Sharma", city: "Bengaluru", earned: "₹12,400", refs: 28 },
                    { name: "Rahul Verma", city: "Mumbai", earned: "₹9,750", refs: 21 },
                    { name: "Anjali Singh", city: "Hyderabad", earned: "₹7,200", refs: 16 },
                    { name: "Karthik M.", city: "Chennai", earned: "₹5,500", refs: 12 },
                  ].map((u, i) => (
                    <div
                      key={u.name}
                      className="flex items-center gap-4 rounded-2xl bg-white/8 px-4 py-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 font-display text-sm font-black text-white">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-semibold text-sm text-white">{u.name}</div>
                        <div className="text-[11px] text-white/50">
                          {u.city} · {u.refs} referrals
                        </div>
                      </div>
                      <div className="font-display text-base font-bold text-emerald-300">
                        {u.earned}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-white/6 px-4 py-3">
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  <span className="text-xs text-white/60">
                    Active partners earning{" "}
                    <strong className="text-white">₹5,000–₹30,000/month</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ways to earn ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">
          Earn in 3 ways
        </div>
        <h2 className="font-display text-3xl font-black text-navy sm:text-4xl">
          How would you like to earn?
        </h2>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {EARN_PATHS.map((ep, i) => (
            <button
              key={ep.tag}
              onClick={() => setActiveEarn(i)}
              className={`rounded-2xl border-2 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                activeEarn === i
                  ? `${ep.bgLight} -translate-y-0.5 shadow-md`
                  : "border-border bg-white"
              }`}
            >
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${ep.tagColor}`}
              >
                <ep.icon size={11} />
                {ep.tag}
              </div>
              <div className="mt-3 font-display text-3xl font-black text-navy">{ep.reward}</div>
              <div className="text-xs text-muted-foreground">{ep.rewardNote}</div>
            </button>
          ))}
        </div>

        {/* Active earn path detail */}
        <div
          className={`mt-6 rounded-3xl border-2 p-8 transition-all ${EARN_PATHS[activeEarn].bgLight}`}
        >
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${EARN_PATHS[activeEarn].tagColor}`}
              >
                <ActiveEarnIcon size={13} />
                {EARN_PATHS[activeEarn].tag}
              </div>
              <div className="mt-4 font-display text-4xl font-black text-navy">
                {EARN_PATHS[activeEarn].reward}{" "}
                <span className="text-lg font-semibold text-muted-foreground">
                  {EARN_PATHS[activeEarn].rewardNote}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/70">
                {EARN_PATHS[activeEarn].desc}
              </p>
            </div>
            <div>
              <div className="mb-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                How it works
              </div>
              <ol className="space-y-4">
                {EARN_PATHS[activeEarn].steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white text-xs font-black ${EARN_PATHS[activeEarn].color}`}
                    >
                      {i + 1}
                    </div>
                    <span className="pt-1 text-sm leading-relaxed text-foreground/70">{step}</span>
                  </li>
                ))}
              </ol>
              {session ? (
                <Link
                  href="/user-portal"
                  className={`mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 ${EARN_PATHS[activeEarn].color}`}
                >
                  Start earning <ArrowRight size={15} />
                </Link>
              ) : (
                <Link
                  href="/register"
                  className={`mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 ${EARN_PATHS[activeEarn].color}`}
                >
                  Sign up to start <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Reward table ──────────────────────────────────────────── */}
      <section className="border-y border-border bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">
            Payout schedule
          </div>
          <h2 className="font-display text-3xl font-black text-navy sm:text-4xl">What you earn</h2>
          <div className="mt-8 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Referral type
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Reward
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Condition
                  </th>
                </tr>
              </thead>
              <tbody>
                {REWARD_TIERS.map((r) => (
                  <tr
                    key={r.label}
                    className={`border-b border-border last:border-0 transition hover:bg-secondary/30 ${r.highlight ? "bg-accent/4" : ""}`}
                  >
                    <td className="px-6 py-4 font-medium text-navy">{r.label}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-display text-xl font-black ${r.highlight ? "text-accent" : "text-navy"}`}
                      >
                        {r.amount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{r.condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Rewards are credited within 48 hours of verification. Minimum redemption ₹100. Valid for
            properties in India only.
          </p>
        </div>
      </section>

      {/* ── How to redeem ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">
          Redemption
        </div>
        <h2 className="font-display text-3xl font-black text-navy sm:text-4xl">
          Get paid in 4 steps
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REDEEM_STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-white p-6">
              <div className="font-display text-4xl font-black text-accent/20">{s.n}</div>
              <div className="mt-3 font-semibold text-navy">{s.title}</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Payout methods */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "UPI", note: "Instant payout", icon: Smartphone, highlight: true },
            { label: "Bank Transfer", note: "1–2 working days", icon: Wallet, highlight: false },
            {
              label: "NxtSft Credits",
              note: "Use to search & unlock listings",
              icon: Gift,
              highlight: false,
            },
          ].map((m) => (
            <div
              key={m.label}
              className={`flex items-center gap-4 rounded-2xl border p-5 ${m.highlight ? "border-accent/30 bg-accent/6" : "border-border bg-white"}`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.highlight ? "bg-accent text-white" : "bg-secondary text-foreground/60"}`}
              >
                <m.icon size={18} />
              </div>
              <div>
                <div className="font-semibold text-sm text-navy">
                  {m.label}{" "}
                  {m.highlight && (
                    <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{m.note}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Supported cities ──────────────────────────────────────── */}
      <section className="border-y border-border bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">
            Available in
          </div>
          <h2 className="font-display text-2xl font-black text-navy">
            Board photo submissions — active cities
          </h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {CITIES.map((c) => (
              <span
                key={c}
                className="rounded-full border border-border bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground/70"
              >
                {c}
              </span>
            ))}
            <span className="rounded-full border border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground">
              More cities coming soon
            </span>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Buyer/owner referrals and listing referrals are available for all properties across
            India.
          </p>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">
          Common questions
        </div>
        <h2 className="font-display text-3xl font-black text-navy sm:text-4xl">
          Frequently asked questions
        </h2>
        <div className="mt-8 rounded-2xl border border-border bg-white px-6">
          {FAQS.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* ── T&C summary ───────────────────────────────────────────── */}
      <section className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Programme Terms &amp; Conditions
          </div>
          <ul className="space-y-2">
            {[
              "Referral rewards are valid only for new, unregistered users or unlisted properties.",
              "Rewards are non-transferable, non-encashable at face value (except via the listed payout methods), and have no cash value outside the NxtSft Wallet.",
              "Referred properties must not already be listed on NxtSft.com or have been submitted within the last 90 days.",
              "Board photo submissions must include a clear, legible photograph and a verifiable street address.",
              "Self-referrals and referrals to existing accounts are not eligible.",
              "NxtSft.com reserves the right to modify, suspend, or terminate this programme at any time.",
              "Misuse of the referral programme — including submission of fake leads, fabricated photos, or duplicate entries — will result in account suspension and forfeiture of all earned rewards.",
              "All disputes are subject to the governing law and arbitration clause in the NxtSft.com Terms of Use.",
            ].map((t, i) => (
              <li key={i} className="flex gap-2.5 text-xs text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────── */}
      {!session && (
        <section
          className="relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563EB 100%)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative z-10 mx-auto max-w-3xl px-6 py-20 text-center">
            <div className="font-display text-3xl font-black text-white sm:text-4xl">
              Start earning today.
              <br />
              It&apos;s completely free.
            </div>
            <p className="mt-4 text-white/70">
              Create your account in 60 seconds and start sharing your referral link.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-display text-sm font-bold text-navy shadow-lg transition hover:shadow-xl"
              >
                Create free account <ArrowRight size={15} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Already have an account?
              </Link>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
