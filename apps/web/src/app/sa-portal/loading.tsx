import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-screen overflow-hidden bg-[oklch(0.13_0.02_260)]">
      {/* Sidebar shimmer */}
      <div className="flex w-56 flex-shrink-0 flex-col gap-2 border-r border-white/10 p-4">
        <Skeleton className="mb-4 h-8 w-32 bg-white/10" />
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full bg-white/10" />
        ))}
      </div>
      {/* Content shimmer */}
      <div className="flex flex-1 flex-col gap-4 overflow-auto bg-[oklch(0.97_0.01_260)] p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  );
}
