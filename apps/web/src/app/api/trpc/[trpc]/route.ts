import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@nxtsft/trpc";
import { createTRPCContext } from "@nxtsft/trpc/server";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
  });

export { handler as GET, handler as POST };
