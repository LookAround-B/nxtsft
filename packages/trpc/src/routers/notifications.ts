import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, protectedProcedure } from "../server.js";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().default(false),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { cursor, limit, unreadOnly } = input;

      const where: NonNullable<Parameters<typeof prisma.notification.findMany>[0]>["where"] = {
        userId: ctx.user.id,
      };
      if (unreadOnly) where.read = false;

      const items = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;
      return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await prisma.notification.count({
      where: { userId: ctx.user.id, read: false },
    });
    return { count };
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await prisma.notification.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: { read: true, readAt: new Date() },
      });
      return { ok: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await prisma.notification.updateMany({
      where: { userId: ctx.user.id, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { ok: true };
  }),
});
