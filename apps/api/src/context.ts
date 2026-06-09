import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { createContextFromToken } from "@nxtsft/trpc/server";

export function createContext({ req }: CreateFastifyContextOptions) {
  const raw = req.headers.authorization ?? "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : null;
  return createContextFromToken(token);
}

export type Context = Awaited<ReturnType<typeof createContext>>;
