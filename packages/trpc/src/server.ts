import { initTRPC, TRPCError } from "@trpc/server";
import prisma from "@nxtsft/db";

const STAFF_ROLES = ["super-admin", "admin", "supervisor", "sales", "support-admin"] as const;
const ADMIN_ROLES = ["admin", "super-admin"] as const;

// Shared token → user resolution used by both Next.js and Fastify adapters
export async function createContextFromToken(token: string | null) {
  if (!token) return { prisma, user: null, token: null };

  const session = await prisma.session.findUnique({ where: { token } });
  if (!session || session.expiresAt <= new Date()) return { prisma, user: null, token: null };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  return { prisma, user, token };
}

// For Next.js App Router (Web Request API)
export const createTRPCContext = async (opts: { req: Request }) => {
  const raw = opts.req.headers.get("authorization") ?? "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : null;
  return createContextFromToken(token);
};

export type Context = Awaited<ReturnType<typeof createContextFromToken>>;

// ─── tRPC init ───────────────────────────────────────────────────────────────

const t = initTRPC.context<Context>().create({ isServer: true, allowOutsideOfServer: true });

export const router = t.router;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;

// ─── Procedures ──────────────────────────────────────────────────────────────

export const publicProcedure = t.procedure;

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
