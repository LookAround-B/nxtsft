import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, protectedProcedure, staffProcedure } from "../server.js";

const TicketCategory = z.enum(["payment", "property", "agent", "technical", "other"]);
const TicketPriority = z.enum(["low", "medium", "high", "urgent"]);
const TicketStatus = z.enum(["open", "in_progress", "resolved", "closed"]);

export const ticketsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        subject: z.string().min(5).max(200),
        description: z.string().min(10),
        category: TicketCategory,
        priority: TicketPriority.default("medium"),
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
        status: TicketStatus.optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { cursor, limit, status } = input;

      const isStaff = ["super-admin", "admin", "supervisor", "support-admin"].includes(ctx.user.role);

      const where: NonNullable<Parameters<typeof prisma.ticket.findMany>[0]>["where"] = {};
      if (!isStaff) where.userId = ctx.user.id; // consumers see only own tickets
      if (status) where.status = status;

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
    .input(z.object({ id: z.string() }))
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
        id: z.string(),
        status: TicketStatus.optional(),
        priority: TicketPriority.optional(),
        assignedTo: z.string().optional(),
        note: z.string().optional(),
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

  stats: staffProcedure.query(async () => {
    const [total, open, inProgress, resolved, closed, low, medium, high, urgent] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: "open" } }),
      prisma.ticket.count({ where: { status: "in_progress" } }),
      prisma.ticket.count({ where: { status: "resolved" } }),
      prisma.ticket.count({ where: { status: "closed" } }),
      prisma.ticket.count({ where: { priority: "low" } }),
      prisma.ticket.count({ where: { priority: "medium" } }),
      prisma.ticket.count({ where: { priority: "high" } }),
      prisma.ticket.count({ where: { priority: "urgent" } }),
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
