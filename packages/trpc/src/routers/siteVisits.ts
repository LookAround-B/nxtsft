import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, protectedProcedure, staffProcedure } from "../server.js";
import {
  cuidSchema,
  cursorSchema,
  limitSchema,
  datetimeSchema,
  noteSchema,
  siteVisitStatusSchema,
} from "../sanitize.js";

export const siteVisitsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: siteVisitStatusSchema.optional(),
        cursor: cursorSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input, ctx }) => {
      const { status, cursor, limit } = input;

      const where: any = {};

      // Role-based visibility
      if (ctx.user.role === "sales") {
        where.salesRepId = ctx.user.id;
      } else if (["user", "customer"].includes(ctx.user.role)) {
        where.userId = ctx.user.id;
      } // supervisors, admins, super-admins see all

      if (status) {
        where.status = status;
      }

      const items = await prisma.siteVisit.findMany({
        where,
        orderBy: { scheduledAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;

      return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
    }),

  create: protectedProcedure
    .input(
      z.object({
        propertyId: cuidSchema,
        scheduledAt: datetimeSchema,
        notes: noteSchema.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const property = await prisma.property.findFirst({
        where: { id: input.propertyId, deletedAt: null },
      });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      // Assign to the property owner's agent or leaves blank for admin assignment
      return prisma.siteVisit.create({
        data: {
          userId: ctx.user.id,
          propertyId: input.propertyId,
          scheduledAt: new Date(input.scheduledAt),
          notes: input.notes,
          status: "Scheduled",
        },
      });
    }),

  reschedule: protectedProcedure
    .input(
      z.object({
        id: cuidSchema,
        scheduledAt: datetimeSchema,
        notes: noteSchema.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const visit = await prisma.siteVisit.findUnique({ where: { id: input.id } });
      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Site visit not found." });

      const isOwner = visit.userId === ctx.user.id;
      const isSalesRep = visit.salesRepId === ctx.user.id;
      const isStaff = ["super-admin", "admin", "supervisor"].includes(ctx.user.role);

      if (!isOwner && !isSalesRep && !isStaff) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to reschedule this site visit." });
      }

      return prisma.siteVisit.update({
        where: { id: input.id },
        data: {
          scheduledAt: new Date(input.scheduledAt),
          status: "Rescheduled",
          notes: input.notes ? `${visit.notes ?? ""}\n[Rescheduled] ${input.notes}` : visit.notes,
        },
      });
    }),

  cancel: protectedProcedure
    .input(
      z.object({
        id: cuidSchema,
        notes: noteSchema.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const visit = await prisma.siteVisit.findUnique({ where: { id: input.id } });
      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Site visit not found." });

      const isOwner = visit.userId === ctx.user.id;
      const isSalesRep = visit.salesRepId === ctx.user.id;
      const isStaff = ["super-admin", "admin", "supervisor"].includes(ctx.user.role);

      if (!isOwner && !isSalesRep && !isStaff) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to cancel this site visit." });
      }

      return prisma.siteVisit.update({
        where: { id: input.id },
        data: {
          status: "Cancelled",
          notes: input.notes ? `${visit.notes ?? ""}\n[Cancelled] ${input.notes}` : visit.notes,
        },
      });
    }),

  complete: staffProcedure
    .input(
      z.object({
        id: cuidSchema,
        feedback: noteSchema.optional(),
        notes: noteSchema.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const visit = await prisma.siteVisit.findUnique({ where: { id: input.id } });
      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Site visit not found." });

      // Sales reps can only complete visits assigned to them
      if (ctx.user.role === "sales" && visit.salesRepId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to complete this site visit." });
      }

      return prisma.siteVisit.update({
        where: { id: input.id },
        data: {
          status: "Completed",
          feedback: input.feedback,
          notes: input.notes ? `${visit.notes ?? ""}\n[Completed] ${input.notes}` : visit.notes,
        },
      });
    }),
});
