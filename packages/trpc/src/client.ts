import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "./index";

export function createTRPCClient(baseUrl: string, getToken?: () => string | null) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        async headers() {
          const token = getToken?.();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

// Default client pointing to the Fastify API server
export const apiClient = createTRPCClient(
  typeof process !== "undefined" ? (process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001") : "http://localhost:3001",
);
