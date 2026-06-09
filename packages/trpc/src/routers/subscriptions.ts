import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../server.js";

// Seeker plans seeded in DB via migrations/seed. These are the canonical values.
const SEEKER_PLANS = [
  { id: "instant", name: "Instant", price: 99, priceLabel: "₹99", credits: 1, validity: 30, tagline: "Try it out", popular: false },
  { id: "basic", name: "Basic", price: 299, priceLabel: "₹299", credits: 5, validity: 60, tagline: "Most popular for buyers", popular: true },
  { id: "premium", name: "Premium", price: 699, priceLabel: "₹699", credits: 15, validity: 90, tagline: "Best value", popular: false },
] as const;

export const subscriptionsRouter = router({
  // List available plans
  plans: publicProcedure
    .input(z.object({ type: z.enum(["seeker", "owner-rent", "owner-sell"]).optional() }))
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
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const plan = await prisma.plan.findUnique({ where: { id: input.id } });
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });
      return plan;
    }),

  // Create a Razorpay order (stub — wire up Razorpay SDK in production)
  createOrder: protectedProcedure
    .input(z.object({ planId: z.string() }))
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
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
        planId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Verify HMAC signature with Razorpay secret
      // const expectedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
      //   .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
      //   .digest('hex');
      // if (expectedSignature !== input.razorpaySignature) throw new TRPCError({ code: 'BAD_REQUEST', ... });

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
    return prisma.subscription.findFirst({
      where: { userId: ctx.user.id, status: "Active" },
      orderBy: { createdAt: "desc" },
    });
  }),

  cancel: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const sub = await prisma.subscription.findUnique({
        where: { id: input.subscriptionId },
      });
      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found." });

      const isAdmin = ["admin", "super-admin"].includes(ctx.user.role);
      if (sub.userId !== ctx.user.id && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to cancel this subscription." });
      }

      return prisma.subscription.update({
        where: { id: input.subscriptionId },
        data: { status: "Cancelled", updatedAt: new Date() },
      });
    }),

  createPlan: adminProcedure
    .input(
      z.object({
        name: z.string(),
        price: z.number().int().positive(),
        priceLabel: z.string(),
        credits: z.number().int().nonnegative(),
        validity: z.number().int().positive(),
        tagline: z.string(),
        features: z.array(z.string()).default([]),
        popular: z.boolean().default(false),
        type: z.enum(["seeker", "owner-rent", "owner-sell"]),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.plan.create({ data: input });
    }),

  updatePlan: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        price: z.number().int().positive().optional(),
        priceLabel: z.string().optional(),
        credits: z.number().int().nonnegative().optional(),
        validity: z.number().int().positive().optional(),
        tagline: z.string().optional(),
        features: z.array(z.string()).optional(),
        popular: z.boolean().optional(),
        active: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.plan.update({ where: { id }, data });
    }),

  deletePlan: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.plan.update({ where: { id: input.id }, data: { active: false } });
    }),

  adminList: adminProcedure
    .input(
      z.object({
        status: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
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
