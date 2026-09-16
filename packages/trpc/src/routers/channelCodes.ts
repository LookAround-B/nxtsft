import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, adminProcedure } from "../server";
import { cuidSchema, safeString } from "../sanitize";

// Marketing attribution codes (FB10, INSTA20, SALES_RAJU): admin registers them,
// a seller types one on the list form, and the admin report shows how many
// listings each channel produced. Tracking only — no discount, no price impact.
// See properties.create (capture) and Property.channelCode (storage).

const channelCodeSchema = z
  .string()
  .trim()
  .min(2, "Code must be at least 2 characters")
  .max(32, "Code is too long")
  .regex(/^[A-Za-z0-9_]+$/, "Use letters, numbers and underscores only")
  .transform((s) => s.toUpperCase());

export const channelCodesRouter = router({
  create: adminProcedure
    .input(
      z.object({
        code: channelCodeSchema,
        label: safeString(80, 1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.channelCode.findUnique({ where: { code: input.code } });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: `Code "${input.code}" already exists.` });
      }
      return prisma.channelCode.create({
        data: { code: input.code, label: input.label, createdById: ctx.user.id },
      });
    }),

  list: adminProcedure.query(async () => {
    return prisma.channelCode.findMany({ orderBy: { createdAt: "desc" } });
  }),

  setActive: adminProcedure
    .input(z.object({ id: cuidSchema, active: z.boolean() }))
    .mutation(async ({ input }) => {
      return prisma.channelCode.update({ where: { id: input.id }, data: { active: input.active } });
    }),

  // Hard-delete only if no listing carries the code; otherwise keep the row so
  // the report history stays intact and just deactivate it.
  remove: adminProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input }) => {
      const code = await prisma.channelCode.findUnique({ where: { id: input.id } });
      if (!code) throw new TRPCError({ code: "NOT_FOUND", message: "Code not found." });
      const inUse = await prisma.property.count({ where: { channelCode: code.code } });
      if (inUse > 0) {
        await prisma.channelCode.update({ where: { id: input.id }, data: { active: false } });
        return { deleted: false as const, deactivated: true as const };
      }
      await prisma.channelCode.delete({ where: { id: input.id } });
      return { deleted: true as const, deactivated: false as const };
    }),

  // Listings per channel: total + how many went live. Includes registered codes
  // with zero listings so a dud channel is visible too.
  report: adminProcedure.query(async () => {
    const codes = await prisma.channelCode.findMany({ orderBy: { createdAt: "desc" } });

    const totals = await prisma.property.groupBy({
      by: ["channelCode"],
      where: { channelCode: { not: null }, deletedAt: null },
      _count: { _all: true },
    });
    const lives = await prisma.property.groupBy({
      by: ["channelCode"],
      where: { channelCode: { not: null }, deletedAt: null, status: "Active" },
      _count: { _all: true },
    });

    const totalBy = new Map(totals.map((t) => [t.channelCode, t._count._all]));
    const liveBy = new Map(lives.map((t) => [t.channelCode, t._count._all]));

    return codes.map((c) => ({
      id: c.id,
      code: c.code,
      label: c.label,
      active: c.active,
      listings: totalBy.get(c.code) ?? 0,
      live: liveBy.get(c.code) ?? 0,
    }));
  }),
});
