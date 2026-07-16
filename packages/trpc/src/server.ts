import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import prisma from "@nxtsft/db";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  verifySessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
  hashToken,
  trustedClientIp,
} from "@nxtsft/shared";

const STAFF_ROLES = ["super-admin", "admin", "supervisor", "sales", "support-admin"] as const;
const ADMIN_ROLES = ["admin", "super-admin"] as const;

const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
// Renew once less than this much life remains, i.e. ~5 days since the last
// renewal (or creation) — keeps an active session from ever hitting its
// fixed TTL, while writing far less often than once per request.
const SESSION_RENEWAL_THRESHOLD_MS = SESSION_TTL_MS - 5 * 24 * 60 * 60 * 1000;

// Shared token → user resolution used by both Next.js and Fastify adapters.
// `token` here is always the raw (unhashed) value — Session.token is stored
// as sha256(rawToken) (GOL-268 L2), so lookups hash it first. ctx.token stays
// the raw value so callers (e.g. auth.logout) can hash it again themselves.
export async function createContextFromToken(token: string | null, ip: string | null = null) {
  if (!token) return { prisma, user: null, token: null, ip };

  const session = await prisma.session.findUnique({ where: { token: hashToken(token) } });
  if (!session || session.expiresAt <= new Date()) return { prisma, user: null, token: null, ip };

  // Sliding expiry: an active session's DB-side TTL (the real authorization
  // boundary, unlike the cookie which this convenience-gates) gets pushed
  // out on use instead of counting down from a single login. Mirrors the
  // cookie-side renewal in middleware.ts so the two never drift apart.
  if (session.expiresAt.getTime() - Date.now() < SESSION_RENEWAL_THRESHOLD_MS) {
    try {
      await prisma.session.update({
        where: { id: session.id },
        data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
      });
    } catch {
      // best-effort — a failed renewal just means the session expires on
      // its original schedule, not a request-blocking failure
    }
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  return { prisma, user, token, ip };
}

// Extracts a single cookie value from a raw `Cookie` header string.
function getCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return part.slice(eq + 1).trim();
    }
  }
  return undefined;
}

// For Next.js App Router (Web Request API). Browser (cookie) callers and
// external/API consumers (Bearer header — REST v1, the Fastify surface, any
// non-browser client) both resolve to the same createContextFromToken path;
// the cookie's role is never trusted here — only its token, which gets
// re-verified against the DB same as the Bearer flow. GOL-268 H2.
export const createTRPCContext = async (opts: { req: Request }) => {
  const raw = opts.req.headers.get("authorization") ?? "";
  let token = raw.startsWith("Bearer ") ? raw.slice(7) : null;

  if (!token) {
    const cookie = getCookie(opts.req.headers.get("cookie"), SESSION_COOKIE_NAME);
    token = verifySessionCookie(cookie)?.token ?? null;
  }

  // Not just the first hop — see trustedClientIp (GOL-268 L5).
  const ip = trustedClientIp(opts.req.headers.get("x-forwarded-for"));
  return createContextFromToken(token, ip);
};

export type Context = Awaited<ReturnType<typeof createContextFromToken>>;

// ─── tRPC init ───────────────────────────────────────────────────────────────

const t = initTRPC.context<Context>().create({
  isServer: true,
  allowOutsideOfServer: true,
  // Expose flattened Zod issues on error.data.zodError so the client can show
  // field-level validation messages in toasts.
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;

// ─── Request Logging ───────────────────────────────────────────────────────

const SENSITIVE_FIELDS = new Set(["password", "currentPassword", "newPassword", "token", "credential", "razorpaySignature"]);

const loggingMiddleware = middleware(async ({ ctx, next, path, type }) => {
  const start = performance.now();
  const result = await next();
  const durationMs = Math.round(performance.now() - start);

  if (durationMs > 1000) {
    console.warn(`[tRPC] SLOW ${type} ${path} — ${durationMs}ms`, {
      userId: ctx.user?.id ?? "anon",
      ip: ctx.ip,
    });
  }

  return result;
});

// ─── Procedures ──────────────────────────────────────────────────────────────

export const publicProcedure = t.procedure.use(loggingMiddleware);

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in to continue." });
  if (!ctx.user.active) throw new TRPCError({ code: "FORBIDDEN", message: "This account has been deactivated." });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!STAFF_ROLES.includes(ctx.user.role as (typeof STAFF_ROLES)[number])) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Staff access only." });
  }
  return next();
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ADMIN_ROLES.includes(ctx.user.role as (typeof ADMIN_ROLES)[number])) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access only." });
  }
  return next();
});

export const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "super-admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Super-admin access only." });
  }
  return next();
});

const SUPERVISOR_ROLES = ["supervisor", "super-admin"] as const;

export const supervisorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!SUPERVISOR_ROLES.includes(ctx.user.role as (typeof SUPERVISOR_ROLES)[number])) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Supervisor access only." });
  }
  return next();
});

// ─── Rate Limiting (Upstash Redis — distributed, works on Vercel serverless) ──

// Fall back to an in-process stub when Upstash env vars are absent (local dev
// without Redis credentials). The stub is intentionally permissive so local
// development is never blocked.
function makeRatelimit(points: number, windowSeconds: number): Ratelimit | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(points, `${windowSeconds} s`),
    prefix: "nxtsft:rl",
  });
}

// Framework-agnostic rate-limit check, shared by the tRPC middleware below
// and the REST v1 route handlers (apps/web/src/app/api/v1/helper.ts —
// GOL-268 L6, that surface previously had no rate limiting at all). Same
// fail-closed-in-production / skip-in-dev-without-Redis policy as M2.
export async function checkRateLimit(
  key: string,
  points: number,
  windowSeconds: number,
): Promise<{ ok: true } | { ok: false; retryIn: number }> {
  const limiter = makeRatelimit(points, windowSeconds);
  if (!limiter) {
    if (process.env.NODE_ENV === "production") return { ok: false, retryIn: windowSeconds };
    return { ok: true }; // local dev without Redis — skip
  }
  const { success, reset } = await limiter.limit(key);
  if (!success) return { ok: false, retryIn: Math.ceil((reset - Date.now()) / 1000) };
  return { ok: true };
}

function createRateLimiter(points: number, windowMs: number) {
  const windowSeconds = Math.ceil(windowMs / 1000);

  return middleware(async ({ ctx, next, path }) => {
    const key = `${path}:${ctx.user?.id ?? ctx.ip ?? "anon"}`;
    const result = await checkRateLimit(key, points, windowSeconds);
    if (!result.ok) {
      // No Redis configured in production surfaces as ok:false too (fail
      // closed rather than silently allowing unlimited attempts), same
      // message either way so callers can't distinguish the two cases.
      const retryIn = result.retryIn;
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Try again in ${retryIn} seconds.`,
      });
    }
    return next();
  });
}

// Pre-built rate limiters
const authRateLimit      = createRateLimiter(10,  15 * 60 * 1000); // 10 per 15 min
const registerRateLimit  = createRateLimiter(5,   60 * 60 * 1000); // 5 per hour
const contactRateLimit   = createRateLimiter(5,   60 * 60 * 1000); // 5 per hour
const generalRateLimit   = createRateLimiter(100, 60 * 60 * 1000); // 100 per hour
const broadcastRateLimit = createRateLimiter(5,   60 * 60 * 1000); // 5 per hour

export { createRateLimiter, authRateLimit, registerRateLimit, contactRateLimit, generalRateLimit, broadcastRateLimit };
