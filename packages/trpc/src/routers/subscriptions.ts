import { createHmac, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { notify } from "../notify";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../server";
import {
  cuidSchema,
  planIdSchema,
  safeString,
  priceSchema,
  highlightsSchema,
  planTypeSchema,
  boostTierSchema,
  cursorSchema,
  limitSchema,
} from "../sanitize";
import { generatePayUHash, PAYU_BASE_URL } from "../payu";
import { BOOST_TIERS, isBoostTier, type BoostTier } from "@nxtsft/shared/constants";

// All plan lookups are DB-only. Legacy static arrays have been removed.
// Plans are managed via the admin Plans Manager (prisma.plan table).

// Resolve an owner plan by id — DB only, must be an active owner-* plan.
// Rejects seeker plan ids so the owner checkout path can never be used to
// dodge the credit-plan flow.
async function findOwnerPlan(planId: string) {
  const dbPlan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!dbPlan || !dbPlan.type.startsWith("owner") || !dbPlan.active) return null;
  return {
    id: dbPlan.id,
    name: dbPlan.name,
    price: dbPlan.price,
    validityDays: dbPlan.validity,
    cycle: dbPlan.validity <= 7 ? "weekly" : "monthly",
  };
}

// Resolve a seeker (credit) plan for new orders — DB only, must be an active
// seeker plan. Owner plan ids are rejected so the credit checkout can't be
// pointed at a subscription plan.
async function findSeekerPlan(planId: string) {
  const dbPlan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!dbPlan || dbPlan.type !== "seeker" || !dbPlan.active) return null;
  return dbPlan;
}

