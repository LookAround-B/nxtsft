import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, adminProcedure, superAdminProcedure } from "../server";

const Role = z.enum(["super-admin", "admin", "supervisor", "sales", "support-admin", "user", "customer"]);

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
          role: Role.optional(),
          search: z.string().optional(),
          city: z.string().optional(),
          cursor: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(20),
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
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const user = await prisma.user.findUnique({ where: { id: input.id }, select: safeUserSelect });
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
        return user;
      }),

    // Super-admin only: change a user's role
    updateRole: superAdminProcedure
      .input(z.object({ userId: z.string(), role: Role }))
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
      .input(z.object({ userId: z.string() }))
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
          status: z.enum(["Active", "Sold", "Rented", "Inactive"]).optional(),
          city: z.string().optional(),
          type: z.string().optional(),
          cursor: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(20),
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
      .input(z.object({ id: z.string() }))
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
          status: z.string().optional(),
          assignedToId: z.string().optional(),
          cursor: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(20),
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
        entity: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50,),
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
});
