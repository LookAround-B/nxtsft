"use client";
import Link from "next/link";
import Image from "next/image";
import { Clock, Eye } from "lucide-react";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Head, fmtDur, fmtDate } from "./shared";

type ViewItem = {
  id: string;
  durationSec: number;
  contactUnlocked: boolean;
  createdAt: string;
  property: {
    id: string;
    slug: string;
    title: string;
    price: number;
    bhk: string | null;
    images: string[];
    location: { city: string; locality: string } | null;
  } | null;
};

export function RecentlyViewedTab() {
  const { session } = useAuth();
  const viewsQ = trpc.propertyViews.mine.useQuery(undefined, { enabled: !!session });
  const items = (viewsQ.data?.items ?? []) as unknown as ViewItem[];
  const stats = viewsQ.data?.stats ?? {
    totalViews: 0, contactsUnlocked: 0, citiesExplored: 0, totalDurationSec: 0, avgDurationSec: 0,
  };
  const totalMinutes = Math.round(stats.totalDurationSec / 60);

  return (
    <>
      <Head t="Recently Viewed" s={`${stats.totalViews} propert${stats.totalViews === 1 ? "y" : "ies"} you've explored.`} />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Properties Viewed" value={String(stats.totalViews)} sub="all time" />
        <StatCard label="Contacts Unlocked" value={String(stats.contactsUnlocked)} sub={`of ${stats.totalViews} views`} />
        <StatCard label="Avg. Time on Page" value={fmtDur(stats.avgDurationSec)} sub="per property visit" />
        <StatCard label="Cities Explored" value={String(stats.citiesExplored)} sub="unique locations" />
      </div>

      <div className="mt-4 mb-2 flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm">
        <Clock size={14} className="text-accent" />
        <span className="font-semibold text-navy">Total time browsing:</span>
        <span className="font-mono text-sm font-bold text-accent">{totalMinutes} min</span>
        <span className="text-xs text-muted-foreground">across all viewed properties</span>
      </div>

      <Section title="View History">
        {viewsQ.isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-4">
                <div className="h-14 w-20 rounded-lg bg-secondary" />
                <div className="flex-1 space-y-2"><div className="h-4 w-48 rounded bg-secondary" /><div className="h-3 w-32 rounded bg-secondary" /></div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <Eye size={28} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No properties viewed yet.</p>
            <Link href="/properties" className="mt-3 inline-block text-xs font-semibold text-accent hover:underline">
              Browse properties →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((v) => (
              <div key={v.id} className="flex items-center gap-4 py-4">
                <Image
                  src={v.property?.images?.[0] ?? "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=70"}
                  alt={v.property?.title ?? "Property"}
                  width={80}
                  height={56}
                  className="flex-shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-navy">{v.property?.title ?? "Property removed"}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{v.property?.location?.city ?? "—"}</span>
                    {v.durationSec > 0 && (
                      <span className="flex items-center gap-1"><Clock size={10} />{fmtDur(v.durationSec)} spent</span>
                    )}
                    <span className="font-mono">{fmtDate(v.createdAt)}</span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                  {v.contactUnlocked && <Badge tone="success">Contact Unlocked</Badge>}
                  {v.property && (
                    <Link href={`/properties/${v.property.slug}`} className="text-xs font-semibold text-accent hover:underline">
                      View →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
