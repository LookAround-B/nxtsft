import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, protectedProcedure, staffProcedure, adminProcedure, generalRateLimit } from "../server";
import {
  cuidSchema,
  nameSchema,
  phoneSchema,
  emailSchema,
  geoTextSchema,
  safeString,
  noteSchema,
  leadStatusSchema,
  leadSourceSchema,
  cursorSchema,
  limitSchema,
  datetimeSchema,
} from "../sanitize";

export const leadsRouter = router({
  // Buyer submits an inquiry from a property detail page. propertyId is
  // omitted for general leads with no specific listing yet (e.g. a
  // Refer & Earn buyer/tenant submission — see referrals.submit).
  create: protectedProcedure
    .use(generalRateLimit)
    .input(
      z.object({
        propertyId: cuidSchema.optional(),
        name: nameSchema,
        phone: phoneSchema,
        email: emailSchema.optional(),
        city: geoTextSchema.optional(),
        interest: safeString(500).optional(),
        notes: noteSchema.optional(),
        source: leadSourceSchema.default("Portal"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.propertyId) {
        const property = await prisma.property.findFirst({ where: { id: input.propertyId, deletedAt: null } });
        if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });
      }

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
        status: leadStatusSchema.optional(),
        source: leadSourceSchema.optional(),
        propertyId: cuidSchema.optional(),
        cursor: cursorSchema,
        limit: limitSchema,
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
    .input(z.object({ id: cuidSchema }))
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
    .input(z.object({ id: cuidSchema, status: leadStatusSchema }))
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.id } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const updated = await prisma.lead.update({
        where: { id: input.id },
        data: { status: input.status },
      });

      // Auto-create commission when a lead is closed as Converted
      if (input.status === "Converted" && lead.assignedToId && lead.value) {
        const alreadyExists = await prisma.commission.findFirst({ where: { leadId: lead.id } });
        if (!alreadyExists) {
          const dealValue = BigInt(lead.value);
          const rate = 0.02;
          const amount = BigInt(Math.round(Number(dealValue) * rate));
          const now = new Date();
          const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          await prisma.commission.create({
            data: {
              salesRepId: lead.assignedToId,
              leadId: lead.id,
              dealValue,
              rate,
              amount,
              status: "pending",
              periodMonth,
            },
          });

          const fmtAmount = amount >= 100000n
            ? `₹${(Number(amount) / 100000).toFixed(2)}L`
            : `₹${Number(amount).toLocaleString("en-IN")}`;
          await prisma.notification.create({
            data: {
              userId: lead.assignedToId,
              type: "lead_update",
              title: "Commission earned!",
              content: `${fmtAmount} commission pending for converting ${lead.name}.`,
              actionUrl: "/sales-portal#commission",
            },
          });
        }
      }

      return updated;
    }),

  addNote: staffProcedure
    .input(z.object({ id: cuidSchema, note: safeString(2000, 1) }))
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
    .input(z.object({ id: cuidSchema, assignedToId: cuidSchema }))
    .mutation(async ({ input }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.id } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      // Verify the assignee exists and is a sales rep
      const assignee = await prisma.user.findUnique({ where: { id: input.assignedToId } });
      if (!assignee || assignee.role !== "sales") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Assignee must be a sales rep." });
      }

      const updated = await prisma.lead.update({
        where: { id: input.id },
        data: { assignedToId: input.assignedToId, status: "New" },
      });

      await prisma.notification.create({
        data: {
          userId: input.assignedToId,
          type: "lead_update",
          title: "New lead assigned to you",
          content: `${lead.name} (${lead.phone}) has been assigned to you.`,
          actionUrl: "/sales-portal",
        },
      });

      return updated;
    }),

  // Remove a lead's sales-rep assignment, returning it to the pool (admin only)
  unassign: adminProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.id } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      return prisma.lead.update({
        where: { id: input.id },
        data: { assignedToId: null },
      });
    }),

  // Schedule a site visit for a lead
  scheduleVisit: staffProcedure
    .input(
      z.object({
        leadId: cuidSchema,
        scheduledAt: datetimeSchema,
        notes: noteSchema.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!lead.propertyId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This lead isn't linked to a specific property yet — find out which listing they want before scheduling a visit.",
        });
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

  myCommissions: staffProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const commissions = await prisma.commission.findMany({
      where: { salesRepId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const pending = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);
    const mtd = commissions.filter((c) => c.createdAt >= startOfMonth).reduce((s, c) => s + Number(c.amount), 0);
    const ytd = commissions.filter((c) => c.createdAt >= startOfYear).reduce((s, c) => s + Number(c.amount), 0);

    const user = await prisma.user.findUnique({ where: { id: ctx.user.id }, select: { kycStatus: true } });

    return {
      pending,
      mtd,
      ytd,
      kycPending: user?.kycStatus !== "verified",
      items: commissions.map((c) => ({
        id: c.id,
        leadId: c.leadId,
        dealValue: Number(c.dealValue),
        amount: Number(c.amount),
        status: c.status,
        periodMonth: c.periodMonth,
        note: c.note,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }),

  logActivity: staffProcedure
    .input(
      z.object({
        type: z.enum(["call", "visit", "note"]),
        leadId: cuidSchema.optional(),
        action: safeString(500, 1),
        outcome: safeString(500, 1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return prisma.salesActivity.create({
        data: {
          salesRepId: ctx.user.id,
          type: input.type,
          leadId: input.leadId,
          action: input.action,
          outcome: input.outcome,
        },
      });
    }),

  myActivities: staffProcedure
    .input(z.object({ cursor: cursorSchema, limit: limitSchema }))
    .query(async ({ input, ctx }) => {
      const { cursor, limit } = input;
      const items = await prisma.salesActivity.findMany({
        where: { salesRepId: ctx.user.id },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;
      return {
        items: page.map((a) => ({
          id: a.id,
          type: a.type,
          leadId: a.leadId,
          action: a.action,
          outcome: a.outcome,
          ts: a.createdAt.toISOString(),
        })),
        nextCursor: page.at(-1)?.id ?? null,
        hasMore,
      };
    }),

  bulkAssign: staffProcedure
    .input(z.object({ leadIds: z.array(cuidSchema).min(1).max(500), assignedToId: cuidSchema }))
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

      await prisma.notification.create({
        data: {
          userId: input.assignedToId,
          type: "lead_update",
          title: `${input.leadIds.length} lead${input.leadIds.length === 1 ? "" : "s"} assigned to you`,
          content: `You have been assigned ${input.leadIds.length} new lead${input.leadIds.length === 1 ? "" : "s"}.`,
          actionUrl: "/sales-portal",
        },
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
