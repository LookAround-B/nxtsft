"use client";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock } from "lucide-react";
import { StatCard, Section } from "@/components/portal/PortalShell";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { properties, propertyViews } from "@/data/static";
import { DEMO_USER, greeting, todayLabel, fmtDur } from "./shared";

export function OverviewDashboard({ userEmail }: { userEmail: string }) {
  const { session, credits } = useAuth();
  const displayName = session?.name ?? DEMO_USER.name;
  const favoritesQ = trpc.users.favorites.useQuery(undefined, { enabled: !!session });
  const visitsQ = trpc.users.siteVisits.useQuery(undefined, { enabled: !!session });
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
        <StatCard
          label="Saved Properties"
          value={favoritesQ.data ? String(favoritesQ.data.length) : "—"}
          sub="from your shortlist"
        />
        <StatCard label="Contact Unlocks Used" value="—" sub="see Credits tab" />
        <StatCard
          label="Credits Remaining"
          value={String(credits)}
          sub={credits === 0 ? "Top up now" : "ready to unlock"}
          accent={credits === 0 ? "text-accent" : "text-emerald-600"}
        />
        <StatCard
          label="Site Visits Booked"
          value={visitsQ.data ? String(visitsQ.data.length) : "—"}
          sub="scheduled or completed"
        />
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
                    <Image
                      src={prop.image}
                      alt=""
                      width={64}
                      height={48}
                      className="flex-shrink-0 rounded-md object-cover"
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
                <Image
                  src={p.image}
                  alt=""
                  fill
                  className="object-cover transition group-hover:scale-110"
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
