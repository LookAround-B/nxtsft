"use client";
import { useState } from "react";
import Link from "next/link";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { TabHeader } from "./shared";
import { trpc } from "@/lib/trpc";
import { UserPlus, LogIn, Eye, Flame, Building2, Search, Phone, type LucideIcon } from "lucide-react";

// The chairman's ask: super admin should see everything an end-user is doing —
// who signed up, who's logging in, who's listing, who's showing buying intent,
// and who's just browsing (not buying). Backed by superAdmin.activityStats /
// activityFeed, which classify real events by intent.

type WindowDays = 1 | 7 | 30;
const WINDOWS: Array<{ d: WindowDays; label: string }> = [
  { d: 1, label: "24h" },
  { d: 7, label: "7 days" },
  { d: 30, label: "30 days" },
];

type Kind = "signup" | "login" | "browsing" | "buying" | "listing";
type Filter = "all" | Kind;
const FILTERS: Array<{ k: Filter; label: string }> = [
  { k: "all", label: "All" },
  { k: "signup", label: "Signups" },
  { k: "login", label: "Logins" },
  { k: "browsing", label: "Browsing" },
  { k: "buying", label: "Buying intent" },
  { k: "listing", label: "Listings" },
];

const KIND_META: Record<
  Kind,
  { icon: LucideIcon; badge: string; tone: "new" | "default" | "cold" | "hot" | "warm" }
> = {
  signup: { icon: UserPlus, badge: "Signed up", tone: "new" },
  login: { icon: LogIn, badge: "Logged in", tone: "default" },
  browsing: { icon: Eye, badge: "Browsing", tone: "cold" },
  buying: { icon: Flame, badge: "Buying intent", tone: "hot" },
  listing: { icon: Building2, badge: "Listing", tone: "warm" },
};

const ICON_BG: Record<Kind, string> = {
  signup: "bg-mid-blue/10 text-mid-blue",
  login: "bg-secondary text-muted-foreground",
  browsing: "bg-slate-100 text-slate-500",
  buying: "bg-accent/10 text-accent",
  listing: "bg-amber-100 text-amber-700",
};

const ROLE_LABEL: Record<string, string> = {
  user: "Buyer",
  "home-seller": "Owner",
  agent: "Agent",
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function UserActivityTab() {
  const [windowDays, setWindowDays] = useState<WindowDays>(7);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  // Refetch on an interval so the monitor feels live.
  const statsQ = trpc.superAdmin.activityStats.useQuery(
    { windowDays },
    { refetchInterval: 30_000 },
  );
  const feedQ = trpc.superAdmin.activityFeed.useQuery(
    { windowDays, kind: filter, search: search.trim() || undefined, limit: 80 },
    { refetchInterval: 30_000 },
  );
  const s = statsQ.data;
  const items = feedQ.data?.items ?? [];

  return (
    <>
      <TabHeader
        title="User Activity"
        subtitle="Everything end-users are doing — signups, logins, browsing, buying intent and listings."
        action={
          <div className="flex items-center gap-1 rounded-full border border-border bg-white p-1">
            {WINDOWS.map((w) => (
              <button
                key={w.d}
                type="button"
                onClick={() => setWindowDays(w.d)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  windowDays === w.d ? "bg-navy text-white" : "text-muted-foreground hover:text-navy"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="New Signups" value={(s?.newSignups ?? 0).toLocaleString("en-IN")} sub="joined" />
        <StatCard label="Logged In" value={(s?.logins ?? 0).toLocaleString("en-IN")} sub="unique end-users" />
        <StatCard
          label="Just Browsing"
          value={(s?.browsing ?? 0).toLocaleString("en-IN")}
          sub="looking, no intent"
          accent="text-slate-500"
        />
        <StatCard
          label="Buying Intent"
          value={(s?.buyingIntent ?? 0).toLocaleString("en-IN")}
          sub="unlocked / enquired / visited"
          accent="text-accent"
        />
        <StatCard
          label="New Listings"
          value={(s?.newListings ?? 0).toLocaleString("en-IN")}
          sub="posted"
          accent="text-amber-600"
        />
      </div>

      <Section
        title="Live Activity Feed"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user…"
                className="h-8 w-40 rounded-full border border-border bg-white pl-8 pr-3 text-xs outline-none focus:border-accent"
              />
            </div>
          </div>
        }
      >
        {/* Kind filters */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.k}
              type="button"
              onClick={() => setFilter(f.k)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                filter === f.k
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:border-accent/40 hover:text-navy"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {feedQ.isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading activity…</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No end-user activity in this window.
          </div>
        ) : (
          <div className="-my-1">
            {items.map((ev) => {
              const meta = KIND_META[ev.kind as Kind];
              const Icon = meta.icon;
              return (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 border-b border-border py-3 last:border-0"
                >
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${ICON_BG[ev.kind as Kind]}`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-navy">
                        {ev.user?.name ?? "Unknown user"}
                      </span>
                      <Badge tone={meta.tone}>{meta.badge}</Badge>
                      {ev.user?.role && (
                        <span className="text-[11px] text-muted-foreground">
                          {ROLE_LABEL[ev.user.role] ?? ev.user.role}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {ev.action}
                      {ev.target && (
                        <>
                          {" — "}
                          <Link
                            href={`/properties/${ev.target.slug}`}
                            className="text-accent hover:underline"
                          >
                            {ev.target.title}
                          </Link>
                        </>
                      )}
                      {ev.meta && <span className="text-muted-foreground/70"> · {ev.meta}</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                      {ev.user?.phone && ev.user.phone !== "—" ? (
                        <a
                          href={`tel:${ev.user.phone}`}
                          className="flex items-center gap-1 font-bold text-accent hover:underline"
                        >
                          <Phone size={11} /> {ev.user.phone}
                        </a>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground/50">
                          <Phone size={11} /> no phone
                        </span>
                      )}
                      {ev.user?.email && (
                        <span className="truncate text-muted-foreground/60">{ev.user.email}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    {timeAgo(ev.at)}
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
