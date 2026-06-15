import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="space-y-4 rounded-2xl border border-border bg-white p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-xl" />
        ))}
        <Skeleton className="mt-2 h-11 w-40 rounded-xl" />
      </div>
    </div>
  );
}
