import { CardGridSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-8 h-10 w-48" />
      <CardGridSkeleton count={6} />
    </div>
  );
}
