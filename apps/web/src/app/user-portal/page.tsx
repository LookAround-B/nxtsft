"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Heart,
  Building2,
  Calendar,
  Search,
  Calculator,
  FileCheck,
  Settings2,
  CreditCard,
  Eye,
  Bell,
  Clock,
  X,
  Plus,
  Pause,
  Play,
  Download,
  ChevronDown,
} from "lucide-react";
import { Home as HomeIcon, CheckCircle, XCircle } from "lucide-react";
import { PortalShell, StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { useActiveHash } from "@/lib/use-active-hash";
import { useAuth } from "@/lib/auth";
import {
  properties,
  subscriptions,
  unlockedContacts,
  walletLedger,
  disputes,
  seekerPlans,
  propertyViews,
} from "@/data/static";

/* ─── Demo user fallback (used only when no session exists) ─── */
const DEMO_USER = {
  name: "Ananya Rao",
  email: "ananya@example.com",
  initials: "AR",
  phone: "+91 98xxx 77001",
  city: "Mumbai",
};

/* ─── Navigation ─────────────────────────────────────────────── */
const nav = [
  { label: "Overview", to: "/user-portal", icon: <HomeIcon size={14} /> },
  { label: "Saved", to: "/user-portal#saved", icon: <Heart size={14} /> },
  { label: "Recently Viewed", to: "/user-portal#viewed", icon: <Eye size={14} /> },
  { label: "My Credits", to: "/user-portal#credits", icon: <CreditCard size={14} /> },
  { label: "Profile", to: "/user-portal#profile", icon: <Settings2 size={14} /> },
  { label: "Search Alerts", to: "/user-portal#alerts", icon: <Bell size={14} /> },
  { label: "My Listings", to: "/user-portal#mylist", icon: <Building2 size={14} /> },
  { label: "Site Visits", to: "/user-portal#visits", icon: <Calendar size={14} /> },
  { label: "EMI Calculator", to: "/user-portal#emi", icon: <Calculator size={14} /> },
  { label: "Documents (KYC)", to: "/user-portal#kyc", icon: <FileCheck size={14} /> },
  { label: "Saved Searches", to: "/user-portal#search", icon: <Search size={14} /> },
];

/* ─── Root ───────────────────────────────────────────────────── */
export default function UserPortal() {
  const { session } = useAuth();
  const router = useRouter();
  const h = useActiveHash();

  useEffect(() => {
    if (!session) router.push("/login");
  }, [session, router]);

  if (!session) return null;

  const displayUser = { name: session.name, initials: session.initials };
  return (
    <PortalShell
      brand="NxtSft.com Home"
      role="End User"
      accent="red"
      user={displayUser}
      nav={nav}
      basePath="/user-portal"
    >
      {renderTab(h, session.email)}
    </PortalShell>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */
const Head = ({ t, s }: { t: string; s?: string }) => (
  <div className="mb-6">
    <h2 className="font-display text-2xl font-bold text-navy">{t}</h2>
    {s && <p className="mt-1 text-sm text-muted-foreground">{s}</p>}
  </div>
);

const fmtDur = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ─── Tab router ─────────────────────────────────────────────── */
function renderTab(h: string, userEmail: string) {
  switch (h) {
    case "saved":
      return <Saved />;
    case "mylist":
      return <MyListings />;
    case "credits":
      return <Credits />;
    case "viewed":
      return <RecentlyViewed />;
    case "visits":
      return <Visits />;
    case "search":
      return <Searches />;
    case "emi":
      return <EMI />;
    case "kyc":
      return <KYC />;
    case "profile":
      return <Profile />;
    case "alerts":
      return <SearchAlerts />;
    default:
      return <HomeDash userEmail={userEmail} />;
  }
}

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW / HOME DASHBOARD
═══════════════════════════════════════════════════════════════ */
function HomeDash({ userEmail }: { userEmail: string }) {
  const { session } = useAuth();
  const displayName = session?.name ?? DEMO_USER.name;
  const myViews = propertyViews
    .filter((v) => v.userEmail === userEmail || v.userEmail === "rohan@example.com")
    .sort((a, b) => b.ts.localeCompare(a.ts));

  const featuredProps = properties.filter((p) => p.featured).slice(0, 3);

  const dummyVisits = [
    { property: "Skyline Residences", date: "Sat, 14 Jun · 11:00 AM", agent: "Priya Sharma" },
    { property: "Marina Heights", date: "Sun, 15 Jun · 3:30 PM", agent: "Karan Joshi" },
  ];

  return (
    <>
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-navy">
          {greeting()}, {displayName.split(" ")[0]}!
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{todayLabel()}</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Saved Properties" value="12" sub="3 new this week" />
        <StatCard label="Contact Unlocks Used" value="2" sub="of 6 in plan" />
        <StatCard
          label="Credits Remaining"
          value="4"
          sub="Standard Pack"
          accent="text-emerald-600"
        />
        <StatCard label="Site Visits Scheduled" value="2" sub="Next: Sat 11am" />
      </div>

      {/* Continue where you left off */}
      <Section title="Continue where you left off">
        {myViews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {myViews.slice(0, 3).map((v) => {
              const prop = properties.find((p) => p.id === v.propertyId);
              return (
                <Link
                  key={v.id}
                  href={`/properties/${v.propertyId}`}
                  className="group flex items-center gap-3 rounded-lg border border-border bg-white p-3 hover:border-accent/40 transition-colors"
                >
                  {prop && (
                    <img
                      src={prop.image}
                      alt=""
                      className="h-12 w-16 flex-shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-navy group-hover:text-accent">
                      {v.propertyTitle}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock size={9} />
                      {fmtDur(v.durationSec)} · {v.city}
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] text-muted-foreground/70">
                      {v.ts.split(" ")[0]}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      {/* Recommended for you */}
      <Section
        title="Recommended for you"
        action={
          <Link href="/properties" className="text-xs font-semibold text-accent">
            Browse more →
          </Link>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProps.map((p) => (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="group overflow-hidden rounded-lg border border-border bg-white"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={p.image}
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-110"
                />
                <span className="absolute right-2 top-2 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                  {p.matchScore}% match
                </span>
              </div>
              <div className="p-3">
                <div className="text-xs text-muted-foreground">
                  {p.locality} · {p.bhk}
                </div>
                <div className="text-sm font-semibold text-navy truncate">{p.title}</div>
                <div className="mt-1 font-display text-base font-bold text-accent">
                  {p.priceLabel}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Upcoming site visits */}
      <Section title="Upcoming site visits">
        <div className="grid gap-3 sm:grid-cols-2">
          {dummyVisits.map((v) => (
            <div
              key={v.property}
              className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-4"
            >
              <Calendar size={16} className="mt-0.5 flex-shrink-0 text-accent" />
              <div>
                <div className="text-sm font-semibold text-navy">{v.property}</div>
                <div className="text-xs text-muted-foreground">{v.date}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">with {v.agent}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SAVED PROPERTIES
═══════════════════════════════════════════════════════════════ */
function Saved() {
  const [items, setItems] = useState(properties.slice(0, 6));
  const [sortBy, setSortBy] = useState<"price" | "date" | "match">("match");
  const [filterBhk, setFilterBhk] = useState("");
  const [filterCity, setFilterCity] = useState("");

  const bhkOptions = [...new Set(properties.map((p) => p.bhk))];
  const cityOptions = [...new Set(properties.map((p) => p.city))];

  const sorted = [...items].sort((a, b) => {
    if (sortBy === "price") return a.price - b.price;
    if (sortBy === "match") return b.matchScore - a.matchScore;
    return 0; // date: preserve insertion order
  });

  const filtered = sorted.filter((p) => {
    if (filterBhk && p.bhk !== filterBhk) return false;
    if (filterCity && p.city !== filterCity) return false;
    return true;
  });

  return (
    <>
      <Head t="Saved Properties" s={`${items.length} homes saved.`} />

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Sort:</span>
          {(["match", "price", "date"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${sortBy === s ? "bg-accent text-accent-foreground" : "border border-border hover:border-accent/50"}`}
            >
              {s === "match" ? "Match Score" : s === "price" ? "Price" : "Date Added"}
            </button>
          ))}
        </div>
        {/* Filter BHK */}
        <select
          value={filterBhk}
          onChange={(e) => setFilterBhk(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-1 text-xs"
        >
          <option value="">All BHK</option>
          {bhkOptions.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        {/* Filter City */}
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-1 text-xs"
        >
          <option value="">All Cities</option>
          {cityOptions.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {(filterBhk || filterCity) && (
          <button
            onClick={() => {
              setFilterBhk("");
              setFilterCity("");
            }}
            className="flex items-center gap-1 text-xs text-accent"
          >
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 py-16 text-center">
          <Heart size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-muted-foreground">
            No saved properties match your filters.
          </p>
          <button
            onClick={() => {
              setFilterBhk("");
              setFilterCity("");
            }}
            className="mt-2 text-xs text-accent hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-lg border border-border bg-white">
              <div className="relative">
                <Link href={`/properties/${p.id}`}>
                  <img src={p.image} alt="" className="aspect-[4/3] w-full object-cover" />
                </Link>
                <span className="absolute right-2 top-2 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                  {p.matchScore}%
                </span>
              </div>
              <div className="p-3">
                <div className="text-xs text-muted-foreground">
                  {p.locality} · {p.bhk} · {p.city}
                </div>
                <div className="text-sm font-semibold text-navy">{p.title}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-display text-base font-bold text-accent">
                    {p.priceLabel}
                  </span>
                  <button
                    onClick={() => {
                      setItems((arr) => arr.filter((x) => x.id !== p.id));
                      toast(`Removed ${p.title.split("—")[0].trim()}`);
                    }}
                    className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                  >
                    <X size={11} /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MY LISTINGS
═══════════════════════════════════════════════════════════════ */
function MyListings() {
  return (
    <>
      <Head t="My Listings" s="What you've put on the market." />
      <Section
        title="Active"
        action={
          <button
            onClick={() => toast.success("New listing draft created")}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
          >
            + Post Another
          </button>
        }
      >
        <div className="overflow-hidden rounded-lg border border-border">
          <img src={properties[2].image} alt="" className="h-40 w-full object-cover" />
          <div className="p-4">
            <div className="text-sm font-semibold text-navy">My 1 BHK Koregaon Park</div>
            <div className="text-xs text-muted-foreground">Posted 12 days ago</div>
            <div className="mt-2 flex gap-2">
              <Badge tone="success">Active</Badge>
              <Badge tone="new">142 views</Badge>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => toast.success("Listing boosted")}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
              >
                Boost
              </button>
              <button
                onClick={() => toast("Edit mode")}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RECENTLY VIEWED
═══════════════════════════════════════════════════════════════ */
function RecentlyViewed() {
  const [history, setHistory] = useState(
    [...propertyViews].sort((a, b) => b.ts.localeCompare(a.ts)),
  );

  const unlocked = history.filter((v) => v.contactUnlocked).length;
  const avgSec = Math.round(history.reduce((a, v) => a + v.durationSec, 0) / (history.length || 1));
  const uniqueCities = new Set(history.map((v) => v.city)).size;
  const totalSec = history.reduce((a, v) => a + v.durationSec, 0);
  const totalMinutes = Math.round(totalSec / 60);

  return (
    <>
      <Head t="Recently Viewed" s={`${history.length} properties checked in the last 30 days.`} />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Properties Viewed" value={String(history.length)} sub="Last 30 days" />
        <StatCard
          label="Contacts Unlocked"
          value={String(unlocked)}
          sub={`of ${history.length} views`}
        />
        <StatCard label="Avg. Time on Page" value={fmtDur(avgSec)} sub="Per property visit" />
        <StatCard label="Cities Explored" value={String(uniqueCities)} sub="Unique locations" />
      </div>

      {/* Time spent metric */}
      <div className="mt-4 mb-2 flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock size={14} className="text-accent" />
          <span className="font-semibold text-navy">Total time browsing:</span>
          <span className="font-mono text-sm text-accent font-bold">{totalMinutes} min</span>
          <span className="text-xs text-muted-foreground">across all viewed properties</span>
        </div>
        <button
          onClick={() => {
            setHistory([]);
            toast("History cleared");
          }}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-accent hover:text-accent transition-colors"
        >
          <X size={12} /> Clear History
        </button>
      </div>

      <Section title="View History">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No properties viewed yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {history.map((v) => {
              const prop = properties.find((p) => p.id === v.propertyId);
              return (
                <div key={v.id} className="flex items-center gap-4 py-4">
                  {prop && (
                    <img
                      src={prop.image}
                      alt={prop.title}
                      className="h-14 w-20 flex-shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-navy truncate">{v.propertyTitle}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{v.city}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {fmtDur(v.durationSec)} spent
                      </span>
                      <span className="font-mono">{v.ts}</span>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-2">
                    {v.contactUnlocked && <Badge tone="success">Contact Unlocked</Badge>}
                    <Link
                      href={`/properties/${v.propertyId}`}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MY CREDITS
═══════════════════════════════════════════════════════════════ */
const mySubscription = subscriptions[0];
const myUnlocks = unlockedContacts.filter((u) => u.subId === mySubscription.id);
const myLedger = walletLedger;
const myDisputes = disputes;

// Static credit usage timeline (last 5 unlock events)
const creditTimeline = [
  { date: "2026-05-18", action: "Unlocked Marina Heights contact", tokens: -1 },
  { date: "2026-05-16", action: "Unlocked Skyline Residences contact", tokens: -1 },
  { date: "2026-05-19", action: "Refund: Dispute resolved (Marina)", tokens: +1 },
  { date: "2026-05-15", action: "Standard Pack purchased", tokens: +6 },
  { date: "2026-05-10", action: "Trial credits granted (signup bonus)", tokens: +1 },
];

function Credits() {
  const [unlocks, setUnlocks] = useState(myUnlocks.map((u) => ({ ...u })));
  const [showTopUp, setShowTopUp] = useState(false);
  const activePlan = seekerPlans.find((p) => p.name === mySubscription.plan)!;

  const toggleClosed = (id: string) => {
    setUnlocks((prev) => prev.map((u) => (u.id === id ? { ...u, closed: !u.closed } : u)));
    toast.success("Closure status updated");
  };

  const fileDispute = (property: string) => {
    toast.success(
      `Dispute filed for "${property}". Token refund will be reviewed within 48 hours.`,
    );
  };

  const disputedUnlockIds = new Set(myDisputes.map((d) => d.id));

  return (
    <>
      <Head t="My Credits" s="Subscription status and unlock history." />

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Active Plan"
          value={mySubscription.plan}
          sub={`Valid 30 days · ${activePlan.priceLabel}`}
        />
        <StatCard
          label="Tokens Remaining"
          value={String(mySubscription.creditsLeft)}
          sub={`of ${mySubscription.creditsTotal} total`}
          accent={mySubscription.creditsLeft === 0 ? "text-accent" : "text-emerald-600"}
        />
        <StatCard
          label="Contacts Unlocked"
          value={String(mySubscription.creditsUsed)}
          sub={`${unlocks.filter((u) => u.closed).length} closed`}
        />
        <StatCard
          label="Disputes Filed"
          value={String(myDisputes.length)}
          sub={`${myDisputes.filter((d) => d.status === "Resolved").length} resolved`}
        />
      </div>

      {/* Plan usage */}
      <Section title="Plan Usage">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold text-navy">{mySubscription.plan}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {mySubscription.creditsUsed} / {mySubscription.creditsTotal} used
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-secondary">
          <div
            className="h-3 rounded-full bg-accent transition-all"
            style={{
              width: `${(mySubscription.creditsUsed / mySubscription.creditsTotal) * 100}%`,
            }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Purchased {mySubscription.date} · expires in 18 days
          </span>
          <button
            onClick={() => setShowTopUp(true)}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
          >
            <Plus size={12} /> Top Up Credits
          </button>
        </div>
      </Section>

      {/* Top Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-navy">Top Up Credits</h3>
              <button
                onClick={() => setShowTopUp(false)}
                className="rounded-md p-1 hover:bg-secondary"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {seekerPlans.slice(0, 3).map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => {
                    setShowTopUp(false);
                    toast.success(`${plan.name} purchased!`);
                  }}
                  className="rounded-xl border-2 border-border p-4 text-left hover:border-accent transition-colors"
                >
                  <div className="font-display text-lg font-bold text-navy">{plan.priceLabel}</div>
                  <div className="mt-0.5 text-xs font-semibold text-accent">
                    {plan.credits} credits
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{plan.name}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    Valid {plan.validity}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Credit Usage Timeline */}
      <Section title="Credit Usage Timeline">
        <div className="relative pl-5">
          {/* Vertical line */}
          <div className="absolute left-1.5 top-0 h-full w-px bg-border" />
          <div className="space-y-5">
            {creditTimeline.map((entry, i) => (
              <div key={i} className="relative flex items-start gap-3">
                {/* Dot */}
                <div
                  className={`absolute -left-[15px] mt-0.5 h-3 w-3 rounded-full border-2 border-white ${entry.tokens > 0 ? "bg-emerald-500" : "bg-accent"}`}
                />
                <div>
                  <div className="text-sm font-medium text-navy">{entry.action}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{entry.date}</span>
                    <span
                      className={`font-bold ${entry.tokens > 0 ? "text-emerald-600" : "text-accent"}`}
                    >
                      {entry.tokens > 0 ? `+${entry.tokens}` : `${entry.tokens}`} token
                      {Math.abs(entry.tokens) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Token Ledger */}
      <Section title="Token Ledger">
        {myLedger.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ledger entries yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {myLedger.map((entry) => {
              const isCredit = entry.type === "credit";
              const isRefund = entry.type === "refund";
              const badgeClass = isCredit
                ? "bg-emerald-100 text-emerald-700"
                : isRefund
                  ? "bg-blue-100 text-blue-700"
                  : "bg-accent/10 text-accent";
              const badgeLabel = isCredit ? "Credit" : isRefund ? "Refund" : "Debit";
              return (
                <div key={entry.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-navy truncate">
                      {entry.description}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      {entry.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}
                    >
                      {badgeLabel}
                    </span>
                    <span
                      className={`font-mono text-sm font-bold ${isCredit || isRefund ? "text-emerald-600" : "text-accent"}`}
                    >
                      {isCredit || isRefund ? `+${entry.amount}` : `-${entry.amount}`} token
                      {entry.amount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Unlocked Contacts */}
      <Section title="Unlocked Contacts">
        {unlocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No contacts unlocked yet. Browse properties and unlock a contact to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {unlocks.map((u) => {
              const alreadyDisputed = disputedUnlockIds.has(u.id);
              return (
                <div key={u.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-navy truncate">{u.property}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Owner: {u.owner} · {u.phone}
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                        Unlocked {u.unlockedAt}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge tone={u.closed ? "success" : "warm"}>
                        {u.closed ? "Closed" : "Active"}
                      </Badge>
                      <button
                        onClick={() => toggleClosed(u.id)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                      >
                        {u.closed ? (
                          <>
                            <XCircle size={12} /> Mark open
                          </>
                        ) : (
                          <>
                            <CheckCircle size={12} /> Mark closed
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {!u.closed && (
                    <div className="mt-3 border-t border-border pt-3">
                      {alreadyDisputed ? (
                        <span className="text-[11px] text-blue-600 font-semibold">
                          Dispute already filed for this contact.
                        </span>
                      ) : (
                        <button
                          onClick={() => fileDispute(u.property)}
                          className="text-[11px] font-semibold text-muted-foreground hover:text-accent underline underline-offset-2 transition-colors"
                        >
                          File dispute for token refund
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROFILE
═══════════════════════════════════════════════════════════════ */
function Profile() {
  const { session, updateProfile } = useAuth();
  const [name, setName] = useState(session?.name ?? DEMO_USER.name);
  const [phone, setPhone] = useState(session?.phone ?? DEMO_USER.phone);
  const [city, setCity] = useState(DEMO_USER.city);
  const [budget, setBudget] = useState("₹50L – ₹1.5Cr");
  const [propType, setPropType] = useState("Apartment");
  const [timeline, setTimeline] = useState("3–6 months");

  // Email preferences
  const [emailNewMatches, setEmailNewMatches] = useState(true);
  const [emailPriceDrops, setEmailPriceDrops] = useState(true);
  const [emailVisitRemind, setEmailVisitRemind] = useState(false);

  // Notification preferences
  const [notifNewMatches, setNotifNewMatches] = useState(true);
  const [notifPriceDrops, setNotifPriceDrops] = useState(false);
  const [notifVisitRemind, setNotifVisitRemind] = useState(true);

  // Change password
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confPwd, setConfPwd] = useState("");

  const handleDownloadCSV = () => {
    const myViews = propertyViews.filter(
      (v) => v.userEmail === (session?.email ?? DEMO_USER.email),
    );
    const header = ["ID", "Property", "City", "Date", "Duration (sec)", "Contact Unlocked"];
    const rows = myViews.map((v) => [
      v.id,
      `"${v.propertyTitle}"`,
      v.city,
      v.ts,
      v.durationSec,
      v.contactUnlocked,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nxtsft-my-data.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const Toggle = ({
    on,
    onChange,
    label,
  }: {
    on: boolean;
    onChange: (v: boolean) => void;
    label: string;
  }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-navy">{label}</span>
      <button
        onClick={() => onChange(!on)}
        className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-accent" : "bg-secondary"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );

  return (
    <>
      <Head t="Profile" s="Manage your account details and preferences." />

      {/* Basic Info */}
      <Section title="Personal Information">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Full Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
            <input
              value={session?.email ?? DEMO_USER.email}
              readOnly
              className="mt-1 w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            >
              {["Mumbai", "Bengaluru", "Pune", "Delhi", "Hyderabad", "Chennai"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => {
            updateProfile(
              name.trim() || (session?.name ?? DEMO_USER.name),
              phone.trim() || (session?.phone ?? DEMO_USER.phone),
            );
            toast.success("Profile updated");
          }}
          className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Save Changes
        </button>
      </Section>

      {/* Property Preferences */}
      <Section title="Property Preferences">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Budget Range
            </label>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            >
              {["Under ₹50L", "₹50L – ₹1.5Cr", "₹1.5Cr – ₹3Cr", "₹3Cr – ₹6Cr", "₹6Cr+"].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Preferred Type
            </label>
            <select
              value={propType}
              onChange={(e) => setPropType(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            >
              {["Apartment", "Villa", "Studio", "Bungalow", "Commercial"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Buy Timeline
            </label>
            <select
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            >
              {["Immediately", "1–3 months", "3–6 months", "6–12 months", "Just exploring"].map(
                (t) => (
                  <option key={t}>{t}</option>
                ),
              )}
            </select>
          </div>
        </div>
        <button
          onClick={() => toast.success("Preferences saved")}
          className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Save Preferences
        </button>
      </Section>

      {/* Email Preferences */}
      <Section title="Email Preferences">
        <Toggle on={emailNewMatches} onChange={setEmailNewMatches} label="New property matches" />
        <Toggle on={emailPriceDrops} onChange={setEmailPriceDrops} label="Price drop alerts" />
        <Toggle on={emailVisitRemind} onChange={setEmailVisitRemind} label="Site visit reminders" />
      </Section>

      {/* Notification Preferences */}
      <Section title="Notification Preferences">
        <Toggle on={notifNewMatches} onChange={setNotifNewMatches} label="New matches" />
        <Toggle on={notifPriceDrops} onChange={setNotifPriceDrops} label="Price drops" />
        <Toggle on={notifVisitRemind} onChange={setNotifVisitRemind} label="Site visit reminders" />
      </Section>

      {/* Change Password */}
      <Section title="Change Password">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Current Password
            </label>
            <input
              type="password"
              value={curPwd}
              onChange={(e) => setCurPwd(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              New Password
            </label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Confirm Password
            </label>
            <input
              type="password"
              value={confPwd}
              onChange={(e) => setConfPwd(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          onClick={() => {
            if (!curPwd || !newPwd || !confPwd) {
              toast.error("Fill all fields");
              return;
            }
            if (newPwd !== confPwd) {
              toast.error("Passwords do not match");
              return;
            }
            toast.success("Password updated");
            setCurPwd("");
            setNewPwd("");
            setConfPwd("");
          }}
          className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Update Password
        </button>
      </Section>

      {/* Download data */}
      <Section title="Data & Privacy">
        <p className="mb-3 text-sm text-muted-foreground">
          Download a CSV of all properties you have viewed on NxtSft.com Home.
        </p>
        <button
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent transition-colors"
        >
          <Download size={14} /> Download my data
        </button>
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SEARCH ALERTS  (NEW TAB)
═══════════════════════════════════════════════════════════════ */
const demoAlerts = [
  {
    id: "alert-1",
    name: "3 BHK in Bandra under ₹4 Cr",
    location: "Bandra West, Mumbai",
    bhk: "3 BHK",
    budget: "Up to ₹4 Cr",
    lastMatchCount: 8,
    active: true,
  },
  {
    id: "alert-2",
    name: "Villas in Whitefield",
    location: "Whitefield, Bengaluru",
    bhk: "4 BHK",
    budget: "₹3 Cr – ₹6 Cr",
    lastMatchCount: 3,
    active: true,
  },
  {
    id: "alert-3",
    name: "Rentals in Pune under ₹40K",
    location: "Koregaon Park, Pune",
    bhk: "1–2 BHK",
    budget: "Up to ₹40,000/mo",
    lastMatchCount: 14,
    active: false,
  },
];

function SearchAlerts() {
  const [alerts, setAlerts] = useState(demoAlerts);

  const toggleAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
    const alert = alerts.find((a) => a.id === id);
    if (alert) toast(alert.active ? `Alert paused: ${alert.name}` : `Alert resumed: ${alert.name}`);
  };

  const removeAlert = (id: string) => {
    const alert = alerts.find((a) => a.id === id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (alert) toast(`Alert removed: ${alert.name}`);
  };

  return (
    <>
      <Head t="Search Alerts" s="Get notified when new properties match your saved searches." />

      <Section
        title="Your Saved Searches"
        action={
          <button
            onClick={() => toast.success("New alert created (demo)")}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
          >
            <Plus size={12} /> New Alert
          </button>
        }
      >
        {alerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/20 py-14 text-center">
            <Bell size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No search alerts yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border p-4 transition-colors ${a.active ? "border-border bg-white" : "border-border bg-secondary/20"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-navy">{a.name}</span>
                      {!a.active && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          Paused
                        </span>
                      )}
                    </div>
                    {/* Criteria */}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {a.location}
                      </span>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {a.bhk}
                      </span>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {a.budget}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-accent">{a.lastMatchCount}</span>{" "}
                      properties matched in the last check
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      onClick={() => toggleAlert(a.id)}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        a.active
                          ? "border border-border text-muted-foreground hover:border-accent hover:text-accent"
                          : "bg-accent text-accent-foreground"
                      }`}
                    >
                      {a.active ? (
                        <>
                          <Pause size={12} /> Pause
                        </>
                      ) : (
                        <>
                          <Play size={12} /> Resume
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => removeAlert(a.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:text-accent transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SITE VISITS
═══════════════════════════════════════════════════════════════ */
function Visits() {
  return (
    <>
      <Head t="Site Visits" s="Tours you've booked." />
      <Section title="Upcoming">
        <div className="space-y-3">
          {[
            {
              property: "Skyline Residences",
              when: "Sat, 14 Jun · 11:00 AM",
              agent: "Priya Sharma",
            },
            { property: "Marina Heights", when: "Sun, 15 Jun · 3:30 PM", agent: "Karan Joshi" },
          ].map((v) => (
            <div key={v.property} className="rounded-lg border border-border bg-secondary/40 p-4">
              <div className="font-display text-sm font-bold text-navy">{v.property}</div>
              <div className="text-xs text-muted-foreground">
                {v.when} · with {v.agent}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => toast.success("Visit rescheduled")}
                  className="rounded-md bg-mid-blue px-3 py-1 text-xs font-semibold text-white"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => toast.error("Visit cancelled")}
                  className="rounded-md border border-border px-3 py-1 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SAVED SEARCHES  (legacy tab)
═══════════════════════════════════════════════════════════════ */
function Searches() {
  const saved = [
    { name: "3 BHK in Bandra under ₹4 Cr", new: 3 },
    { name: "Villas in Whitefield", new: 1 },
    { name: "Rentals in Pune under ₹40K", new: 7 },
  ];
  return (
    <>
      <Head t="Saved Searches" s="We'll ping you when new homes match." />
      <Section title="Your alerts">
        {saved.map((s) => (
          <div
            key={s.name}
            className="flex items-center justify-between border-b border-border py-3 last:border-0"
          >
            <div>
              <div className="font-semibold text-navy">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.new} new this week</div>
            </div>
            <button
              onClick={() => toast("Alert deleted")}
              className="text-xs font-semibold text-accent"
            >
              Remove
            </button>
          </div>
        ))}
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EMI CALCULATOR
═══════════════════════════════════════════════════════════════ */
function EMI() {
  const [P, setP] = useState(25000000);
  const [r, setR] = useState(8.6);
  const [n, setN] = useState(20);
  const monthly =
    (P * (r / 1200) * Math.pow(1 + r / 1200, n * 12)) / (Math.pow(1 + r / 1200, n * 12) - 1);
  return (
    <>
      <Head t="EMI Calculator" s="Estimate your monthly payment." />
      <Section title="Inputs">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Loan Amount (₹)
            </label>
            <input
              type="number"
              value={P}
              onChange={(e) => setP(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Interest %
            </label>
            <input
              type="number"
              step="0.1"
              value={r}
              onChange={(e) => setR(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Tenure (yrs)
            </label>
            <input
              type="number"
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-5 rounded-lg bg-navy p-5 text-white">
          <div className="text-xs uppercase tracking-widest text-white/60">Estimated EMI</div>
          <div className="mt-1 font-display text-4xl font-bold text-gold">
            ₹ {Math.round(monthly).toLocaleString("en-IN")}{" "}
            <span className="text-sm text-white/50">/month</span>
          </div>
        </div>
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DOCUMENTS / KYC
═══════════════════════════════════════════════════════════════ */
function KYC() {
  return (
    <>
      <Head t="Documents (KYC)" s="Verify once, transact faster." />
      <Section title="Status">
        {(
          [
            ["Aadhaar", "Verified", "success"],
            ["PAN Card", "Verified", "success"],
            ["Income Proof", "Pending", "warm"],
          ] as const
        ).map(([d, s, t]) => (
          <div
            key={d}
            className="flex items-center justify-between border-b border-border py-3 last:border-0"
          >
            <span className="text-sm">{d}</span>
            <div className="flex items-center gap-2">
              <Badge tone={t}>{s}</Badge>
              {s === "Pending" && (
                <button
                  onClick={() => toast.success("Document uploaded")}
                  className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
                >
                  Upload
                </button>
              )}
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}
