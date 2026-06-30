import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, publicProcedure, protectedProcedure, staffProcedure } from "../server";
import { cuidSchema } from "../sanitize";

const viewWithProperty = {
  property: {
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      bhk: true,
      images: true,
      location: { select: { city: true, locality: true } },
    },
  },
} as const;

export const propertyViewsRouter = router({
  // Record a property view. Works for anonymous (userId null) or logged-in users.
  record: publicProcedure
    .input(
      z.object({
        propertyId: cuidSchema,
        durationSec: z.number().int().min(0).max(86_400).optional(),
        contactUnlocked: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const property = await prisma.property.findFirst({
        where: { id: input.propertyId, deletedAt: null },
        select: { id: true },
      });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      await prisma.$transaction([
        prisma.propertyView.create({
          data: {
            propertyId: input.propertyId,
            userId: ctx.user?.id ?? null,
            durationSec: input.durationSec ?? 0,
            contactUnlocked: input.contactUnlocked ?? false,
          },
        }),
        prisma.property.update({
          where: { id: input.propertyId },
          data: { views: { increment: 1 } },
        }),
      ]);

      return { ok: true };
    }),

  // Current user's view history + activity stats (User portal §5.3 Recently Viewed)
  mine: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional())
    .query(async ({ input, ctx }) => {
      const rows = await prisma.propertyView.findMany({
        where: { userId: ctx.user.id },
        include: viewWithProperty,
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
      });

      const items = rows.map((v) => ({
        id: v.id,
        durationSec: v.durationSec,
        contactUnlocked: v.contactUnlocked,
        createdAt: v.createdAt,
        property: v.property
          ? { ...v.property, price: Number(v.property.price) }
          : null,
      }));

      const totalDurationSec = items.reduce((a, v) => a + v.durationSec, 0);
      const stats = {
        totalViews: items.length,
        contactsUnlocked: items.filter((v) => v.contactUnlocked).length,
        citiesExplored: new Set(items.map((v) => v.property?.location?.city).filter(Boolean)).size,
        totalDurationSec,
        avgDurationSec: items.length ? Math.round(totalDurationSec / items.length) : 0,
      };

      return { items, stats };
    }),

  // Platform-wide view events for Admin §6.7 Property Views Analytics
  analytics: staffProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
    .query(async ({ input }) => {
      const rows = await prisma.propertyView.findMany({
        include: {
          ...viewWithProperty,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
      });

      const [totalViews, unlockedViews] = await Promise.all([
        prisma.propertyView.count(),
        prisma.propertyView.count({ where: { contactUnlocked: true } }),
      ]);

      const items = rows.map((v) => ({
        id: v.id,
        durationSec: v.durationSec,
        contactUnlocked: v.contactUnlocked,
        createdAt: v.createdAt,
        viewer: v.user ? v.user.name : "Anonymous",
        property: v.property ? { ...v.property, price: Number(v.property.price) } : null,
      }));

      return { items, totalViews, unlockedViews };
    }),
});
