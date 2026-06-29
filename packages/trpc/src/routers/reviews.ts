import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, publicProcedure, protectedProcedure } from "../server.js";
import {
  safeString,
  cuidSchema,
  cursorSchema,
  limitSchema,
  ratingSchema,
} from "../sanitize.js";

export const reviewsRouter = router({
  // Public: only Approved reviews are visible on the property page
  list: publicProcedure
    .input(
      z.object({
        propertyId: cuidSchema,
        cursor: cursorSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { propertyId, cursor, limit } = input;

      const items = await prisma.review.findMany({
        where: { propertyId, status: "Approved" },
        include: {
          author: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;

      return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
    }),

  // Protected: user must be logged in to submit — goes to Pending, notifies admins
  create: protectedProcedure
    .input(
      z.object({
        propertyId: cuidSchema,
        rating: ratingSchema,
        title: safeString(100, 3),
        content: safeString(1000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const property = await prisma.property.findFirst({
        where: { id: input.propertyId, deletedAt: null },
        select: { id: true, title: true },
      });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      const existing = await prisma.review.findFirst({
        where: { propertyId: input.propertyId, authorId: ctx.user.id },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "You have already reviewed this property." });
      }

      const review = await prisma.review.create({
        data: {
          propertyId: input.propertyId,
          authorId: ctx.user.id,
          rating: input.rating,
          title: input.title,
          content: input.content,
          status: "Pending",
        },
      });

      // Notify all admins and super-admins
      const admins = await prisma.user.findMany({
        where: { role: { in: ["admin", "super-admin"] } },
        select: { id: true },
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type: "review",
            title: "New review pending approval",
            content: `${ctx.user.name} left a ${input.rating}★ review on "${property.title}" — needs your approval.`,
          })),
        });
      }

      return review;
    }),

  markHelpful: protectedProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input }) => {
      const review = await prisma.review.findUnique({ where: { id: input.id } });
      if (!review) throw new TRPCError({ code: "NOT_FOUND", message: "Review not found." });

      return prisma.review.update({
        where: { id: input.id },
        data: { helpful: { increment: 1 } },
      });
    }),
});
