import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, protectedProcedure, adminProcedure } from "../server";

const safeUserSelect = {
  id: true,
  email: true,
  phone: true,
  name: true,
  avatar: true,
  role: true,
  verified: true,
  city: true,
  state: true,
  bio: true,
  credits: true,
  joined: true,
  lastActive: true,
};

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: safeUserSelect,
    });
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100).optional(),
        phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
        city: z.string().min(2).optional(),
        state: z.string().optional(),
        bio: z.string().max(500).optional(),
        avatar: z.string().url().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.phone) {
        const conflict = await prisma.user.findFirst({
          where: { phone: input.phone, id: { not: ctx.user.id } },
        });
        if (conflict) throw new TRPCError({ code: "CONFLICT", message: "Phone already in use." });
      }

      return prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
        select: safeUserSelect,
      });
    }),

  credits: protectedProcedure.query(async ({ ctx }) => {
    const [user, transactions] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { credits: true } }),
      prisma.creditTransaction.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return { balance: user.credits, transactions };
  }),

  // After Razorpay payment success — credits are granted by subscriptions router
  // This endpoint is for admin top-ups only
  addCredits: adminProcedure
    .input(z.object({ userId: z.string(), amount: z.number().int().positive(), reason: z.string() }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

      await Promise.all([
        prisma.user.update({ where: { id: input.userId }, data: { credits: { increment: input.amount } } }),
        prisma.creditTransaction.create({
          data: { userId: input.userId, type: "credit", amount: input.amount, reason: input.reason },
        }),
      ]);

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: input.userId },
        select: { credits: true },
      });
      return { credits: updated.credits };
    }),

  favorites: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      include: {
        favorites: {
          where: { deletedAt: null },
          include: { location: true },
        },
      },
    });

    return user.favorites.map((p) => ({
      ...p,
      price: Number(p.price),
    }));
  }),

  addFavorite: protectedProcedure
    .input(z.object({ propertyId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const property = await prisma.property.findFirst({ where: { id: input.propertyId, deletedAt: null } });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { favorites: { connect: { id: input.propertyId } } },
      });
      return { ok: true };
    }),

  removeFavorite: protectedProcedure
    .input(z.object({ propertyId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { favorites: { disconnect: { id: input.propertyId } } },
      });
      return { ok: true };
    }),

  siteVisits: protectedProcedure.query(async ({ ctx }) => {
    return prisma.siteVisit.findMany({
      where: { userId: ctx.user.id },
      orderBy: { scheduledAt: "desc" },
    });
  }),
});