export const subscriptionsRouter = router({
  // List available plans — DB is the single source of truth (managed via the
  // Plans Manager). No static fallback: an unseeded DB shows no plans.
  plans: publicProcedure
    .input(z.object({ type: planTypeSchema.optional() }))
    .query(async ({ input }) => {
      const where = input.type ? { type: input.type, active: true } : { active: true };
      return prisma.plan.findMany({ where, orderBy: { price: "asc" } });
    }),

  // Get single plan
  plan: publicProcedure
    .input(z.object({ id: planIdSchema }))
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
      const plan = await findSeekerPlan(input.planId);
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
      const plan = await findSeekerPlan(input.planId);
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

      // Bind the plan to the pending order created by createOrder — never trust
      // the client-supplied planId. Otherwise a user could pay for the cheapest
      // plan and replay the valid signature with an expensive planId to mint a
      // larger credit grant. The signature only covers orderId|paymentId, so the
      // plan/amount must come from our own recorded order row.
      const pendingOrder = await prisma.payment.findFirst({
        where: { razorpayOrderId: input.razorpayOrderId, userId: ctx.user.id, gateway: "razorpay" },
      });
      if (!pendingOrder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      }
      const boundPlanId = (pendingOrder.metadata as { planId?: string } | null)?.planId;
      if (!boundPlanId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Order is missing plan information." });
      }

      const plan = await prisma.plan.findUnique({ where: { id: boundPlanId } });

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
        actionUrl: "/user-portal#credits",
        content: `${plan.name} — ${plan.credits} credits added to your wallet.`,
      });

      return { ok: true, credits: updated.credits, planName: plan.name };
    }),

  // Create a Razorpay order for an owner/landlord subscription plan
  createOwnerOrder: protectedProcedure
    .input(z.object({ planId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const plan = await findOwnerPlan(input.planId);
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
      const plan = await findOwnerPlan(input.planId);
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

      // Bind the plan to the pending order — never trust the client planId (see
      // verifyPayment). Prevents paying for a cheap tier then activating a higher
      // one via a replayed-but-valid signature.
      const pendingOrder = await prisma.payment.findFirst({
        where: { razorpayOrderId: input.razorpayOrderId, userId: ctx.user.id, gateway: "razorpay" },
      });
      if (!pendingOrder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      }
      const boundPlanId = (pendingOrder.metadata as { planId?: string } | null)?.planId;
      if (!boundPlanId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Order is missing plan information." });
      }

      const plan = await findOwnerPlan(boundPlanId);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });

      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + plan.validityDays);

      await Promise.all([
        prisma.subscription.create({
          data: {
            userId: ctx.user.id,
            planId: boundPlanId,
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

  // Create a Razorpay order for a designer/decor "Business Listing" plan.
  // Same shape as createOwnerOrder, but sourced from the DB Plan table
  // (not a hardcoded array) so pricing changes don't need a deploy.
  createBusinessOrder: protectedProcedure
    .input(z.object({ planId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
      if (!plan || (plan.type !== "designer" && plan.type !== "decor")) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });
      }

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Razorpay not configured." });
      }

      const receipt = `nxtsft_biz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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
        prefill: { name: ctx.user.name, email: ctx.user.email, contact: ctx.user.phone ?? "" },
      };
    }),

  // Create a PayU order for a designer/decor plan (redirect flow). Sets the
  // SAME "owner_subscription" metadata marker the PayU callback route already
  // branches on generically — the callback route needs no changes.
  createBusinessPayUOrder: protectedProcedure
    .input(z.object({ planId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
      if (!plan || (plan.type !== "designer" && plan.type !== "decor")) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });
      }

      if (!process.env.PAYU_MERCHANT_KEY || !process.env.PAYU_MERCHANT_SALT) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "PayU not configured." });
      }

      const txnid = `nxtsft_biz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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
          metadata: { planId: input.planId, type: "owner_subscription", validityDays: plan.validity, planName: plan.name, cycle: "monthly" },
        },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nxtsft.com";

      return {
        action: PAYU_BASE_URL,
        key: process.env.PAYU_MERCHANT_KEY,
        txnid, amount, productinfo, firstname,
        lastname: "",
        email, phone, udf1, udf2,
        surl: `${baseUrl}/api/payu/callback`,
        furl: `${baseUrl}/api/payu/callback`,
        hash,
      };
    }),

  // Verify Razorpay payment for a designer/decor plan and activate the
  // subscription. Mirrors verifyOwnerPayment; DB-plan-sourced instead of
  // OWNER_PLANS-sourced, and always monthly (this vertical has one flat
  // plan, no weekly/tiered cycles).
  verifyBusinessPayment: protectedProcedure
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

      const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
      if (!plan || (plan.type !== "designer" && plan.type !== "decor")) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });
      }

      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + plan.validity);

      await Promise.all([
        prisma.subscription.create({
          data: {
            userId: ctx.user.id,
            planId: input.planId,
            planName: plan.name,
            amount: BigInt(plan.price * 100),
            status: "Active",
            cycle: "monthly",
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

  // Type-scoped current-subscription lookup for the "My Business" tab.
  // Unlike myCurrent (which returns whichever Subscription is most recently
  // created regardless of type — wrong for a user who's both a buyer and a
  // business owner), this filters to designer/decor plan ids specifically.
  myBusinessSubscription: protectedProcedure.query(async ({ ctx }) => {
    const businessPlans = await prisma.plan.findMany({
      where: { type: { in: ["designer", "decor"] } },
      select: { id: true },
    });
    if (businessPlans.length === 0) return null;

    const sub = await prisma.subscription.findFirst({
      where: {
        userId: ctx.user.id,
        status: "Active",
        planId: { in: businessPlans.map((p) => p.id) },
      },
      orderBy: { createdAt: "desc" },
    });
    return sub ? { ...sub, amount: Number(sub.amount) } : null;
  }),

  // Active subscription for current user
  myCurrent: protectedProcedure.query(async ({ ctx }) => {
    const sub = await prisma.subscription.findFirst({
      where: { userId: ctx.user.id, status: "Active" },
      orderBy: { createdAt: "desc" },
    });
    return sub ? { ...sub, amount: Number(sub.amount) } : null;
  }),

  // Seller listing quota — how many listings the seller's active plan allows vs
  // how many they've already posted. Powers the LA-322 "upgrade to activate"
  // message shown after a seller submits a listing. The listing allowance isn't
  // a structured field: seller (owner-*) plans encode it in their feature list
  // ("1 listing", "3 listings", "Unlimited listings"), so we parse it from there.
  sellerListingQuota: protectedProcedure.query(async ({ ctx }) => {
    // Most recent active owner-* subscription, if any.
    const ownerPlans = await prisma.plan.findMany({
      where: { type: { in: ["owner-rent", "owner-sell"] } },
      select: { id: true, name: true, features: true },
    });
    const ownerPlanById = new Map(ownerPlans.map((p) => [p.id, p]));

    const sub = await prisma.subscription.findFirst({
      where: {
        userId: ctx.user.id,
        status: "Active",
        planId: { in: ownerPlans.map((p) => p.id) },
      },
      orderBy: { createdAt: "desc" },
    });

    // A listing credit is consumed only once a listing is approved & live
    // (LA-321), so count Active listings — a freshly-submitted Pending one
    // hasn't consumed the seller's allowance yet.
    const used = await prisma.property.count({
      where: { ownerId: ctx.user.id, deletedAt: null, status: "Active" },
    });

    if (!sub) {
      return { hasPlan: false, planName: null, allowance: 0, used, remaining: 0, exhausted: true };
    }

    // Parse the listing allowance from the plan's feature list. "Unlimited"
    // → null (no cap). Otherwise the first "<n> listing(s)" number wins; if the
    // feature text ever drops the count, fall back to a 1-listing allowance.
    const features = ownerPlanById.get(sub.planId)?.features ?? [];
    const joined = features.join(" ").toLowerCase();
    const unlimited = joined.includes("unlimited listing");
    const match = joined.match(/(\d+)\s*listing/);
    const allowance = unlimited ? null : match ? Number(match[1]) : 1;

    const remaining = allowance === null ? null : Math.max(0, allowance - used);
    const exhausted = allowance !== null && used >= allowance;

    return { hasPlan: true, planName: sub.planName, allowance, used, remaining, exhausted };
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

  // ── Listing boosts ────────────────────────────────────────────────────────
  // "Pay to jump the queue": a seller buys a bronze/silver/gold boost for one
  // of their listings, which ranks it above unboosted listings until it lapses.

  // Tiers on offer. Public so the Boost modal can render prices before sign-in.
  boostPlans: publicProcedure.query(async () => {
    const plans = await prisma.plan.findMany({
      where: { type: "boost", active: true },
      orderBy: { price: "asc" },
    });
    return plans.map((p) => ({
      ...p,
      tag: isBoostTier(p.boostTier) ? BOOST_TIERS[p.boostTier].tag : null,
    }));
  }),

  createBoostOrder: protectedProcedure
    .input(z.object({ propertyId: cuidSchema, planId: planIdSchema }))
    .mutation(async ({ input, ctx }) => {
      const property = await prisma.property.findFirst({
        where: { id: input.propertyId, deletedAt: null },
        select: { id: true, title: true, ownerId: true, status: true },
      });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      const isAdmin = ["admin", "super-admin"].includes(ctx.user.role);
      if (property.ownerId !== ctx.user.id && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only boost your own listing." });
      }
      // Boosting a Pending/Sold/Inactive listing buys nothing — it isn't in search.
      if (property.status !== "Active") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only an active listing can be boosted.",
        });
      }

      const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
      if (!plan || plan.type !== "boost" || !plan.active || !isBoostTier(plan.boostTier)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Boost plan not found." });
      }

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Razorpay not configured." });
      }

      const receipt = `nxtsft_boost_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: plan.price * 100,
          currency: "INR",
          receipt,
          notes: { userId: ctx.user.id, planId: plan.id, propertyId: property.id },
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { description?: string } };
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err?.error?.description ?? "Failed to create Razorpay order.",
        });
      }
      const order = (await res.json()) as { id: string; amount: number; currency: string };

      // metadata is the ONLY thing verifyBoostPayment trusts — see the comment there.
      await prisma.payment.create({
        data: {
          userId: ctx.user.id,
          amount: BigInt(plan.price * 100),
          status: "Pending",
          method: "Razorpay",
          gateway: "razorpay",
          razorpayOrderId: order.id,
          description: `${plan.name} boost — ${property.title}`,
          metadata: { planId: plan.id, propertyId: property.id, boostTier: plan.boostTier },
        },
      });

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
        planId: plan.id,
        prefill: { name: ctx.user.name, email: ctx.user.email, contact: ctx.user.phone ?? "" },
      };
    }),

  verifyBoostPayment: protectedProcedure
    .input(
      z.object({
        razorpayOrderId: safeString(200, 1),
        razorpayPaymentId: safeString(200, 1),
        razorpaySignature: safeString(200, 1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Same integrity gate as verifyPayment: verify the HMAC when a secret is
      // configured, and fail closed in production when one isn't.
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

      // Reject duplicate/replayed payment IDs even if the signature checks out.
      const existingPayment = await prisma.payment.findFirst({
        where: { razorpayId: input.razorpayPaymentId },
      });
      if (existingPayment) {
        throw new TRPCError({ code: "CONFLICT", message: "Payment already processed." });
      }

      // Bind BOTH the plan and the property to the order we recorded in
      // createBoostOrder — never trust client input. The signature only covers
      // orderId|paymentId, so a client could otherwise pay for Bronze and replay
      // the valid signature naming Gold, or name a listing they don't own.
      const pendingOrder = await prisma.payment.findFirst({
        where: { razorpayOrderId: input.razorpayOrderId, userId: ctx.user.id, gateway: "razorpay" },
      });
      if (!pendingOrder) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });

      const meta = (pendingOrder.metadata ?? {}) as { planId?: string; propertyId?: string };
      if (!meta.planId || !meta.propertyId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Order is missing boost information." });
      }

      const plan = await prisma.plan.findUnique({ where: { id: meta.planId } });
      if (!plan || plan.type !== "boost" || !isBoostTier(plan.boostTier)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Boost plan not found." });
      }
      const tier = plan.boostTier;

      const property = await prisma.property.findFirst({
        where: { id: meta.propertyId, deletedAt: null },
        select: { id: true, title: true, slug: true, ownerId: true, boostTier: true, boostExpiry: true },
      });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      const isAdmin = ["admin", "super-admin"].includes(ctx.user.role);
      if (property.ownerId !== ctx.user.id && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only boost your own listing." });
      }

      // Re-boosting stacks: extend from whichever is later (now, current expiry),
      // and keep the stronger of the two tiers rather than silently downgrading
      // someone who buys Bronze while a Gold boost is still running.
      const now = new Date();
      const activeUntil =
        property.boostExpiry && property.boostExpiry > now ? property.boostExpiry : now;
      const expiry = new Date(activeUntil.getTime() + plan.validity * 86_400_000);

      const stillRunning = property.boostExpiry != null && property.boostExpiry > now;
      const keepExisting =
        stillRunning &&
        isBoostTier(property.boostTier) &&
        BOOST_TIERS[property.boostTier].score > BOOST_TIERS[tier].score;
      const nextTier: BoostTier = keepExisting ? (property.boostTier as BoostTier) : tier;

      await prisma.$transaction([
        prisma.property.update({
          where: { id: property.id },
          data: {
            boostTier: nextTier,
            boostScore: BOOST_TIERS[nextTier].score,
            boostExpiry: expiry,
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
            description: `${plan.name} boost — ${property.title}`,
            metadata: { planId: plan.id, propertyId: property.id, boostTier: nextTier },
          },
        }),
      ]);

      await notify({
        userId: property.ownerId,
        type: "payment_success",
        title: "Boost is live",
        actionUrl: `/properties/${property.slug}`,
        content: `"${property.title}" is boosted until ${expiry.toLocaleDateString("en-IN")}.`,
      });

      return { propertyId: property.id, boostTier: nextTier, boostExpiry: expiry.toISOString() };
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
        boostTier: boostTierSchema.optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // A boost plan is useless without a tier — it would sell a listing zero
      // priority. Reject rather than create a dud SKU.
      if (input.type === "boost" && !input.boostTier) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A boost plan needs a tier." });
      }
      return prisma.plan.create({ data: input });
    }),

  updatePlan: adminProcedure
    .input(
      z.object({
        id: planIdSchema,
        name: safeString(100, 1).optional(),
        price: priceSchema.optional(),
        priceLabel: safeString(20, 1).optional(),
        credits: z.number().int().nonnegative().optional(),
        validity: z.number().int().positive().optional(),
        tagline: safeString(200).optional(),
        features: highlightsSchema.optional(),
        popular: z.boolean().optional(),
        active: z.boolean().optional(),
        boostTier: boostTierSchema.optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.plan.update({ where: { id }, data });
    }),

  deletePlan: adminProcedure
    .input(z.object({ id: planIdSchema }))
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
