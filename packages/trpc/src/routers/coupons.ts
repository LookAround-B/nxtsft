import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, adminProcedure, staffProcedure } from "../server";
import { cuidSchema, safeString, datetimeSchema } from "../sanitize";

// Discount coupons a sales rep applies when sending a payment link (see
// leads.createPaymentLink). Admin defines the code, flat ₹ off, a total-use cap
// and an expiry; reps see every active/in-date/not-exhausted coupon.

// Codes are stored uppercased so "diwali" and "DIWALI" are the same coupon.
const couponCodeSchema = z
  .string()
  .trim()
  .min(3, "Code must be at least 3 characters")
  .max(24, "Code is too long")
  .regex(/^[A-Za-z0-9]+$/, "Use letters and numbers only")
  .transform((s) => s.toUpperCase());

/** Shape returned to the rep dashboard — no internal counters beyond remaining. */
function toRepView(c: { code: string; description: string | null; discountRupees: number; maxUses: number; usedCount: number; validUntil: Date }) {
  return {
    code: c.code,
    description: c.description,
    discountRupees: c.discountRupees,
    remaining: Math.max(0, c.maxUses - c.usedCount),
    validUntil: c.validUntil,
  };
}

export const couponsRouter = router({
  // ── Admin CRUD ────────────────────────────────────────────────────────────
  create: adminProcedure
    .input(
      z.object({
        code: couponCodeSchema,
        description: safeString(120).optional(),
        discountRupees: z.number().int().positive().max(10_000_000),
        maxUses: z.number().int().positive().max(1_000_000),
        validUntil: datetimeSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const validUntil = new Date(input.validUntil);
      if (validUntil.getTime() <= Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Valid-until must be in the future." });
      }
      const existing = await prisma.coupon.findUnique({ where: { code: input.code } });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: `Coupon "${input.code}" already exists.` });
      }
      return prisma.coupon.create({
        data: {
          code: input.code,
          description: input.description || null,
          discountRupees: input.discountRupees,
          maxUses: input.maxUses,
          validUntil,
          createdById: ctx.user.id,
        },
      });
    }),

  // All coupons for the admin table, newest first, with derived status.
  list: adminProcedure.query(async () => {
    const items = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    const now = Date.now();
    return items.map((c) => ({
      ...c,
      remaining: Math.max(0, c.maxUses - c.usedCount),
      expired: c.validUntil.getTime() <= now,
      exhausted: c.usedCount >= c.maxUses,
    }));
  }),

  setActive: adminProcedure
    .input(z.object({ id: cuidSchema, active: z.boolean() }))
    .mutation(async ({ input }) => {
      return prisma.coupon.update({ where: { id: input.id }, data: { active: input.active } });
    }),

  // Hard-delete only an unused coupon; once it has redemptions we keep the row
  // (leads reference its code) and just deactivate so the history stays intact.
  remove: adminProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input }) => {
      const coupon = await prisma.coupon.findUnique({ where: { id: input.id } });
      if (!coupon) throw new TRPCError({ code: "NOT_FOUND", message: "Coupon not found." });
      if (coupon.usedCount > 0) {
        await prisma.coupon.update({ where: { id: input.id }, data: { active: false } });
        return { deleted: false as const, deactivated: true as const };
      }
      await prisma.coupon.delete({ where: { id: input.id } });
      return { deleted: true as const, deactivated: false as const };
    }),

  // ── Rep dashboard ───────────────────────────────────────────────────────────
  // Coupons a rep may apply right now: active, not past validUntil, not exhausted.
  available: staffProcedure.query(async () => {
    const items = await prisma.coupon.findMany({
      where: { active: true, validUntil: { gte: new Date() } },
      orderBy: { validUntil: "asc" },
    });
    return items.filter((c) => c.usedCount < c.maxUses).map(toRepView);
  }),
});
