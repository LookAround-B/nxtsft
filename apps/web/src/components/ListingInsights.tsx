"use client";
import { useEffect, useState } from "react";
import { propertyActivity } from "@/lib/propertyActivity";
import { Eye, Bell, Heart, Inbox } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function InsightsBar({
  counts,
  demo = false,
}: {
  counts: { views: number; watching: number; shortlisted: number; requested: number };
  demo?: boolean;
}) {
  return (
    <div aria-label="NxtSft Insights" className="my-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Views", value: counts.views, Icon: Eye },
          { label: "Watching", value: counts.watching, Icon: Bell },
          { label: "Shortlisted", value: counts.shortlisted, Icon: Heart },
          { label: "Requested", value: counts.requested, Icon: Inbox },
        ].map(({ label, value, Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-secondary/40 px-2 py-3 text-center"
          >
            <Icon size={20} className="mx-auto mb-1 text-accent" aria-hidden />
            <div className="text-lg font-bold text-navy">{value.toLocaleString("en-IN")}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-right text-xs text-muted-foreground">
        NxtSft Insights · {demo ? "Includes simulated activity" : "Recorded activity"}
      </p>
    </div>
  );
}

export function ListingInsights({
  propertyId,
  demoListing,
}: {
  propertyId?: string;
  demoListing?: DemoListing;
}) {
  const query = trpc.sellerInsights.metrics.useQuery({ propertyId });
  if (query.isError)
    return (
      <p role="alert" className="my-4 text-sm text-muted-foreground">
        Insights unavailable.{" "}
        <button onClick={() => query.refetch()} className="underline">
          Retry
        </button>
      </p>
    );
  if (!query.data)
    return (
      <div
        aria-label="Loading insights"
        className="my-4 h-28 animate-pulse rounded-xl bg-secondary"
      />
    );
  return propertyId && demoListing ? (
    <DemoPropertyActivity propertyId={propertyId} {...demoListing} counts={query.data} />
  ) : (
    <InsightsBar counts={query.data} />
  );
}

export type DemoListing = {
  createdAt: string;
  freeListing: boolean;
  region: { state?: string | null; city?: string | null; locality?: string | null } | null;
};

export function DemoPropertyActivity({
  propertyId,
  createdAt,
  freeListing,
  region,
  counts,
}: DemoListing & {
  propertyId: string;
  counts?: { views: number; watching: number; shortlisted: number; requested: number };
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);
  const demo = now
    ? propertyActivity(propertyId, new Date(createdAt), region, now, freeListing)
    : null;
  if (!demo)
    return (
      <div
        aria-label="Loading insights"
        className="my-4 h-28 animate-pulse rounded-xl bg-secondary"
      />
    );
  return (
    <div aria-label="Property activity including simulated activity">
      {counts && (
        <InsightsBar
          demo
          counts={{
            views: counts.views + demo.counts.views,
            watching: counts.watching + demo.counts.watching,
            shortlisted: counts.shortlisted + demo.counts.shortlists,
            requested: counts.requested + demo.counts.contacted,
          }}
        />
      )}
      {!!demo.recent.length && (
        <ul className="mb-4 space-y-3 border-t border-border pt-4">
          {demo.recent.map((event) => (
            <li key={event.name} className="flex flex-wrap justify-between gap-2 text-sm">
              <span>
                <strong>{event.name}</strong>{" "}
                <span
                  className={
                    event.action === "wishlisted"
                      ? "text-pink-600"
                      : event.action === "contact"
                        ? "text-emerald-700"
                        : "text-blue-600"
                  }
                >
                  {event.action === "wishlisted"
                    ? "shortlisted"
                    : event.action === "contact"
                      ? "requested contact"
                      : "showed interest"}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.floor((now!.getTime() - new Date(event.at).getTime()) / 3_600_000) || "<1"}h
                ago
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
