"use client";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";

export function WatchPropertyButton({ propertyId }: { propertyId: string }) {
  const { session } = useAuth();
  const utils = trpc.useUtils();
  const query = trpc.sellerInsights.isWatching.useQuery({ propertyId }, { enabled: !!session });
  const mutation = trpc.sellerInsights.setWatching.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.sellerInsights.isWatching.invalidate({ propertyId }),
        utils.sellerInsights.publicMetrics.invalidate({ propertyId }),
        utils.sellerInsights.watching.invalidate(),
        utils.sellerInsights.metrics.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });
  if (session && query.isError)
    return (
      <p role="alert" className="text-sm">
        Unable to load watch status.{" "}
        <button className="underline" onClick={() => query.refetch()}>
          Retry
        </button>
      </p>
    );
  return (
    <div>
      <button
        aria-pressed={query.data ?? false}
        disabled={mutation.isPending || (!!session && query.isLoading)}
        onClick={() => {
          if (!session) {
            toast.info("Sign in to watch this property.");
            return;
          }
          mutation.mutate({ propertyId, watching: !query.data });
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent disabled:opacity-50"
      >
        <Bell size={16} />
        {mutation.isPending ? "Updating…" : query.data ? "Unwatch property" : "Watch property"}
      </button>
      <p className="mt-1 text-xs text-muted-foreground">
        Get price and availability updates in your notifications.
      </p>
    </div>
  );
}
