import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@nxtsft/db";
import { router, protectedProcedure, adminProcedure } from "../server.js";

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
  twoFactorEnabled: true,
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
    const visits = await prisma.siteVisit.findMany({
      where: { userId: ctx.user.id },
      orderBy: { scheduledAt: "desc" },
    });

    // SiteVisit has no Prisma relation to Property, so join manually by id.
    const propertyIds = [...new Set(visits.map((v) => v.propertyId))];
    const properties = await prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: {
        id: true,
        slug: true,
        title: true,
        images: true,
        location: { select: { city: true, locality: true } },
      },
    });
    const byId = new Map(properties.map((p) => [p.id, p]));

    return visits.map((v) => ({ ...v, property: byId.get(v.propertyId) ?? null }));
  }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { passwordHash: true },
      });

      if (!user.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Password not set for this account." });
      }

      const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect current password." });
      }

      const passwordHash = await bcrypt.hash(input.newPassword, 12);
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { passwordHash },
      });

      return { ok: true };
    }),

  myListings: protectedProcedure.query(async ({ ctx }) => {
    const properties = await prisma.property.findMany({
      where: { ownerId: ctx.user.id, deletedAt: null },
      include: {
        location: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return properties.map((p) => ({
      ...p,
      price: Number(p.price),
    }));
  }),

  sessions: protectedProcedure.query(async ({ ctx }) => {
    return prisma.session.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });
  }),

  terminateSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const session = await prisma.session.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
      }

      if (session.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot terminate another user's session." });
      }

      await prisma.session.delete({
        where: { id: input.sessionId },
      });

      return { ok: true };
    }),

  toggleTwoFactor: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      return prisma.user.update({
        where: { id: ctx.user.id },
        data: { twoFactorEnabled: input.enabled },
        select: { id: true, twoFactorEnabled: true },
      });
    }),
});
