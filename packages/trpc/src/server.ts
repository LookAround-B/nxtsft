import { initTRPC } from "@trpc/server";
import prisma from "@nxtsft/db";

/**
 * Create tRPC context for Next.js Route Handlers (using standard Web Request)
 */
export const createTRPCContext = async (opts: { req: Request }) => {
  // Extract user from headers or cookies if needed
  const authHeader = opts.req.headers.get("authorization");
  let user = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    // Retrieve session or decode token
    const session = await prisma.session.findUnique({
      where: { token },
    });
    if (session && session.expiresAt > new Date()) {
      user = await prisma.user.findUnique({
        where: { id: session.userId },
      });
    }
  }

  return {
    prisma,
    req: opts.req,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

// ═══════════════════════════════════════════════════════════════════════════
// Initialize tRPC
// ═══════════════════════════════════════════════════════════════════════════

const t = initTRPC.context<Context>().create({
  isServer: true,
  allowOutsideOfServer: true,
});

/**
 * Public procedure - accessible without authentication
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.user) {
    throw new Error("UNAUTHORIZED");
  }
  return opts.next({
    ctx: {
      ...opts.ctx,
      user: opts.ctx.user, // type narrowed
    },
  });
});

/**
 * Admin procedure - requires admin role
 */
export const adminProcedure = protectedProcedure.use(async (opts) => {
  const adminRoles = ["super-admin", "admin"];
  if (!adminRoles.includes(opts.ctx.user?.role)) {
    throw new Error("FORBIDDEN");
  }
  return opts.next();
});

export const router = t.router;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;
