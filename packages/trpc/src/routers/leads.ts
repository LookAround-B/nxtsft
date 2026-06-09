import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, protectedProcedure, staffProcedure, adminProcedure } from "../server.js";

const LeadStatus = z.enum(["Hot", "Warm", "Cold", "New", "Converted", "Lost"]);
const LeadSource = z.enum(["Portal", "WhatsApp", "Referral", "Direct"]);

export const leadsRouter = router({
  // Buyer submits an inquiry from a property detail page
  create: protectedProcedure
    .input(
      z.object({
        propertyId: z.string(),
        name: z.string().min(2),
        phone: z.string().regex(/^[6-9]\d{9}$/),
        email: z.string().email().optional(),
        city: z.string().optional(),
        interest: z.string().optional(),
        notes: z.string().optional(),
        source: LeadSource.default("Portal"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const property = await prisma.property.findFirst({ where: { id: input.propertyId, deletedAt: null } });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      const lead = await prisma.lead.create({
        data: {
          propertyId: input.propertyId,
          userId: ctx.user.id,
          name: input.name,
          phone: input.phone,
          email: input.email,
          city: input.city,
          interest: input.interest,
          notes: input.notes,
          source: input.source,
          status: "New",
        },
        include: {
          property: { select: { id: true, title: true, slug: true } },
        },
      });

      return lead;
    }),

  // Sales: see own assigned leads. Admin/Supervisor: see all
  list: staffProcedure
    .input(
      z.object({
        status: LeadStatus.optional(),
        source: LeadSource.optional(),
        propertyId: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { cursor, limit, status, source, propertyId } = input;

      const where: NonNullable<Parameters<typeof prisma.lead.findMany>[0]>["where"] = {};

      if (ctx.user.role === "sales") where.assignedToId = ctx.user.id;
      if (status) where.status = status;
      if (source) where.source = source;
      if (propertyId) where.propertyId = propertyId;

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

  get: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({
        where: { id: input.id },
        include: {
          property: { include: { location: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      // Sales can only access their own leads
      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return lead;
    }),

  updateStatus: staffProcedure
    .input(z.object({ id: z.string(), status: LeadStatus }))
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.id } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return prisma.lead.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  addNote: staffProcedure
    .input(z.object({ id: z.string(), note: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.id } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const timestamp = new Date().toISOString();
      const appended = lead.notes
        ? `${lead.notes}\n[${timestamp}] ${ctx.user.name}: ${input.note}`
        : `[${timestamp}] ${ctx.user.name}: ${input.note}`;

      return prisma.lead.update({ where: { id: input.id }, data: { notes: appended } });
    }),

  // Assign a lead to a sales rep (admin only)
  assign: adminProcedure
    .input(z.object({ id: z.string(), assignedToId: z.string() }))
    .mutation(async ({ input }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.id } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      // Verify the assignee exists and is a sales rep
      const assignee = await prisma.user.findUnique({ where: { id: input.assignedToId } });
      if (!assignee || assignee.role !== "sales") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Assignee must be a sales rep." });
      }

      return prisma.lead.update({
        where: { id: input.id },
        data: { assignedToId: input.assignedToId, status: "New" },
      });
    }),

  // Schedule a site visit for a lead
  scheduleVisit: staffProcedure
    .input(
      z.object({
        leadId: z.string(),
        scheduledAt: z.string().datetime(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const visit = await prisma.siteVisit.create({
        data: {
          userId: lead.userId,
          propertyId: lead.propertyId,
          salesRepId: ctx.user.id,
          scheduledAt: new Date(input.scheduledAt),
          notes: input.notes,
        },
      });

      await prisma.lead.update({
        where: { id: input.leadId },
        data: { visitScheduled: new Date(input.scheduledAt) },
      });

      return visit;
    }),

  bulkAssign: staffProcedure
    .input(z.object({ leadIds: z.array(z.string()), assignedToId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const allowedRoles = ["supervisor", "admin", "super-admin"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only supervisors and admins can assign leads." });
      }

      const assignee = await prisma.user.findUnique({ where: { id: input.assignedToId } });
      if (!assignee || assignee.role !== "sales") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Assignee must be a sales rep." });
      }

      await prisma.lead.updateMany({
        where: { id: { in: input.leadIds } },
        data: { assignedToId: input.assignedToId, status: "New" },
      });

      return { ok: true };
    }),

  stats: staffProcedure.query(async ({ ctx }) => {
    const isSales = ctx.user.role === "sales";
    const where: any = {};
    if (isSales) where.assignedToId = ctx.user.id;

    const [total, hot, warm, cold, newLeads, converted, lost] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, status: "Hot" } }),
      prisma.lead.count({ where: { ...where, status: "Warm" } }),
      prisma.lead.count({ where: { ...where, status: "Cold" } }),
      prisma.lead.count({ where: { ...where, status: "New" } }),
      prisma.lead.count({ where: { ...where, status: "Converted" } }),
      prisma.lead.count({ where: { ...where, status: "Lost" } }),
    ]);

    return {
      total,
      hot,
      warm,
      cold,
      new: newLeads,
      converted,
      lost,
    };
  }),
});
