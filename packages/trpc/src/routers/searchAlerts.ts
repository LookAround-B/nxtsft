import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, protectedProcedure } from "../server";
import {
  safeString,
  cuidSchema,
  searchAlertFiltersSchema,
  alertFrequencySchema,
} from "../sanitize";

export const searchAlertsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return prisma.searchAlert.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: safeString(100, 1),
        filters: searchAlertFiltersSchema,
        frequency: alertFrequencySchema.default("daily"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return prisma.searchAlert.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          filters: input.filters,
          frequency: input.frequency,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: cuidSchema,
        name: safeString(100, 1).optional(),
        filters: searchAlertFiltersSchema.optional(),
        frequency: alertFrequencySchema.optional(),
        active: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const alert = await prisma.searchAlert.findUnique({ where: { id: input.id } });
      if (!alert) throw new TRPCError({ code: "NOT_FOUND", message: "Search alert not found." });
      if (alert.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const { id, ...data } = input;
      return prisma.searchAlert.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const alert = await prisma.searchAlert.findUnique({ where: { id: input.id } });
      if (!alert) throw new TRPCError({ code: "NOT_FOUND", message: "Search alert not found." });
      if (alert.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      await prisma.searchAlert.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  toggle: protectedProcedure
    .input(z.object({ id: cuidSchema, active: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const alert = await prisma.searchAlert.findUnique({ where: { id: input.id } });
      if (!alert) throw new TRPCError({ code: "NOT_FOUND", message: "Search alert not found." });
      if (alert.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      return prisma.searchAlert.update({
        where: { id: input.id },
        data: { active: input.active },
      });
    }),
});
