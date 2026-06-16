import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@nxtsft/db";
import { router, adminProcedure, superAdminProcedure } from "../server.js";
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
} from "../sanitize.js";

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

    verify: adminProcedure
      .input(z.object({ userId: cuidSchema }))
      .mutation(async ({ input }) => {
        return prisma.user.update({
          where: { id: input.userId },
          data: { verified: true, verifiedAt: new Date() },
          select: safeUserSelect,
        });
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
        select: safeUserSelect,
        orderBy: { joined: "desc" },
      });
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
});
