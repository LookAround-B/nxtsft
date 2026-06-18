"use client";
import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AppDataProvider } from "@/lib/dataProvider";
import { getErrorMessage } from "@/lib/errors";
import type { AppRouter } from "@nxtsft/trpc";

const TOKEN_KEY = "nxtsft.token";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
    // Surface every failed query as a toast. `id` collapses identical
    // concurrent failures into a single toast instead of stacking.
    queryCache: new QueryCache({
      onError: (error) => {
        const message = getErrorMessage(error);
        toast.error(message, { id: `query:${message}` });
      },
    }),
    // Surface failed mutations too — but skip ones whose component already
    // wired its own onError, so we never double-toast.
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.options.onError) return;
        toast.error(getErrorMessage(error));
      },
    }),
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: "/api/trpc", headers: getAuthHeaders })],
    })
  );

  const tree = (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppDataProvider>{children}</AppDataProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );

  // Only mount the Google provider when a client ID is configured.
  return GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{tree}</GoogleOAuthProvider>
  ) : (
    tree
  );
}
