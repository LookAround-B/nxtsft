import { createHmac, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { notify } from "../notify";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../server";
import {
  cuidSchema,
  safeString,
  priceSchema,
  highlightsSchema,
  planTypeSchema,
  cursorSchema,
  limitSchema,
} from "../sanitize";
import { generatePayUHash, PAYU_BASE_URL } from "../payu";

// Seeker plans seeded in DB via migrations/seed. These are the canonical values.
const SEEKER_PLANS = [
  { id: "instant", name: "Instant", price: 99, priceLabel: "₹99", credits: 1, validity: 30, tagline: "Try it out", popular: false },
  { id: "basic", name: "Basic", price: 299, priceLabel: "₹299", credits: 5, validity: 60, tagline: "Most popular for buyers", popular: true },
  { id: "premium", name: "Premium", price: 699, priceLabel: "₹699", credits: 15, validity: 90, tagline: "Best value", popular: false },
] as const;

// Owner/landlord/builder subscription plans (not credit-based)
const OWNER_PLANS = [
  { id: "rent-weekly",     name: "Rent Weekly Booster",     price: 499,   validityDays: 7,  cycle: "weekly"  },
  { id: "rent-silver",     name: "Rent Monthly Silver",     price: 999,   validityDays: 30, cycle: "monthly" },
  { id: "rent-gold",       name: "Rent Monthly Gold",       price: 1999,  validityDays: 30, cycle: "monthly" },
  { id: "rent-platinum",   name: "Rent Monthly Platinum",   price: 4999,  validityDays: 30, cycle: "monthly" },
  { id: "sell-silver",     name: "Sell Monthly Silver",     price: 4999,  validityDays: 30, cycle: "monthly" },
  { id: "sell-gold",       name: "Sell Monthly Gold",       price: 9999,  validityDays: 30, cycle: "monthly" },
  { id: "sell-platinum",   name: "Sell Monthly Platinum",   price: 14999, validityDays: 30, cycle: "monthly" },
  { id: "sell-builder",    name: "Sell Monthly Builder Pro",price: 24999, validityDays: 30, cycle: "monthly" },
  { id: "sell-enterprise", name: "Sell Monthly Enterprise", price: 49999, validityDays: 30, cycle: "monthly" },
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

  // Active payment gateway — read by checkout pages to decide Razorpay vs PayU
  activeGateway: publicProcedure.query(async () => {
    const row = await prisma.siteSetting.findUnique({ where: { key: "active_payment_gateway" } });
    const gw = (row?.value as string | null) ?? "razorpay";
    return { gateway: gw as "razorpay" | "payu" };
  }),

  // Create a Razorpay order and return fields needed by the checkout widget
  createOrder: protectedProcedure
    .input(z.object({ planId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const dbPlan = await prisma.plan.findUnique({ where: { id: input.planId } });
      const staticPlan = SEEKER_PLANS.find((p) => p.id === input.planId);
      const plan = dbPlan ?? staticPlan;
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Razorpay not configured." });
      }

      const receipt = `nxtsft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: plan.price * 100,
          currency: "INR",
          receipt,
          notes: { userId: ctx.user.id, planId: input.planId },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { description?: string } };
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err?.error?.description ?? "Failed to create Razorpay order.",
        });
      }

      const order = await res.json() as { id: string; amount: number; currency: string };

      await prisma.payment.create({
        data: {
          userId: ctx.user.id,
          amount: BigInt(plan.price * 100),
          status: "Pending",
          method: "Razorpay",
          gateway: "razorpay",
          razorpayOrderId: order.id,
          description: `${plan.name} plan — ${plan.credits} credits`,
          metadata: { planId: input.planId, credits: plan.credits },
        },
      });

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        planId: input.planId,
        credits: plan.credits,
        keyId,
        prefill: {
          name: ctx.user.name,
          email: ctx.user.email,
          contact: ctx.user.phone ?? "",
        },
      };
    }),

  // Create a PayU order — returns all fields needed for the checkout form POST
  createPayUOrder: protectedProcedure
    .input(z.object({ planId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const dbPlan = await prisma.plan.findUnique({ where: { id: input.planId } });
      const staticPlan = SEEKER_PLANS.find((p) => p.id === input.planId);
      const plan = dbPlan ?? staticPlan;
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });

      if (!process.env.PAYU_MERCHANT_KEY || !process.env.PAYU_MERCHANT_SALT) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "PayU not configured." });
      }

      const txnid = `nxtsft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const amount = plan.price.toFixed(2); // PayU expects rupees as string e.g. "299.00"
      const productinfo = `NxtSft ${plan.name} Plan`;
      const firstname = ctx.user.name.split(" ")[0] || ctx.user.name;
      const email = ctx.user.email;
      const phone = ctx.user.phone ?? "9999999999";
      const udf1 = ctx.user.id;   // userId — used in callback to grant credits
      const udf2 = input.planId;   // planId — used in callback to look up credits

      const hash = generatePayUHash({ txnid, amount, productinfo, firstname, email, udf1, udf2 });

      // Persist a Pending payment row so the callback can look it up
      await prisma.payment.create({
        data: {
          userId: ctx.user.id,
          amount: BigInt(plan.price * 100), // stored in paise
          status: "Pending",
          method: "PayU",
          gateway: "payu",
          payuTxnId: txnid,
          description: `${plan.name} plan — ${plan.credits} credits`,
          metadata: { planId: input.planId, credits: plan.credits },
        },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nxtsft.com";

      return {
        action: PAYU_BASE_URL,
        key: process.env.PAYU_MERCHANT_KEY,
        txnid,
        amount,
        productinfo,
        firstname,
        lastname: "",
        email,
        phone,
        udf1,
        udf2,
        surl: `${baseUrl}/api/payu/callback`,
        furl: `${baseUrl}/api/payu/callback`,
        hash,
      };
    }),

  // Verify Razorpay payment and grant credits
  verifyPayment: protectedProcedure
    .input(
      z.object({
        razorpayOrderId: safeString(200, 1),
        razorpayPaymentId: safeString(200, 1),
        razorpaySignature: safeString(200, 1),
        planId: z.string().min(1),
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
        // Update the pending payment row created by createOrder, or insert if missing
        prisma.payment.upsert({
          where: { razorpayOrderId: input.razorpayOrderId },
          update: { status: "Success", razorpayId: input.razorpayPaymentId },
          create: {
            userId: ctx.user.id,
            amount: BigInt(plan.price * 100),
            status: "Success",
            method: "Razorpay",
            gateway: "razorpay",
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

      await notify({
        userId: ctx.user.id,
        type: "payment_success",
        title: "Payment successful",
        content: `${plan.name} — ${plan.credits} credits added to your wallet.`,
      });

      return { ok: true, credits: updated.credits, planName: plan.name };
    }),

  // Create a Razorpay order for an owner/landlord subscription plan
  createOwnerOrder: protectedProcedure
    .input(z.object({ planId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const plan = OWNER_PLANS.find((p) => p.id === input.planId);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Razorpay not configured." });
      }

      const receipt = `nxtsft_owner_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: plan.price * 100,
          currency: "INR",
          receipt,
          notes: { userId: ctx.user.id, planId: input.planId, type: "owner_subscription" },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { description?: string } };
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err?.error?.description ?? "Failed to create Razorpay order.",
        });
      }

      const order = await res.json() as { id: string; amount: number; currency: string };

      await prisma.payment.create({
        data: {
          userId: ctx.user.id,
          amount: BigInt(plan.price * 100),
          status: "Pending",
          method: "Razorpay",
          gateway: "razorpay",
          razorpayOrderId: order.id,
          description: `${plan.name} subscription`,
          metadata: { planId: input.planId, type: "owner_subscription" },
        },
      });

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        planId: input.planId,
        planName: plan.name,
        keyId,
        prefill: {
          name: ctx.user.name,
          email: ctx.user.email,
          contact: ctx.user.phone ?? "",
        },
      };
    }),

  // Create a PayU order for an owner subscription plan (redirect flow)
  createOwnerPayUOrder: protectedProcedure
    .input(z.object({ planId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const plan = OWNER_PLANS.find((p) => p.id === input.planId);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });

      if (!process.env.PAYU_MERCHANT_KEY || !process.env.PAYU_MERCHANT_SALT) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "PayU not configured." });
      }

      const txnid = `nxtsft_owner_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const amount = plan.price.toFixed(2);
      const productinfo = `NxtSft ${plan.name}`;
      const firstname = ctx.user.name.split(" ")[0] || ctx.user.name;
      const email = ctx.user.email;
      const phone = ctx.user.phone ?? "9999999999";
      const udf1 = ctx.user.id;
      const udf2 = input.planId;

      const hash = generatePayUHash({ txnid, amount, productinfo, firstname, email, udf1, udf2 });

      await prisma.payment.create({
        data: {
          userId: ctx.user.id,
          amount: BigInt(plan.price * 100),
          status: "Pending",
          method: "PayU",
          gateway: "payu",
          payuTxnId: txnid,
          description: `${plan.name} subscription`,
          // type + validityDays stored so callback can create Subscription without importing plan data
          metadata: { planId: input.planId, type: "owner_subscription", validityDays: plan.validityDays, planName: plan.name, cycle: plan.cycle },
        },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nxtsft.com";

      return {
        action: PAYU_BASE_URL,
        key: process.env.PAYU_MERCHANT_KEY,
        txnid,
        amount,
        productinfo,
        firstname,
        lastname: "",
        email,
        phone,
        udf1,
        udf2,
        surl: `${baseUrl}/api/payu/callback`,
        furl: `${baseUrl}/api/payu/callback`,
        hash,
      };
    }),

  // Verify Razorpay payment for an owner subscription and activate it
  verifyOwnerPayment: protectedProcedure
    .input(
      z.object({
        razorpayOrderId: safeString(200, 1),
        razorpayPaymentId: safeString(200, 1),
        razorpaySignature: safeString(200, 1),
        planId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
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
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payment gateway not configured." });
      }

      const existingPayment = await prisma.payment.findFirst({
        where: { razorpayId: input.razorpayPaymentId },
      });
      if (existingPayment) {
        throw new TRPCError({ code: "CONFLICT", message: "Payment already processed." });
      }

      const plan = OWNER_PLANS.find((p) => p.id === input.planId);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });

      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + plan.validityDays);

      await Promise.all([
        prisma.subscription.create({
          data: {
            userId: ctx.user.id,
            planId: input.planId,
            planName: plan.name,
            amount: BigInt(plan.price * 100),
            status: "Active",
            cycle: plan.cycle,
            razorpayId: input.razorpayPaymentId,
            razorpayOrderId: input.razorpayOrderId,
            startDate: now,
            endDate,
          },
        }),
        prisma.payment.upsert({
          where: { razorpayOrderId: input.razorpayOrderId },
          update: { status: "Success", razorpayId: input.razorpayPaymentId },
          create: {
            userId: ctx.user.id,
            amount: BigInt(plan.price * 100),
            status: "Success",
            method: "Razorpay",
            gateway: "razorpay",
            razorpayId: input.razorpayPaymentId,
            razorpayOrderId: input.razorpayOrderId,
            description: `${plan.name} subscription`,
          },
        }),
      ]);

      return { ok: true, planName: plan.name, endDate };
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
