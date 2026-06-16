import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { createContextFromToken } from "@nxtsft/trpc/server";

export function createContext({ req }: CreateFastifyContextOptions) {
  const raw = req.headers.authorization ?? "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : null;
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? null;
  return createContextFromToken(token, ip);
}

export type Context = Awaited<ReturnType<typeof createContext>>;
