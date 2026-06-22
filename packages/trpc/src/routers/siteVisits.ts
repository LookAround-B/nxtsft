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
      } else if (["user", "home-seller"].includes(ctx.user.role)) {
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

  // Geographic view for staff — site visits with property coordinates and the
  // assigned sales rep, for the Supervisor "Visit Calendar" map. SiteVisit has
  // no Prisma relations to Property/User, so we batch-resolve them by id.
  mapData: staffProcedure
    .input(z.object({ status: siteVisitStatusSchema.optional() }).optional())
    .query(async ({ input, ctx }) => {
      const where: { salesRepId?: string; status?: string } = {};
      // Sales reps only see their own; supervisors/admins see all.
      if (ctx.user.role === "sales") where.salesRepId = ctx.user.id;
      if (input?.status) where.status = input.status;

      const visits = await prisma.siteVisit.findMany({
        where,
        orderBy: { scheduledAt: "desc" },
        take: 200,
      });

      const propertyIds = [...new Set(visits.map((v) => v.propertyId))];
      const repIds = [...new Set(visits.map((v) => v.salesRepId).filter(Boolean))] as string[];

      const [properties, reps] = await Promise.all([
        propertyIds.length
          ? prisma.property.findMany({
              where: { id: { in: propertyIds } },
              select: {
                id: true,
                slug: true,
                title: true,
                location: { select: { city: true, locality: true, latitude: true, longitude: true } },
              },
            })
          : [],
        repIds.length
          ? prisma.user.findMany({ where: { id: { in: repIds } }, select: { id: true, name: true } })
          : [],
      ]);

      const propById = new Map(properties.map((p) => [p.id, p]));
      const repById = new Map(reps.map((r) => [r.id, r.name]));

      return visits.map((v) => {
        const p = propById.get(v.propertyId);
        return {
          id: v.id,
          status: v.status,
          scheduledAt: v.scheduledAt.toISOString(),
          rep: v.salesRepId ? repById.get(v.salesRepId) ?? "Unassigned" : "Unassigned",
          property: p?.title ?? "Property",
          slug: p?.slug ?? null,
          city: p?.location?.city ?? null,
          locality: p?.location?.locality ?? null,
          lat: p?.location?.latitude ?? null,
          lng: p?.location?.longitude ?? null,
        };
      });
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
