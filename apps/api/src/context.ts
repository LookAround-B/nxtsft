import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { createContextFromToken } from "@nxtsft/trpc/server";
import { trustedClientIp } from "@nxtsft/shared";

export function createContext({ req }: CreateFastifyContextOptions) {
  const raw = req.headers.authorization ?? "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : null;
  // Not just the first hop — see trustedClientIp (GOL-268 L5).
  const ip = trustedClientIp(req.headers["x-forwarded-for"] as string, req.ip ?? null);
  return createContextFromToken(token, ip);
}

export type Context = Awaited<ReturnType<typeof createContext>>;
