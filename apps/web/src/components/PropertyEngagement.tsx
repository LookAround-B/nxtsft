"use client";
import { trpc } from "@/lib/trpc";
import { DemoPropertyActivity } from "./ListingInsights";
import { WatchPropertyButton } from "./WatchPropertyButton";

export function PropertyEngagement({
  propertyId,
  status,
  createdAt,
  region,
  freeListing,
  className,
}: {
  propertyId: string;
  status: string;
  createdAt: string;
  region: { state: string; city: string; locality?: string | null };
  freeListing: boolean;
  className?: string;
}) {
  const metrics = trpc.sellerInsights.publicMetrics.useQuery(
    { propertyId },
    { enabled: status === "Active" },
  );
  const activity = trpc.properties.engagement.useQuery(
    { id: propertyId },
    { enabled: status === "Active" },
  );
  if (status !== "Active") return null;
  return (
    <section
      className={`rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6 ${className ?? ""}`}
    >
      <h3 className="font-display text-base font-bold text-navy">Activity On This Property</h3>
      {metrics.data ? (
        <DemoPropertyActivity
          propertyId={propertyId}
          createdAt={createdAt}
          freeListing={freeListing}
          region={region}
          counts={metrics.data}
        />
      ) : metrics.isError ? (
        <p role="alert">
          Insights unavailable.{" "}
          <button className="underline" onClick={() => metrics.refetch()}>
            Retry
          </button>
        </p>
      ) : (
        <div className="my-4 h-28 animate-pulse rounded-xl bg-secondary" />
      )}
      <WatchPropertyButton propertyId={propertyId} />
      {activity.isError && (
        <p className="mt-3 text-sm text-muted-foreground">Recent activity is unavailable.</p>
      )}
      {!!activity.data?.recent.length && (
        <ul className="mt-4 space-y-3 border-t border-border pt-4">
          {activity.data.recent.map((event, i) => (
            <li key={`${event.at}-${i}`} className="flex flex-wrap justify-between gap-2 text-sm">
              <span>
                <strong>{event.name}</strong>{" "}
                {event.action === "wishlisted"
                  ? "shortlisted"
                  : event.action === "contact"
                    ? "requested contact"
                    : "showed interest"}
              </span>
              <time dateTime={event.at} className="text-xs text-muted-foreground">
                {new Date(event.at).toLocaleString("en-IN")}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
