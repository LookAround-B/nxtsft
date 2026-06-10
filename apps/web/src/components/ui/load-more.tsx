"use client";
import { cn } from "@/lib/utils";

/** Cursor-pagination "Load more" button with spinner + count summary. */
export function LoadMore({
  onClick,
  isLoading,
  hasMore,
  shown,
  total,
  noun = "items",
  className,
}: {
  onClick: () => void;
  isLoading: boolean;
  hasMore: boolean;
  shown: number;
  total?: number;
  noun?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 py-6", className)}>
      <p className="text-xs text-muted-foreground">
        Showing {shown}
        {total != null ? ` of ${total}` : ""} {noun}
      </p>
      {hasMore && (
        <button
          onClick={onClick}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-navy px-6 py-2.5 font-display text-sm font-bold text-navy transition hover:bg-navy hover:text-white disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy/30 border-t-navy" />
              Loading…
            </>
          ) : (
            "Load more"
          )}
        </button>
      )}
    </div>
  );
}
