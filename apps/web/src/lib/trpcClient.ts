import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@nxtsft/trpc";

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      // Auth travels via the httpOnly session cookie, not a JS-readable
      // token (GOL-268 H2) — include it on every request.
      fetch(url, options) {
        return fetch(url, { ...options, credentials: "include" });
      },
    }),
  ],
});
