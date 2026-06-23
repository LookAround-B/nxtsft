import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import prisma from "@nxtsft/db";

const STAFF_ROLES = ["super-admin", "admin", "supervisor", "sales", "support-admin"] as const;
const ADMIN_ROLES = ["admin", "super-admin"] as const;

// Shared token → user resolution used by both Next.js and Fastify adapters
export async function createContextFromToken(token: string | null, ip: string | null = null) {
  if (!token) return { prisma, user: null, token: null, ip };

  const session = await prisma.session.findUnique({ where: { token } });
  if (!session || session.expiresAt <= new Date()) return { prisma, user: null, token: null, ip };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  return { prisma, user, token, ip };
}

// For Next.js App Router (Web Request API)
export const createTRPCContext = async (opts: { req: Request }) => {
  const raw = opts.req.headers.get("authorization") ?? "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : null;
  const ip = opts.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
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

// ─── Rate Limiting ─────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

function createRateLimiter(points: number, windowMs: number) {
  return middleware(({ ctx, next, path }) => {
    const key = `${path}:${ctx.user?.id ?? ctx.ip ?? "anon"}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (entry && entry.resetAt > now) {
      if (entry.count >= points) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
        });
      }
      entry.count++;
    } else {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    }

    return next();
  });
}

// Pre-built rate limiters
const authRateLimit = createRateLimiter(10, 15 * 60 * 1000);     // 10 per 15 min
const registerRateLimit = createRateLimiter(5, 60 * 60 * 1000);  // 5 per hour
const contactRateLimit = createRateLimiter(5, 60 * 60 * 1000);   // 5 per hour
const generalRateLimit = createRateLimiter(100, 60 * 60 * 1000); // 100 per hour
const broadcastRateLimit = createRateLimiter(5, 60 * 60 * 1000); // 5 per hour

export { createRateLimiter, authRateLimit, registerRateLimit, contactRateLimit, generalRateLimit, broadcastRateLimit };
