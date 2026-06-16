"use client";

import { Skeleton } from "@/components/ui/skeleton";

function StatCardSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-white p-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

/**
 * Mirrors PortalShell: navy sidebar (logo + icon-box nav rows + back link),
 * white top header (toggle + role label + bell + avatar), content with KPI
 * StatCards and section blocks. Sidebar hidden < lg, matching the real shell.
 */
export function PortalLoadingPreset({
  navCount,
  statCount = 4,
  statCols = 4,
}: {
  navCount: number;
  statCount?: number;
  statCols?: 3 | 4;
}) {
  return (
      <div className="flex h-screen overflow-hidden bg-[oklch(0.97_0.01_260)]">
        {/* Sidebar */}
        <aside className="hidden w-[240px] flex-shrink-0 flex-col bg-navy-deep lg:flex">
          <div className="flex items-center gap-3 border-b border-white/8 px-4 py-4">
            <Skeleton className="h-12 w-12 rounded-xl bg-white/10" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-24 bg-white/10" />
              <Skeleton className="h-2.5 w-16 bg-white/10" />
            </div>
          </div>
          <div className="flex-1 space-y-1 overflow-hidden px-2 py-4">
            {Array.from({ length: navCount }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="h-7 w-7 rounded-lg bg-white/10" />
                <Skeleton className="h-3.5 max-w-[120px] flex-1 bg-white/10" />
              </div>
            ))}
          </div>
          <div className="border-t border-white/8 px-4 py-3">
            <Skeleton className="h-4 w-36 bg-white/10" />
          </div>
        </aside>

        {/* Main */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex flex-shrink-0 items-center justify-between border-b border-border bg-white px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="hidden space-y-1.5 sm:block">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-72" />
              </div>
              <div
                className={`grid gap-4 sm:grid-cols-2 ${statCols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
              >
                {Array.from({ length: statCount }).map((_, i) => (
                  <StatCardSkeleton key={i} />
                ))}
              </div>
              <Skeleton className="h-72 w-full rounded-2xl" />
              <Skeleton className="h-56 w-full rounded-2xl" />
            </div>
          </main>
        </div>
      </div>
  );
}
