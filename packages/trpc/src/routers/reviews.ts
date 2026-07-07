import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, publicProcedure, protectedProcedure } from "../server";
import { portalBase } from "../notify";
import {
  safeString,
  cuidSchema,
  cursorSchema,
  limitSchema,
  ratingSchema,
} from "../sanitize";

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
        select: { id: true, role: true },
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type: "review",
            title: "New review pending approval",
            content: `${ctx.user.name} left a ${input.rating}★ review on "${property.title}" — needs your approval.`,
            actionUrl: `${portalBase(a.role)}#reviews`,
          })),
        });
      }

      return review;
    }),

  // Toggle: one "helpful" vote per user per review, enforced by the unique
  // (reviewId, userId) constraint on ReviewHelpful. Voting again removes the
  // vote. Review.helpful is the denormalized display count, updated in the
  // same batch transaction as the vote row so the two can't drift. LA-294.
  markHelpful: protectedProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const review = await prisma.review.findUnique({ where: { id: input.id } });
      if (!review) throw new TRPCError({ code: "NOT_FOUND", message: "Review not found." });

      const existing = await prisma.reviewHelpful.findUnique({
        where: { reviewId_userId: { reviewId: input.id, userId: ctx.user.id } },
      });

      if (existing) {
        const [, updated] = await prisma.$transaction([
          prisma.reviewHelpful.delete({ where: { id: existing.id } }),
          prisma.review.update({
            where: { id: input.id },
            data: { helpful: { decrement: 1 } },
          }),
        ]);
        return { ...updated, votedByMe: false };
      }

      try {
        const [, updated] = await prisma.$transaction([
          prisma.reviewHelpful.create({
            data: { reviewId: input.id, userId: ctx.user.id },
          }),
          prisma.review.update({
            where: { id: input.id },
            data: { helpful: { increment: 1 } },
          }),
        ]);
        return { ...updated, votedByMe: true };
      } catch (err) {
        // P2002 = a concurrent double-submit hit the unique constraint; the
        // vote already exists, so treat it as a no-op rather than an error.
        if ((err as { code?: string })?.code === "P2002") {
          return { ...review, votedByMe: true };
        }
        throw err;
      }
    }),
});
