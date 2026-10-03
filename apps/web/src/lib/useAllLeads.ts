"use client";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

type LeadListInput = Omit<Parameters<typeof trpc.leads.list.useInfiniteQuery>[0], "cursor">;

/**
 * Every lead the caller may see for `input`, loaded 100 at a time until the
 * last page. Drop-in for `trpc.leads.list.useQuery` where a screen must not
 * silently stop at the first page — reps with >50/100 leads lost their older
 * leads and listings that way (09-30 bug report). Returns the same
 * `{ data: { items }, isLoading }` shape the screens already read.
 */
export function useAllLeads(input: Omit<LeadListInput, "limit">, opts: { enabled?: boolean } = {}) {
  const q = trpc.leads.list.useInfiniteQuery(
    { ...input, limit: 100 },
    {
      enabled: opts.enabled ?? true,
      getNextPageParam: (last) => (last.hasMore ? last.nextCursor ?? undefined : undefined),
    },
  );
  useEffect(() => {
    if (q.hasNextPage && !q.isFetchingNextPage && !q.isFetchNextPageError) void q.fetchNextPage();
  }, [q.hasNextPage, q.isFetchingNextPage, q.isFetchNextPageError, q.data?.pages.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    data: q.data ? { items: q.data.pages.flatMap((p) => p.items) } : undefined,
    isLoading: q.isLoading,
    isFetchingMore: q.hasNextPage || q.isFetchingNextPage,
  };
}
