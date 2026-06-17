import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  nameSchema,
  phoneSchema,
  geoTextSchema,
  noteSchema,
  safeUrlSchema,
  cuidSchema,
  safeString,
  passwordSchema,
} from "../sanitize.js";
import bcrypt from "bcryptjs";
import prisma from "@nxtsft/db";
import { router, protectedProcedure, adminProcedure } from "../server.js";

const NOTIFICATION_PREF_KEYS = ["email", "whatsapp", "sms", "marketing"] as const;
type NotificationPrefs = Record<(typeof NOTIFICATION_PREF_KEYS)[number], boolean>;

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email: true,
  whatsapp: true,
  sms: false,
  marketing: false,
};

const notificationPrefsSchema = z.object({
  email: z.boolean(),
  whatsapp: z.boolean(),
  sms: z.boolean(),
  marketing: z.boolean(),
});

function readNotificationPrefs(metadata: unknown): NotificationPrefs {
  const stored =
    (metadata as { notificationPrefs?: Partial<NotificationPrefs> } | null)?.notificationPrefs ??
    {};
  return { ...DEFAULT_NOTIFICATION_PREFS, ...stored };
}

// Fire-and-forget activity trail for the user's "Recent Activity" feed. Never
// let a logging failure break the action that triggered it.
async function logActivity(userId: string, action: string, entity: string, entityId: string) {
  try {
    await prisma.auditLog.create({ data: { userId, action, entity, entityId } });
  } catch {
    // audit is best-effort; swallow
  }
}

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
        name: nameSchema.optional(),
        phone: phoneSchema.optional(),
        city: geoTextSchema.optional(),
        state: geoTextSchema.optional(),
        bio: noteSchema.optional(),
        avatar: safeUrlSchema.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.phone) {
        const conflict = await prisma.user.findFirst({
          where: { phone: input.phone, id: { not: ctx.user.id } },
        });
        if (conflict) throw new TRPCError({ code: "CONFLICT", message: "Phone already in use." });
      }

      const updated = await prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
        select: safeUserSelect,
      });
      await logActivity(ctx.user.id, "profile.updated", "User", ctx.user.id);
      return updated;
    }),

  notificationPrefs: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { metadata: true },
    });
    return readNotificationPrefs(user.metadata);
  }),

  updateNotificationPrefs: protectedProcedure
    .input(notificationPrefsSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { metadata: true },
      });
      const metadata = {
        ...((user.metadata as Record<string, unknown> | null) ?? {}),
        notificationPrefs: input,
      };

      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { metadata },
      });
      await logActivity(ctx.user.id, "notifications.updated", "User", ctx.user.id);
      return input;
    }),

  recentActivity: protectedProcedure.query(async ({ ctx }) => {
    const logs = await prisma.auditLog.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    return logs.map((l) => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      createdAt: l.createdAt.toISOString(),
    }));
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
    .input(
      z.object({
        userId: cuidSchema,
        amount: z.number().int().positive(),
        reason: safeString(200, 1),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

      await Promise.all([
        prisma.user.update({
          where: { id: input.userId },
          data: { credits: { increment: input.amount } },
        }),
        prisma.creditTransaction.create({
          data: {
            userId: input.userId,
            type: "credit",
            amount: input.amount,
            reason: input.reason,
          },
        }),
      ]);

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: input.userId },
        select: { credits: true },
      });
      return { credits: updated.credits };
    }),

  favorites: protectedProcedure.query(async ({ ctx }) => {
    const favorites = await prisma.favorite.findMany({
      where: { userId: ctx.user.id, property: { deletedAt: null } },
      orderBy: { createdAt: "desc" },
      include: { property: { include: { location: true } } },
    });

    return favorites.map((f) => ({
      ...f.property,
      price: Number(f.property.price),
    }));
  }),

  addFavorite: protectedProcedure
    .input(z.object({ propertyId: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const property = await prisma.property.findFirst({
        where: { id: input.propertyId, deletedAt: null },
      });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      await prisma.favorite.upsert({
        where: { userId_propertyId: { userId: ctx.user.id, propertyId: input.propertyId } },
        create: { userId: ctx.user.id, propertyId: input.propertyId },
        update: {},
      });
      await logActivity(ctx.user.id, "property.favorited", "Property", input.propertyId);
      return { ok: true };
    }),

  removeFavorite: protectedProcedure
    .input(z.object({ propertyId: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      await prisma.favorite.deleteMany({
        where: { userId: ctx.user.id, propertyId: input.propertyId },
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
        currentPassword: passwordSchema,
        newPassword: passwordSchema,
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
        _count: { select: { leads: true, favoritedBy: true } },
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
    .input(z.object({ sessionId: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const session = await prisma.session.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
      }

      if (session.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot terminate another user's session.",
        });
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

  getAgents: adminProcedure.query(async () => {
    const agents = await prisma.user.findMany({
      where: { role: "agent" },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        city: true,
        verified: true,
        metadata: true,
      },
      orderBy: { name: "asc" },
    });

    return agents.map((a) => ({
      ...a,
      ...((a.metadata as any) || {}),
    }));
  }),

  getTeamMembers: adminProcedure.query(async () => {
    const teamMembers = await prisma.user.findMany({
      where: { role: "sales" },
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        verified: true,
        metadata: true,
      },
      orderBy: { name: "asc" },
    });

    return teamMembers;
  }),
});
