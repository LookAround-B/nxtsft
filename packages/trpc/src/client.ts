import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "./index";

/**
 * Create tRPC client for use in Next.js
 * Frontend uses this to call backend procedures
 */
export const createTRPCClient = (baseUrl: string) => {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        async headers() {
          return {
            "x-trpc-source": "nextjs-client",
          };
        },
      }),
    ],
  });
};
