"use client";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Head } from "./shared";
import { WatchPropertyButton } from "@/components/WatchPropertyButton";

export function WatchingTab() {
  const query = trpc.sellerInsights.watching.useQuery();
  return (
    <>
      <Head t="Watching" s="Properties you follow for price and availability updates." />
      {query.isLoading ? (
        <p>Loading watched properties…</p>
      ) : query.isError ? (
        <p role="alert">
          Unable to load properties.{" "}
          <button className="underline" onClick={() => query.refetch()}>
            Retry
          </button>
        </p>
      ) : !query.data?.length ? (
        <p>You aren&apos;t watching any properties yet.</p>
      ) : (
        <div className="space-y-4">
          {query.data.map(({ property }) => (
            <div key={property.id} className="space-y-3 rounded-xl border border-border p-4">
              {property.status === "Active" ? (
                <Link href={`/properties/${property.slug}`} className="font-semibold text-navy">
                  {property.title}
                </Link>
              ) : (
                <p className="font-semibold text-navy">{property.title}</p>
              )}
              <p className="text-sm text-muted-foreground">{property.status}</p>
              <WatchPropertyButton propertyId={property.id} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
