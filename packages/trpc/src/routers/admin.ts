import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@nxtsft/db";
import { router, adminProcedure, superAdminProcedure } from "../server";
import {
  cuidSchema,
  nameSchema,
  emailSchema,
  phoneSchema,
  passwordSchema,
  safeString,
  geoTextSchema,
  searchSchema,
  roleSchema,
  staffRoleSchema,
  propertyStatusSchema,
  cursorSchema,
  limitSchema,
  ratingSchema,
} from "../sanitize";

const safeUserSelect = {
  id: true,
  email: true,
  phone: true,
  name: true,
  avatar: true,
  role: true,
  verified: true,
  city: true,
  credits: true,
  joined: true,
  lastActive: true,
};

export const adminRouter = router({
  // Platform KPIs for the command dashboard
  stats: adminProcedure.query(async () => {
    const [
      totalUsers,
      totalProperties,
      activeListings,
      totalLeads,
      hotLeads,
      totalRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count({ where: { deletedAt: null } }),
      prisma.property.count({ where: { status: "Active", deletedAt: null } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "Hot" } }),
      prisma.payment.aggregate({ where: { status: "Success" }, _sum: { amount: true } }),
    ]);

    return {
      totalUsers,
      totalProperties,
      activeListings,
      totalLeads,
      hotLeads,
      totalRevenue: Number(totalRevenue._sum.amount ?? 0) / 100, // convert paise to rupees
    };
  }),

  // User management
  users: router({
    list: adminProcedure
      .input(
        z.object({
          role: roleSchema.optional(),
          search: searchSchema.optional(),
          city: geoTextSchema.optional(),
          cursor: cursorSchema,
          limit: limitSchema,
        }),
      )
      .query(async ({ input }) => {
        const { cursor, limit, role, search, city } = input;

        const where: NonNullable<Parameters<typeof prisma.user.findMany>[0]>["where"] = {};
        if (role) where.role = role;
        if (city) where.city = { contains: city, mode: "insensitive" };
        if (search) {
          where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ];
        }

        const items = await prisma.user.findMany({
          where,
          select: safeUserSelect,
          orderBy: { joined: "desc" },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = items.length > limit;
        const page = hasMore ? items.slice(0, limit) : items;
        return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
      }),

    get: adminProcedure
      .input(z.object({ id: cuidSchema }))
      .query(async ({ input }) => {
        const user = await prisma.user.findUnique({ where: { id: input.id }, select: safeUserSelect });
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
        return user;
      }),

    // Super-admin only: change a user's role
    updateRole: superAdminProcedure
      .input(z.object({ userId: cuidSchema, role: roleSchema }))
      .mutation(async ({ input }) => {
        const user = await prisma.user.findUnique({ where: { id: input.userId } });
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

        return prisma.user.update({
          where: { id: input.userId },
          data: { role: input.role },
          select: safeUserSelect,
        });
      }),

    grantCredits: adminProcedure
      .input(
        z.object({
          userId: cuidSchema,
          amount: z.number().int().min(1).max(1000),
          reason: safeString(200),
        }),
      )
      .mutation(async ({ input }) => {
        const user = await prisma.user.findUnique({
          where: { id: input.userId },
          select: { id: true, role: true },
        });
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
        if (!["user", "home-seller"].includes(user.role)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Credits can only be granted to Home Buyers or Home Sellers.",
          });
        }
        await Promise.all([
          prisma.user.update({
            where: { id: input.userId },
            data: { credits: { increment: input.amount } },
          }),
          prisma.creditTransaction.create({
            data: { userId: input.userId, type: "credit", amount: input.amount, reason: input.reason },
          }),
        ]);
        return prisma.user.findUniqueOrThrow({
          where: { id: input.userId },
          select: { id: true, name: true, credits: true },
        });
      }),

    kycList: adminProcedure
      .input(
        z.object({
          kycStatus: z.enum(["pending", "verified", "unverified"]).optional(),
          cursor: cursorSchema,
          limit: limitSchema,
        }),
      )
      .query(async ({ input }) => {
        const { cursor, limit, kycStatus } = input;
        const where = kycStatus
          ? { kycStatus }
          : { NOT: { kycStatus: "none" } };

        const items = await prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            kycStatus: true,
            joined: true,
            kycDocuments: { orderBy: { createdAt: "asc" as const } },
          },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = items.length > limit;
        const page = hasMore ? items.slice(0, limit) : items;
        return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
      }),

    updateDocStatus: adminProcedure
      .input(
        z.object({
          docId: cuidSchema,
          status: z.enum(["pending", "verified", "unverified"]),
          adminNotes: safeString(500).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const doc = await prisma.kycDocument.findUnique({ where: { id: input.docId } });
        if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });

        return prisma.kycDocument.update({
          where: { id: input.docId },
          data: {
            status: input.status,
            adminNotes: input.adminNotes ?? null,
            reviewedAt: new Date(),
            reviewedById: ctx.user.id,
          },
        });
      }),

    setUserKycStatus: adminProcedure
      .input(
        z.object({
          userId: cuidSchema,
          kycStatus: z.enum(["none", "pending", "verified", "unverified"]),
          note: safeString(500).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const user = await prisma.user.findUnique({
          where: { id: input.userId },
          select: { id: true, role: true },
        });
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
        if (!["user", "home-seller"].includes(user.role)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "KYC applies only to Home Buyers and Home Sellers.",
          });
        }

        await prisma.user.update({
          where: { id: input.userId },
          data: { kycStatus: input.kycStatus },
        });

        const label =
          input.kycStatus === "verified"
            ? "Verified ✓"
            : input.kycStatus === "unverified"
              ? "Not Verified"
              : "Pending Review";

        await prisma.notification.create({
          data: {
            userId: input.userId,
            type: "kyc_status",
            title: `KYC Status: ${label}`,
            content:
              input.note ??
              `Your KYC verification status has been updated to ${label}.`,
          },
        });

        return { ok: true };
      }),

    verify: adminProcedure
      .input(z.object({ userId: cuidSchema }))
      .mutation(async ({ input }) => {
        const user = await prisma.user.update({
          where: { id: input.userId },
          data: { verified: true, verifiedAt: new Date() },
          select: { ...safeUserSelect, role: true, name: true },
        });

        if (user.role === "home-seller") {
          await prisma.notification.create({
            data: {
              userId: input.userId,
              type: "account_approved",
              title: "Your account has been approved!",
              content: "You can now log in to NxtSft and list your property.",
            },
          });
        }

        return user;
      }),
  }),

  // Property management for admin portal
  properties: router({
    list: adminProcedure
      .input(
        z.object({
          status: propertyStatusSchema.optional(),
          city: geoTextSchema.optional(),
          type: safeString(50).optional(),
          cursor: cursorSchema,
          limit: limitSchema,
        }),
      )
      .query(async ({ input }) => {
        const { cursor, limit, status, city, type } = input;

        const where: NonNullable<Parameters<typeof prisma.property.findMany>[0]>["where"] = { deletedAt: null };
        if (status) where.status = status;
        if (type) where.type = type;
        if (city) where.location = { city: { equals: city, mode: "insensitive" } };

        const items = await prisma.property.findMany({
          where,
          include: {
            location: true,
            owner: { select: { id: true, name: true, email: true, role: true } },
            _count: { select: { leads: true, favoritedBy: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = items.length > limit;
        const page = hasMore ? items.slice(0, limit) : items;
        return {
          items: page.map((p) => ({ ...p, price: Number(p.price) })),
          nextCursor: page.at(-1)?.id ?? null,
          hasMore,
        };
      }),

    approve: adminProcedure
      .input(z.object({ id: cuidSchema }))
      .mutation(async ({ input }) => {
        const property = await prisma.property.findFirst({ where: { id: input.id, deletedAt: null } });
        if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });
        if (!property.rera) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "RERA number required before approval." });
        }
        return prisma.property.update({ where: { id: input.id }, data: { status: "Active" } });
      }),
  }),

  // All leads across the platform
  leads: router({
    list: adminProcedure
      .input(
        z.object({
          status: safeString(50).optional(),
          assignedToId: cuidSchema.optional(),
          cursor: cursorSchema,
          limit: limitSchema,
        }),
      )
      .query(async ({ input }) => {
        const { cursor, limit, status, assignedToId } = input;

        const where: NonNullable<Parameters<typeof prisma.lead.findMany>[0]>["where"] = {};
        if (status) where.status = status;
        if (assignedToId) where.assignedToId = assignedToId;

        const items = await prisma.lead.findMany({
          where,
          include: {
            property: { select: { id: true, title: true, slug: true } },
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = items.length > limit;
        const page = hasMore ? items.slice(0, limit) : items;
        return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
      }),
  }),

  // Audit log
  auditLog: adminProcedure
    .input(
      z.object({
        entity: safeString(100).optional(),
        cursor: cursorSchema,
        limit: limitSchema.default(50),
      }),
    )
    .query(async ({ input }) => {
      const { cursor, limit, entity } = input;

      const where = entity ? { entity } : {};

      const items = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;
      return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
    }),

  // Home Buyer property-view activity feed
  buyerActivity: adminProcedure
    .input(
      z.object({
        search: searchSchema.optional(),
        cursor: cursorSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { cursor, limit, search } = input;

      const userFilter: NonNullable<Parameters<typeof prisma.user.findMany>[0]>["where"] = {
        role: "user",
      };
      if (search) {
        userFilter.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      const views = await prisma.propertyView.findMany({
        where: { userId: { not: null }, user: userFilter },
        include: {
          user: { select: { id: true, name: true, email: true } },
          property: {
            select: {
              id: true,
              title: true,
              slug: true,
              location: { select: { city: true, locality: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = views.length > limit;
      const page = hasMore ? views.slice(0, limit) : views;

      return {
        items: page.map((v) => ({
          id: v.id,
          createdAt: v.createdAt.toISOString(),
          durationSec: v.durationSec,
          contactUnlocked: v.contactUnlocked,
          buyer: v.user,
          property: v.property ?? null,
        })),
        nextCursor: page.at(-1)?.id ?? null,
        hasMore,
      };
    }),

  // Credit usage audit — which buyer used credits to view which property
  creditUsage: adminProcedure
    .input(
      z.object({
        search: searchSchema.optional(),
        cursor: cursorSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { cursor, limit, search } = input;

      const where: NonNullable<Parameters<typeof prisma.creditTransaction.findMany>[0]>["where"] = {
        reason: "contact_unlock",
        type: "debit",
      };

      if (search) {
        const matchingUsers = await prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
          select: { id: true },
          take: 100,
        });
        where.userId = { in: matchingUsers.map((u) => u.id) };
      }

      const txns = await prisma.creditTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = txns.length > limit;
      const page = hasMore ? txns.slice(0, limit) : txns;

      const userIds = [...new Set(page.map((t) => t.userId))];
      const propertyIds = [
        ...new Set(page.map((t) => t.propertyId).filter((id): id is string => !!id)),
      ];

      const [users, properties] = await Promise.all([
        prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, credits: true },
        }),
        prisma.property.findMany({
          where: { id: { in: propertyIds } },
          select: { id: true, title: true, slug: true },
        }),
      ]);

      const userById = new Map(users.map((u) => [u.id, u]));
      const propertyById = new Map(properties.map((p) => [p.id, p]));

      return {
        items: page.map((t) => ({
          id: t.id,
          createdAt: t.createdAt.toISOString(),
          buyer: userById.get(t.userId) ?? null,
          property: t.propertyId ? (propertyById.get(t.propertyId) ?? null) : null,
        })),
        nextCursor: page.at(-1)?.id ?? null,
        hasMore,
      };
    }),

  teamMembers: adminProcedure
    .input(
      z.object({
        role: roleSchema.optional(),
        search: searchSchema.optional(),
      }),
    )
    .query(async ({ input }) => {
      const staffRoles = ["super-admin", "admin", "supervisor", "sales", "support-admin"];
      const where: any = {
        role: { in: staffRoles },
      };

      if (input.role) {
        where.role = input.role;
      }
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
          { phone: { contains: input.search, mode: "insensitive" } },
        ];
      }

      return prisma.user.findMany({
        where,
        select: {
          ...safeUserSelect,
          supervisorId: true,
          supervisor: { select: { id: true, name: true } },
        },
        orderBy: { joined: "desc" },
      });
    }),

  // Assign (or clear) a sales rep's supervisor. Pass supervisorId: null to clear.
  assignSupervisor: adminProcedure
    .input(z.object({ userId: cuidSchema, supervisorId: cuidSchema.nullable() }))
    .mutation(async ({ input }) => {
      const rep = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, role: true },
      });
      if (!rep) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      if (rep.role !== "sales") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only sales reps can be assigned a supervisor." });
      }
      if (input.supervisorId) {
        const sup = await prisma.user.findUnique({
          where: { id: input.supervisorId },
          select: { id: true, role: true },
        });
        if (!sup || sup.role !== "supervisor") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Selected supervisor is invalid." });
        }
      }
      await prisma.user.update({
        where: { id: input.userId },
        data: { supervisorId: input.supervisorId },
      });
      return { ok: true };
    }),

  createTeamMember: adminProcedure
    .input(
      z.object({
        name: nameSchema,
        email: emailSchema,
        phone: phoneSchema,
        password: passwordSchema,
        role: staffRoleSchema,
        city: geoTextSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const [existingEmail, existingPhone] = await Promise.all([
        prisma.user.findUnique({ where: { email: input.email } }),
        prisma.user.findUnique({ where: { phone: input.phone } }),
      ]);

      if (existingEmail) throw new TRPCError({ code: "CONFLICT", message: "Email already registered." });
      if (existingPhone) throw new TRPCError({ code: "CONFLICT", message: "Phone already registered." });

      const passwordHash = await bcrypt.hash(input.password, 12);

      return prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          role: input.role,
          city: input.city,
          passwordHash,
          verified: true,
          verifiedAt: new Date(),
        },
        select: safeUserSelect,
      });
    }),

  // ── View-boost controls ────────────────────────────────────────────────
  // List properties with their real + boosted view counts for admin control
  viewBoostList: adminProcedure
    .input(z.object({ search: searchSchema.optional(), limit: limitSchema }))
    .query(async ({ input }) => {
      const { search, limit } = input;
      const props = await prisma.property.findMany({
        where: {
          deletedAt: null,
          ...(search
            ? {
                OR: [
                  { title: { contains: search, mode: "insensitive" } },
                  { location: { locality: { contains: search, mode: "insensitive" } } },
                  { location: { city: { contains: search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          slug: true,
          title: true,
          views: true,
          viewBase: true,
          location: { select: { city: true, locality: true } },
        },
        orderBy: [{ viewBase: "desc" }, { views: "desc" }],
        take: limit,
      });
      return props;
    }),

  // Set the viewBase (social-proof boost) for a property
  setViewBase: adminProcedure
    .input(z.object({ propertyId: cuidSchema, base: z.number().int().min(0).max(9_999_999) }))
    .mutation(async ({ input }) => {
      await prisma.property.update({
        where: { id: input.propertyId },
        data: { viewBase: input.base },
      });
      return { ok: true };
    }),

  // Reset viewBase and real views for a property
  resetViews: adminProcedure
    .input(z.object({ propertyId: cuidSchema }))
    .mutation(async ({ input }) => {
      await prisma.property.update({
        where: { id: input.propertyId },
        data: { viewBase: 0, views: 0 },
      });
      return { ok: true };
    }),

  // ── Review moderation ──────────────────────────────────────────────────
  reviews: router({
    list: adminProcedure
      .input(
        z.object({
          cursor: cursorSchema,
          limit: limitSchema,
          propertyId: cuidSchema.optional(),
          rating: z.number().int().min(1).max(5).optional(),
          status: z.enum(["Pending", "Approved", "Declined"]).optional(),
        }),
      )
      .query(async ({ input }) => {
        const { cursor, limit, propertyId, rating, status } = input;
        const where: NonNullable<Parameters<typeof prisma.review.findMany>[0]>["where"] = {};
        if (propertyId) where.propertyId = propertyId;
        if (rating) where.rating = rating;
        if (status) where.status = status;

        const items = await prisma.review.findMany({
          where,
          include: {
            author: { select: { id: true, name: true, email: true, avatar: true } },
            property: { select: { id: true, title: true, slug: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = items.length > limit;
        const page = hasMore ? items.slice(0, limit) : items;
        return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
      }),

    delete: adminProcedure
      .input(z.object({ id: cuidSchema }))
      .mutation(async ({ input }) => {
        const review = await prisma.review.findUnique({ where: { id: input.id } });
        if (!review) throw new TRPCError({ code: "NOT_FOUND", message: "Review not found." });
        await prisma.review.delete({ where: { id: input.id } });
        return { ok: true };
      }),

    moderate: adminProcedure
      .input(
        z.object({
          id: cuidSchema,
          status: z.enum(["Approved", "Declined"]),
          title: safeString(100, 3).optional(),
          content: safeString(1000).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const review = await prisma.review.findUnique({ where: { id: input.id } });
        if (!review) throw new TRPCError({ code: "NOT_FOUND", message: "Review not found." });
        return prisma.review.update({
          where: { id: input.id },
          data: {
            status: input.status,
            ...(input.title !== undefined && { title: input.title }),
            ...(input.content !== undefined && { content: input.content }),
          },
        });
      }),

    create: adminProcedure
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
        });
        if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

        // Admin can upsert: update existing review rather than erroring
        const existing = await prisma.review.findFirst({
          where: { propertyId: input.propertyId, authorId: ctx.user.id },
        });
        if (existing) {
          return prisma.review.update({
            where: { id: existing.id },
            data: { rating: input.rating, title: input.title, content: input.content ?? null },
          });
        }
        return prisma.review.create({
          data: {
            propertyId: input.propertyId,
            authorId: ctx.user.id,
            rating: input.rating,
            title: input.title,
            content: input.content,
          },
        });
      }),
  }),
});
