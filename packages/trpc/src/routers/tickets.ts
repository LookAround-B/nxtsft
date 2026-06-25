import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, protectedProcedure, staffProcedure } from "../server.js";
import {
  safeString,
  cuidSchema,
  cursorSchema,
  limitSchema,
  noteSchema,
  ticketCategorySchema,
  ticketPrioritySchema,
  ticketStatusSchema,
} from "../sanitize.js";

// TAT (turnaround) thresholds in hours, keyed by ticket priority.
export const TAT_HOURS: Record<string, number> = {
  low: 72, medium: 48, high: 24, urgent: 4,
};

// Accepts a single category or a multi-select array and returns the Prisma
// filter fragment ({ in: [...] }) or undefined when nothing is selected.
function categoryFilter(category?: string | string[]) {
  if (!category) return undefined;
  const cats = (Array.isArray(category) ? category : [category]).filter(Boolean);
  return cats.length ? { in: cats } : undefined;
}

const categoryInput = z.union([z.string(), z.array(z.string())]).optional();

// GOL-137 "job category" filter: scope tickets by the raiser's auth role.
// Values are role strings (super-admin | admin | supervisor | sales | user |
// home-seller). Returns a Prisma `user` relation filter or undefined.
const jobRoleInput = z.union([z.string(), z.array(z.string())]).optional();
function jobRoleFilter(jobRole?: string | string[]) {
  if (!jobRole) return undefined;
  const roles = (Array.isArray(jobRole) ? jobRole : [jobRole]).filter(Boolean);
  return roles.length ? { role: { in: roles } } : undefined;
}

export function ticketDisplayStatus(
  status: string,
  priority: string,
): "Open" | "Resolved" | "Escalated" {
  if (priority === "urgent" && !["resolved", "closed"].includes(status)) return "Escalated";
  if (["resolved", "closed"].includes(status)) return "Resolved";
  return "Open";
}

type TicketRowInput = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: Date;
  resolvedAt: Date | null;
  assignedTo: string | null;
  user: { name: string };
};

// Shape a raw ticket into the report row consumed by ReportsDashboard,
// TATReportTab, and SupportTicketsTab. `assignedMap` resolves the
// assignedTo user id to a display name (assignedTo has no Prisma relation).
// City/State/Supervisor are placeholders — tickets carry no geo/attribution yet.
export function deriveTicketRow(t: TicketRowInput, assignedMap: Record<string, string>) {
  const tatHours = TAT_HOURS[t.priority] ?? 48;
  const actualHours = t.resolvedAt
    ? Math.round((t.resolvedAt.getTime() - t.createdAt.getTime()) / 3600000)
    : null;
  return {
    id: t.id,
    subject: t.subject,
    raisedBy: t.user.name,
    category: t.category,
    city: "—",
    state: "—",
    assignedTo: t.assignedTo ? (assignedMap[t.assignedTo] ?? "—") : "—",
    supervisor: "—",
    raisedOn: t.createdAt.toISOString().slice(0, 10),
    resolvedOn: t.resolvedAt?.toISOString().slice(0, 10) ?? null,
    tatHours,
    actualHours,
    withinTAT: actualHours != null ? actualHours <= tatHours : null,
    status: ticketDisplayStatus(t.status, t.priority),
  };
}

