"use client";
import { Eye, Bell, Heart, Inbox } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function InsightsBar({
  counts,
}: {
  counts: { views: number; watching: number; shortlisted: number; requested: number };
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
        NxtSft Insights · Recorded activity
      </p>
    </div>
  );
}

export function ListingInsights({ propertyId }: { propertyId?: string }) {
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
  return <InsightsBar counts={query.data} />;
}
