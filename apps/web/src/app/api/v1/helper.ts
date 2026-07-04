import { NextRequest, NextResponse } from "next/server";
import prisma from "@nxtsft/db";
import { hashToken, trustedClientIp } from "@nxtsft/shared";
import { checkRateLimit } from "@nxtsft/trpc/server";

// REST v1 previously had no rate limiting at all — the limiter only lived in
// tRPC middleware (GOL-268 L6). 100/min per IP mirrors the Fastify apps/api
// surface's existing convention. Call as the first line of every handler;
// if it returns a Response, return that immediately without running the
// handler's own logic.
export async function rateLimitOrResponse(req: NextRequest): Promise<NextResponse | null> {
  const ip = trustedClientIp(req.headers.get("x-forwarded-for")) ?? "anon";
  const result = await checkRateLimit(`v1:${ip}`, 100, 60);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Too Many Requests", message: `Rate limit exceeded. Retry in ${result.retryIn} seconds.` },
      { status: 429 },
    );
  }
  return null;
}

export async function getAuthUser(req: NextRequest) {
  const raw = req.headers.get("authorization") ?? "";
  if (!raw.startsWith("Bearer ")) return null;

  const token = raw.slice(7);
  // Session.token is stored as sha256(rawToken), never the raw value (GOL-268 L2).
  const session = await prisma.session.findUnique({ where: { token: hashToken(token) } });
  if (!session || session.expiresAt < new Date()) return null;

  return prisma.user.findUnique({ where: { id: session.userId } });
}

// Recursively converts BigInt values to numbers for JSON serialization
export function serializeBigInt(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, serializeBigInt(v)]),
    );
  }
  return obj;
}
