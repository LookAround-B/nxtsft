"use client";

import type { HTMLAttributes } from "react";
import type { SkeletonResult } from "boneyard-js";
import { Skeleton as BoneyardSkeleton, configureBoneyard } from "boneyard-js/react";
import { cn } from "@/lib/utils";

// boneyard's stock bones are #f0f0f0 with a #f7f7f7 shimmer — both near-white,
// so they're invisible on our white surfaces. Use a visibly grey palette.
configureBoneyard({
  color: "#e2e8f0", // slate-200
  darkColor: "#2a2f3a",
  shimmerColor: "#f1f5f9", // slate-100
  darkShimmerColor: "#3a4150",
  animate: "shimmer",
});

const BASE_BLOCK_BONES: SkeletonResult = {
  name: "ui-block",
  viewportWidth: 100,
  width: 100,
  height: 100,
  bones: [[0, 0, 100, 100, 8]],
};

function radiusForClassName(className?: string): number | string {
  if (!className) return 8;
  if (className.includes("rounded-full")) return "50%";
  if (className.includes("rounded-none")) return 0;
  if (className.includes("rounded-2xl")) return 16;
  if (className.includes("rounded-xl")) return 12;
  if (className.includes("rounded-lg")) return 10;
  if (className.includes("rounded-md")) return 8;
  return 8;
}

function toneForClassName(className?: string) {
  if (!className) return undefined;
  if (className.includes("bg-white/10")) {
    return "rgba(255, 255, 255, 0.14)";
  }
  return undefined;
}

function blockBonesFor(className?: string): SkeletonResult {
  return {
    ...BASE_BLOCK_BONES,
    bones: [[0, 0, 100, 100, radiusForClassName(className)]],
  };
}

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const tone = toneForClassName(className);

  return (
    <BoneyardSkeleton
      loading
      animate="shimmer"
      color={tone}
      darkColor={tone}
      initialBones={blockBonesFor(className)}
      className="block"
    >
      <div className={cn("block", className)} {...props} />
    </BoneyardSkeleton>
  );
}

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-4 flex-1", c === 0 && "max-w-[40%]", c === cols - 1 && "max-w-[15%]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-white">
          <Skeleton className="h-44 w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { Skeleton, TableSkeleton, CardGridSkeleton, ListSkeleton };
