"use client";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { SafeImage } from "@/components/ui/SafeImage";
import { StatCard, Section } from "@/components/portal/PortalShell";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { type FeaturedProp, fmtPrice } from "@/components/home/homeData";
import { DEMO_USER, greeting, todayLabel } from "./shared";

export function OverviewDashboard() {
  const { session, credits } = useAuth();
  const displayName = session?.name ?? DEMO_USER.name;
  const favoritesQ = trpc.users.favorites.useQuery(undefined, { enabled: !!session });
  const visitsQ = trpc.users.siteVisits.useQuery(undefined, { enabled: !!session });
  const unlocksUsedQ = trpc.users.contactUnlocksUsed.useQuery(undefined, { enabled: !!session });
  const featuredQ = trpc.properties.list.useQuery({ featured: true, limit: 3 });

  const saved = (favoritesQ.data ?? []) as unknown as FeaturedProp[];
  const featured = (featuredQ.data?.items ?? []) as unknown as FeaturedProp[];
  const visits = visitsQ.data ?? [];

  const fmtVisitDate = (iso: string | Date) =>
    new Date(iso).toLocaleString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });

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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Saved Properties"
          value={favoritesQ.data ? String(favoritesQ.data.length) : "—"}
          sub="from your shortlist"
        />
        {/* Same-page hash tab: Next's Link navigates via pushState, which fires
            neither hashchange nor popstate, so useActiveHash would never update.
            Set the hash directly, exactly as PortalShell's sidebar nav does. */}
        <a
          href="/user-portal#credits"
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = "credits";
          }}
          className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <StatCard
            label="Contact Unlocks Used"
            value={unlocksUsedQ.data !== undefined ? String(unlocksUsedQ.data) : "—"}
            sub="view unlocked contacts →"
          />
        </a>
        <StatCard
          label="Credits Remaining"
          value={String(credits)}
          sub={credits === 0 ? "Top up now" : "ready to unlock"}
          accent={credits === 0 ? "text-accent" : "text-emerald-600"}
        />
        <StatCard
          label="Scheduled Tours"
          value={visitsQ.data ? String(visitsQ.data.length) : "—"}
          sub="scheduled or completed"
        />
      </div>

      {/* Saved properties */}
      <Section
        title="Your saved properties"
        action={
          <Link href="/user-portal#saved" className="text-xs font-semibold text-accent">
            View all →
          </Link>
        }
      >
        {favoritesQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : saved.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t shortlisted any properties yet.{" "}
            <Link href="/properties" className="font-semibold text-accent">
              Browse properties →
            </Link>
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {saved.slice(0, 3).map((p) => (
              <Link
                key={p.id}
                href={`/properties/${p.slug}`}
                className="group flex items-center gap-3 rounded-lg border border-border bg-white p-3 hover:border-accent/40 transition-colors"
              >
                <SafeImage
                  src={p.images[0]}
                  alt=""
                  width={64}
                  height={48}
                  className="flex-shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-navy group-hover:text-accent">
                    {p.title}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {p.location?.locality}
                    {p.location?.city ? `, ${p.location.city}` : ""}
                  </div>
                  <div className="mt-0.5 font-display text-xs font-bold text-accent">
                    {fmtPrice(p.price)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Recommended / featured */}
      <Section
        title="Recommended for you"
        action={
          <Link href="/properties" className="text-xs font-semibold text-accent">
            Browse more →
          </Link>
        }
      >
        {featuredQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : featured.length === 0 ? (
          <p className="text-sm text-muted-foreground">No featured properties right now.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <Link
                key={p.id}
                href={`/properties/${p.slug}`}
                className="group overflow-hidden rounded-lg border border-border bg-white"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <SafeImage
                    src={p.images[0]}
                    alt=""
                    fill
                    className="object-cover transition group-hover:scale-110"
                  />
                </div>
                <div className="p-3">
                  <div className="text-xs text-muted-foreground">
                    {p.location?.locality}
                    {p.bhk ? ` · ${p.bhk}` : ""}
                  </div>
                  <div className="text-sm font-semibold text-navy truncate">{p.title}</div>
                  <div className="mt-1 font-display text-base font-bold text-accent">
                    {fmtPrice(p.price)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Upcoming site visits */}
      <Section title="Upcoming site visits">
        {visitsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : visits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No site visits scheduled. Book a visit from any property page.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {visits.slice(0, 4).map((v) => (
              <div
                key={v.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-4"
              >
                <Calendar size={16} className="mt-0.5 flex-shrink-0 text-accent" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-navy">
                    {v.property?.title ?? "Property"}
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtVisitDate(v.scheduledAt)}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {v.status}
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
