"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function getPageNumbers(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, totalPages - 1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("ellipsis");
    result.push(p);
    prev = p;
  }
  return result;
}

/** Numbered, jump-to-page pagination bar with an optional "Showing X of Y" summary. */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  shown,
  total,
  noun = "items",
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  shown?: number;
  total?: number;
  noun?: string;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(page, totalPages);

  return (
    <div className={cn("flex flex-col items-center gap-3 py-6", className)}>
      {total != null && (
        <p className="text-xs text-muted-foreground">
          {shown != null ? `Showing ${shown} of ` : ""}
          {total.toLocaleString()} {noun}
        </p>
      )}
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span key={`e${i}`} className="grid h-9 w-9 place-items-center text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-lg text-sm font-semibold transition",
                p === page ? "bg-navy text-white" : "text-foreground hover:bg-secondary",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}
