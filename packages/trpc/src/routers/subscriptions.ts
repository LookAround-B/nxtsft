import { createHmac, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../server.js";
import {
  cuidSchema,
  safeString,
  priceSchema,
  highlightsSchema,
  planTypeSchema,
  cursorSchema,
  limitSchema,
} from "../sanitize.js";

// Seeker plans seeded in DB via migrations/seed. These are the canonical values.
const SEEKER_PLANS = [
  { id: "instant", name: "Instant", price: 99, priceLabel: "₹99", credits: 1, validity: 30, tagline: "Try it out", popular: false },
  { id: "basic", name: "Basic", price: 299, priceLabel: "₹299", credits: 5, validity: 60, tagline: "Most popular for buyers", popular: true },
  { id: "premium", name: "Premium", price: 699, priceLabel: "₹699", credits: 15, validity: 90, tagline: "Best value", popular: false },
] as const;

export const subscriptionsRouter = router({
  // List available plans
  plans: publicProcedure
    .input(z.object({ type: planTypeSchema.optional() }))
    .query(async ({ input }) => {
      const where = input.type ? { type: input.type, active: true } : { active: true };
      const dbPlans = await prisma.plan.findMany({ where, orderBy: { price: "asc" } });

      // Fall back to hardcoded seeker plans if DB is not seeded yet
      if (dbPlans.length === 0 && (!input.type || input.type === "seeker")) {
        return SEEKER_PLANS;
      }
      return dbPlans;
    }),

  // Get single plan
  plan: publicProcedure
    .input(z.object({ id: cuidSchema }))
    .query(async ({ input }) => {
      const plan = await prisma.plan.findUnique({ where: { id: input.id } });
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });
      return plan;
    }),

  // Admin: list ALL plans incl. inactive (for the Plans Manager)
  plansAdmin: adminProcedure
    .input(z.object({ type: planTypeSchema.optional() }))
    .query(async ({ input }) => {
      return prisma.plan.findMany({
        where: input.type ? { type: input.type } : {},
        orderBy: { price: "asc" },
      });
    }),

  // Create a Razorpay order (stub — wire up Razorpay SDK in production)
  createOrder: protectedProcedure
    .input(z.object({ planId: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const dbPlan = await prisma.plan.findUnique({ where: { id: input.planId } });

      // Fall back to hardcoded plans for demo
      const staticPlan = SEEKER_PLANS.find((p) => p.id === input.planId);
      const plan = dbPlan ?? staticPlan;

      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });

      // TODO: Create actual Razorpay order here
      // const razorpay = new Razorpay({ key_id, key_secret });
      // const order = await razorpay.orders.create({ amount: plan.price * 100, currency: 'INR', receipt: `nxtsft_${Date.now()}` });
      // return { orderId: order.id, amount: plan.price, currency: 'INR', planId: input.planId };

      // Demo stub: return a mock order
      return {
        orderId: `order_demo_${Date.now()}`,
        amount: plan.price,
        currency: "INR",
        planId: input.planId,
        credits: plan.credits,
        userId: ctx.user.id,
      };
    }),

  // Verify Razorpay payment and grant credits
  verifyPayment: protectedProcedure
    .input(
      z.object({
        razorpayOrderId: safeString(200, 1),
        razorpayPaymentId: safeString(200, 1),
        razorpaySignature: safeString(200, 1),
        planId: cuidSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Payment integrity gate. When a Razorpay secret is configured we MUST
      // verify the HMAC signature — otherwise a client could replay arbitrary
      // order/payment IDs and mint free credits. We fail closed in production:
      // no secret configured → reject. Only a non-production demo build (no
      // secret) is allowed to skip verification.
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (secret) {
        const expected = createHmac("sha256", secret)
          .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
          .digest("hex");
        const a = Buffer.from(expected);
        const b = Buffer.from(input.razorpaySignature);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment verification failed." });
        }
      } else if (process.env.NODE_ENV === "production") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Payment gateway not configured.",
        });
      }

      // Reject duplicate/replayed payment IDs even if the signature checks out.
      const existingPayment = await prisma.payment.findFirst({
        where: { razorpayId: input.razorpayPaymentId },
      });
      if (existingPayment) {
        throw new TRPCError({ code: "CONFLICT", message: "Payment already processed." });
      }

      const dbPlan = await prisma.plan.findUnique({ where: { id: input.planId } });
      const staticPlan = SEEKER_PLANS.find((p) => p.id === input.planId);
      const plan = dbPlan ?? staticPlan;

      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });

      await Promise.all([
        prisma.user.update({
          where: { id: ctx.user.id },
          data: { credits: { increment: plan.credits } },
        }),
        prisma.creditTransaction.create({
          data: { userId: ctx.user.id, type: "credit", amount: plan.credits, reason: "purchase" },
        }),
        prisma.payment.create({
          data: {
            userId: ctx.user.id,
            amount: BigInt(plan.price * 100), // paise
            status: "Success",
            method: "Razorpay",
            razorpayId: input.razorpayPaymentId,
            razorpayOrderId: input.razorpayOrderId,
            description: `${plan.name} plan — ${plan.credits} credits`,
          },
        }),
      ]);

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { credits: true },
      });

      return { ok: true, credits: updated.credits, planName: plan.name };
    }),

  // Active subscription for current user
  myCurrent: protectedProcedure.query(async ({ ctx }) => {
    const sub = await prisma.subscription.findFirst({
      where: { userId: ctx.user.id, status: "Active" },
      orderBy: { createdAt: "desc" },
    });
    return sub ? { ...sub, amount: Number(sub.amount) } : null;
  }),

  cancel: protectedProcedure
    .input(z.object({ subscriptionId: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const sub = await prisma.subscription.findUnique({
        where: { id: input.subscriptionId },
      });
      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found." });

      const isAdmin = ["admin", "super-admin"].includes(ctx.user.role);
      if (sub.userId !== ctx.user.id && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to cancel this subscription." });
      }

      const updated = await prisma.subscription.update({
        where: { id: input.subscriptionId },
        data: { status: "Cancelled", updatedAt: new Date() },
      });
      return { ...updated, amount: Number(updated.amount) };
    }),

  createPlan: adminProcedure
    .input(
      z.object({
        name: safeString(100, 1),
        price: priceSchema,
        priceLabel: safeString(20, 1),
        credits: z.number().int().nonnegative(),
        validity: z.number().int().positive(),
        tagline: safeString(200),
        features: highlightsSchema,
        popular: z.boolean().default(false),
        type: planTypeSchema,
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.plan.create({ data: input });
    }),

  updatePlan: adminProcedure
    .input(
      z.object({
        id: cuidSchema,
        name: safeString(100, 1).optional(),
        price: priceSchema.optional(),
        priceLabel: safeString(20, 1).optional(),
        credits: z.number().int().nonnegative().optional(),
        validity: z.number().int().positive().optional(),
        tagline: safeString(200).optional(),
        features: highlightsSchema.optional(),
        popular: z.boolean().optional(),
        active: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.plan.update({ where: { id }, data });
    }),

  deletePlan: adminProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input }) => {
      return prisma.plan.update({ where: { id: input.id }, data: { active: false } });
    }),

  adminList: adminProcedure
    .input(
      z.object({
        status: safeString(50).optional(),
        cursor: cursorSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { status, cursor, limit } = input;
      const where: any = {};
      if (status) where.status = status;

      const items = await prisma.subscription.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;

      return {
        items: page.map((sub) => ({
          ...sub,
          amount: Number(sub.amount),
        })),
        nextCursor: page.at(-1)?.id ?? null,
        hasMore,
      };
    }),
});
