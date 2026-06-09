import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./index";
import { createTRPCContext } from "./server";

const isDev = process.env.NODE_ENV === "development";

export function createNextHandler() {
  return (req: Request) =>
    fetchRequestHandler({
      endpoint: "/api/trpc",
      req,
      router: appRouter,
      createContext: createTRPCContext,
      onError: isDev
        ? ({ path, error }: { path: string | undefined; error: Error }) => {
            console.error(`[tRPC] ${path ?? "unknown"}:`, error.message);
          }
        : undefined,
    });
}