export const ticketsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        subject: safeString(200, 5),
        description: safeString(5000, 10),
        category: ticketCategorySchema,
        priority: ticketPrioritySchema.default("medium"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return prisma.ticket.create({
        data: {
          userId: ctx.user.id,
          subject: input.subject,
          description: input.description,
          category: input.category,
          priority: input.priority,
        },
      });
    }),

  // Consumers see their own tickets; staff see all (scoped by support-admin role)
  list: protectedProcedure
    .input(
      z.object({
        status: ticketStatusSchema.optional(),
        category: categoryInput,
        jobRole: jobRoleInput,
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        cursor: cursorSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input, ctx }) => {
      const { cursor, limit, status, category, jobRole, startDate, endDate } = input;

      const isStaff = ["super-admin", "admin", "supervisor", "support-admin"].includes(ctx.user.role);

      const where: NonNullable<Parameters<typeof prisma.ticket.findMany>[0]>["where"] = {};
      if (!isStaff) where.userId = ctx.user.id; // consumers see only own tickets
      if (status) where.status = status;
      const catFilter = categoryFilter(category);
      if (catFilter) where.category = catFilter;
      const jrFilter = jobRoleFilter(jobRole);
      if (jrFilter) where.user = jrFilter;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate + "T00:00:00.000Z");
        if (endDate) where.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
      }

      const items = await prisma.ticket.findMany({
        where,
        include: {
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

  get: protectedProcedure
    .input(z.object({ id: cuidSchema }))
    .query(async ({ input, ctx }) => {
      const ticket = await prisma.ticket.findUnique({
        where: { id: input.id },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found." });

      const isStaff = ["super-admin", "admin", "supervisor", "support-admin"].includes(ctx.user.role);
      if (!isStaff && ticket.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ticket;
    }),

  // Staff updates status, assignee, and adds internal notes
  update: staffProcedure
    .input(
      z.object({
        id: cuidSchema,
        status: ticketStatusSchema.optional(),
        priority: ticketPrioritySchema.optional(),
        assignedTo: cuidSchema.optional(),
        note: noteSchema.optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const ticket = await prisma.ticket.findUnique({ where: { id: input.id } });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found." });

      const data: Parameters<typeof prisma.ticket.update>[0]["data"] = {};
      if (input.status) data.status = input.status;
      if (input.priority) data.priority = input.priority;
      if (input.assignedTo) data.assignedTo = input.assignedTo;
      if (input.status === "resolved") data.resolvedAt = new Date();
      if (input.note) data.notes = { push: input.note };

      return prisma.ticket.update({ where: { id: input.id }, data });
    }),

  // Derived TAT report rows for staff dashboards (all tickets, recent first).
  report: staffProcedure
    .input(
      z.object({
        category: categoryInput,
        jobRole: jobRoleInput,
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
    )
    .query(async ({ input = {} }) => {
      const { category, jobRole, startDate, endDate } = input;

      const where: any = {};
      const catFilter = categoryFilter(category);
      if (catFilter) where.category = catFilter;
      const jrFilter = jobRoleFilter(jobRole);
      if (jrFilter) where.user = jrFilter;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate + "T00:00:00.000Z");
        if (endDate) where.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
      }

      const dbTickets = await prisma.ticket.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      });

      const assignedIds = [
        ...new Set(dbTickets.map((t) => t.assignedTo).filter(Boolean) as string[]),
      ];
      const assignedUsers = assignedIds.length
        ? await prisma.user.findMany({
            where: { id: { in: assignedIds } },
            select: { id: true, name: true },
          })
        : [];
      const assignedMap = Object.fromEntries(assignedUsers.map((u) => [u.id, u.name]));

      return dbTickets.map((t) => deriveTicketRow(t, assignedMap));
    }),

  stats: staffProcedure
    .input(
      z.object({
        category: categoryInput,
        jobRole: jobRoleInput,
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
    )
    .query(async ({ input = {} }) => {
      const { category, jobRole, startDate, endDate } = input;

      const dateWhere: any = {};
      if (startDate) dateWhere.gte = new Date(startDate + "T00:00:00.000Z");
      if (endDate) dateWhere.lte = new Date(endDate + "T23:59:59.999Z");
      const hasDateFilter = Object.keys(dateWhere).length > 0;

      const baseWhere: any = {};
      const catFilter = categoryFilter(category);
      if (catFilter) baseWhere.category = catFilter;
      const jrFilter = jobRoleFilter(jobRole);
      if (jrFilter) baseWhere.user = jrFilter;
      if (hasDateFilter) baseWhere.createdAt = dateWhere;

      const [total, open, inProgress, resolved, closed, low, medium, high, urgent] = await Promise.all([
        prisma.ticket.count({ where: baseWhere }),
        prisma.ticket.count({ where: { ...baseWhere, status: "open" } }),
        prisma.ticket.count({ where: { ...baseWhere, status: "in_progress" } }),
        prisma.ticket.count({ where: { ...baseWhere, status: "resolved" } }),
        prisma.ticket.count({ where: { ...baseWhere, status: "closed" } }),
        prisma.ticket.count({ where: { ...baseWhere, priority: "low" } }),
        prisma.ticket.count({ where: { ...baseWhere, priority: "medium" } }),
        prisma.ticket.count({ where: { ...baseWhere, priority: "high" } }),
        prisma.ticket.count({ where: { ...baseWhere, priority: "urgent" } }),
      ]);

      return {
        total,
        open,
        inProgress,
        resolved,
        closed,
        byPriority: { low, medium, high, urgent },
      };
    }),
});
