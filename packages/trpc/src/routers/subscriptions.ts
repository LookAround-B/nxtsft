import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, publicProcedure, protectedProcedure } from "../server";

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
});
