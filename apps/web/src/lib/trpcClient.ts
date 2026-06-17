import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@nxtsft/trpc";

const TOKEN_KEY = "nxtsft.token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/trpc", headers: getAuthHeaders })],
});
