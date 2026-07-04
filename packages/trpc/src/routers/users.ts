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
} from "../sanitize";
import bcrypt from "bcryptjs";
import prisma from "@nxtsft/db";
import { notifyCredit } from "../notify";
import { router, protectedProcedure, adminProcedure, publicProcedure } from "../server";

const NOTIFICATION_PREF_KEYS = ["email", "whatsapp", "sms", "marketing"] as const;
type NotificationPrefs = Record<(typeof NOTIFICATION_PREF_KEYS)[number], boolean>;

// User.metadata is an open JSON blob (internal notes, flags, etc). Public agent
// endpoints must expose only these display-oriented keys, never the raw object.
const PUBLIC_AGENT_META_KEYS = [
  "initials", "rating", "reviews", "deals", "since", "listings", "featured",
  "color", "responseTime", "portfolioValue", "specialties", "languages", "cities",
] as const;

function publicAgentMeta(metadata: unknown): Record<string, unknown> {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of PUBLIC_AGENT_META_KEYS) {
    if (k in meta) out[k] = meta[k];
  }
  return out;
}

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
      await notifyCredit({ userId: input.userId, type: "credit", amount: input.amount, reason: input.reason });

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

  // ── Interior-designer favorites (mirror property favorites) ────────────────
  designerFavorites: protectedProcedure.query(async ({ ctx }) => {
    const favorites = await prisma.designerFavorite.findMany({
      where: { userId: ctx.user.id, designer: { status: "active" } },
      orderBy: { createdAt: "desc" },
      include: { designer: true },
    });
    return favorites.map((f) => ({
      ...f.designer,
      startingBudget: f.designer.startingBudget != null ? Number(f.designer.startingBudget) : null,
    }));
  }),

  addDesignerFavorite: protectedProcedure
    .input(z.object({ designerId: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const designer = await prisma.interiorDesigner.findFirst({ where: { id: input.designerId } });
      if (!designer) throw new TRPCError({ code: "NOT_FOUND", message: "Designer not found." });
      await prisma.designerFavorite.upsert({
        where: { userId_designerId: { userId: ctx.user.id, designerId: input.designerId } },
        create: { userId: ctx.user.id, designerId: input.designerId },
        update: {},
      });
      await logActivity(ctx.user.id, "designer.favorited", "InteriorDesigner", input.designerId);
      return { ok: true };
    }),

  removeDesignerFavorite: protectedProcedure
    .input(z.object({ designerId: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      await prisma.designerFavorite.deleteMany({
        where: { userId: ctx.user.id, designerId: input.designerId },
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
        // Latest pending edit awaiting admin review — drives the "under review" badge.
        editRequests: { where: { status: "Pending" }, select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    return properties.map(({ editRequests, ...p }) => ({
      ...p,
      price: Number(p.price),
      hasPendingEdit: editRequests.length > 0,
    }));
  }),

  // Leads a home-seller has received — i.e. buyers who enquired on a property
  // this user owns. Lead has no owner column, so we scope by the seller's own
  // property ids. Read-only; returns [] for users who own nothing.
  sellerLeads: protectedProcedure.query(async ({ ctx }) => {
    const myProps = await prisma.property.findMany({
      where: { ownerId: ctx.user.id, deletedAt: null },
      select: { id: true, title: true, slug: true },
    });
    if (myProps.length === 0) return [];
    const byId = new Map(myProps.map((p) => [p.id, p]));

    const leads = await prisma.lead.findMany({
      where: { propertyId: { in: myProps.map((p) => p.id) } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        city: true,
        interest: true,
        source: true,
        status: true,
        value: true,
        createdAt: true,
        propertyId: true,
      },
    });

    return leads.map((l) => ({
      ...l,
      property: l.propertyId ? (byId.get(l.propertyId) ?? null) : null,
    }));
  }),

  // Site visits booked *to* the seller's listings (buyer's perspective lives in
  // `siteVisits` above). SiteVisit has no Prisma relation to Property or the
  // buyer User, so we join both manually by id.
  sellerVisits: protectedProcedure.query(async ({ ctx }) => {
    const myProps = await prisma.property.findMany({
      where: { ownerId: ctx.user.id, deletedAt: null },
      select: { id: true, title: true, slug: true, location: { select: { city: true } } },
    });
    if (myProps.length === 0) return [];
    const propById = new Map(myProps.map((p) => [p.id, p]));

    const visits = await prisma.siteVisit.findMany({
      where: { propertyId: { in: myProps.map((p) => p.id) } },
      orderBy: { scheduledAt: "desc" },
    });

    const buyerIds = [...new Set(visits.map((v) => v.userId))];
    const buyers = await prisma.user.findMany({
      where: { id: { in: buyerIds } },
      select: { id: true, name: true, phone: true },
    });
    const buyerById = new Map(buyers.map((b) => [b.id, b]));

    return visits.map((v) => ({
      id: v.id,
      scheduledAt: v.scheduledAt,
      status: v.status,
      notes: v.notes,
      property: propById.get(v.propertyId) ?? null,
      buyer: buyerById.get(v.userId) ?? null,
    }));
  }),

  // Headline counts for the seller's profile stat cards.
  sellerStats: protectedProcedure.query(async ({ ctx }) => {
    const myProps = await prisma.property.findMany({
      where: { ownerId: ctx.user.id, deletedAt: null },
      select: { id: true, status: true },
    });
    const propIds = myProps.map((p) => p.id);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const [leadsReceived, newLeadsThisWeek, visitsBooked, upcomingVisits] = propIds.length
      ? await Promise.all([
          prisma.lead.count({ where: { propertyId: { in: propIds } } }),
          prisma.lead.count({
            where: { propertyId: { in: propIds }, createdAt: { gte: weekAgo } },
          }),
          prisma.siteVisit.count({ where: { propertyId: { in: propIds } } }),
          prisma.siteVisit.count({
            where: {
              propertyId: { in: propIds },
              scheduledAt: { gte: now },
              status: { in: ["Scheduled", "Rescheduled"] },
            },
          }),
        ])
      : [0, 0, 0, 0];

    return {
      activeListings: myProps.filter((p) => p.status === "Active").length,
      pendingListings: myProps.filter((p) => p.status === "Pending").length,
      leadsReceived,
      newLeadsThisWeek,
      visitsBooked,
      upcomingVisits,
    };
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

  getAgents: publicProcedure.query(async () => {
    const agents = await prisma.user.findMany({
      // Only approved (verified) + active agents are public. Pending self-service
      // agent registrations stay hidden until an admin approves them.
      where: { role: "agent", active: true, verified: true },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        avatar: true,
        city: true,
        verified: true,
        metadata: true,
      },
      orderBy: { name: "asc" },
    });

    return agents.map((a): {
      id: string; name: string; slug: string | null; email: string;
      avatar: string | null; city: string; verified: boolean; metadata: unknown;
    } => ({
      id: a.id, name: a.name, slug: a.slug, email: a.email,
      avatar: a.avatar, city: a.city, verified: a.verified,
      metadata: publicAgentMeta(a.metadata),
    }));
  }),

  getAgent: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, "Invalid slug") }))
    .query(async ({ input }) => {
      const agent = await prisma.user.findFirst({
        where: { slug: input.slug, role: "agent", active: true, verified: true },
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          phone: true,
          avatar: true,
          city: true,
          verified: true,
          metadata: true,
        },
      });
      if (!agent) return null;
      const meta = (agent.metadata ?? {}) as Record<string, unknown>;
      // Real count of listings this agent markets. Falls back to the static
      // metadata figure only when none are assigned yet (e.g. pre-backfill).
      const activeListings = await prisma.property.count({
        where: { agentId: agent.id, status: "Active", deletedAt: null },
      });
      return {
        id: agent.id, name: agent.name, slug: agent.slug, email: agent.email,
        // Agents are public directory professionals — their business phone is
        // meant to be reachable (unlike private owners, gated by credits).
        phone: agent.phone,
        avatar: agent.avatar, city: agent.city, verified: agent.verified,
        initials: meta.initials as string | undefined,
        rating: meta.rating as number | undefined,
        reviews: meta.reviews as number | undefined,
        deals: meta.deals as number | undefined,
        since: meta.since as number | undefined,
        listings: activeListings || (meta.listings as number | undefined),
        featured: meta.featured as boolean | undefined,
        color: meta.color as string | undefined,
        responseTime: meta.responseTime as string | undefined,
        portfolioValue: meta.portfolioValue as string | undefined,
        specialties: meta.specialties as string[] | undefined,
        languages: meta.languages as string[] | undefined,
        cities: meta.cities as string[] | undefined,
      };
    }),

  // Active listings a given agent markets, for their public profile page.
  agentListings: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, "Invalid slug") }))
    .query(async ({ input }) => {
      const agent = await prisma.user.findFirst({
        where: { slug: input.slug, role: "agent" },
        select: { id: true },
      });
      if (!agent) return [];
      const properties = await prisma.property.findMany({
        where: { agentId: agent.id, status: "Active", deletedAt: null },
        select: {
          id: true,
          slug: true,
          title: true,
          type: true,
          purpose: true,
          price: true,
          bhk: true,
          area: true,
          images: true,
          location: { select: { city: true, locality: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      });
      return properties.map((p) => ({ ...p, price: Number(p.price) }));
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

  kyc: router({
    myDocuments: protectedProcedure.query(async ({ ctx }) => {
      const [user, documents] = await Promise.all([
        prisma.user.findUniqueOrThrow({
          where: { id: ctx.user.id },
          select: { kycStatus: true },
        }),
        prisma.kycDocument.findMany({
          where: { userId: ctx.user.id },
          orderBy: { createdAt: "asc" },
        }),
      ]);
      return { kycStatus: user.kycStatus, documents };
    }),

    submit: protectedProcedure
      .input(
        z.object({
          type: z.enum(["aadhaar", "pan", "income_proof", "other"]),
          fileUrl: safeUrlSchema,
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await prisma.kycDocument.findFirst({
          where: { userId: ctx.user.id, type: input.type },
        });

        if (existing) {
          await prisma.kycDocument.update({
            where: { id: existing.id },
            data: {
              fileUrl: input.fileUrl,
              status: "pending",
              adminNotes: null,
              reviewedAt: null,
              reviewedById: null,
            },
          });
        } else {
          await prisma.kycDocument.create({
            data: { userId: ctx.user.id, type: input.type, fileUrl: input.fileUrl },
          });
        }

        // Escalate user kycStatus to pending when they submit (never downgrade)
        const user = await prisma.user.findUniqueOrThrow({
          where: { id: ctx.user.id },
          select: { kycStatus: true },
        });
        if (user.kycStatus === "none") {
          await prisma.user.update({
            where: { id: ctx.user.id },
            data: { kycStatus: "pending" },
          });
        }

        return { ok: true };
      }),
  }),
});
