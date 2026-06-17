import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, publicProcedure, protectedProcedure, staffProcedure } from "../server.js";
import { cuidSchema, cursorSchema, limitSchema, safeString } from "../sanitize.js";

export const listingsRouter = router({
  // Get all listings for a property
  byProperty: publicProcedure
    .input(z.object({ propertyId: cuidSchema }))
    .query(async ({ input }) => {
      const listings = await prisma.listing.findMany({
        where: { propertyId: input.propertyId, active: true },
        include: {
          agent: { select: { id: true, name: true, avatar: true, verified: true } },
          property: { select: { id: true, title: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return listings;
    }),

  // Get user's own listings
  mine: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional())
    .query(async ({ input, ctx }) => {
      const listings = await prisma.listing.findMany({
        where: { createdBy: ctx.user.id },
        include: {
          property: { select: { id: true, title: true, slug: true, images: true, price: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
      });

      return listings.map((l) => ({
        ...l,
        property: {
          ...l.property,
          price: Number(l.property.price),
        },
      }));
    }),

  // All listings for staff/admin
  all: staffProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(200).default(50),
        cursor: cursorSchema.optional(),
      }),
    )
    .query(async ({ input }) => {
      const { limit, cursor } = input;

      const items = await prisma.listing.findMany({
        include: {
          property: { select: { id: true, title: true, slug: true, images: true } },
          agent: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;

      return {
        items: page,
        nextCursor: page.at(-1)?.id ?? null,
        hasMore,
      };
    }),

  // Create listing
  create: protectedProcedure
    .input(
      z.object({
        propertyId: cuidSchema,
        description: safeString(1000).optional(),
        highlights: z.array(safeString(100)).default([]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const property = await prisma.property.findFirst({
        where: { id: input.propertyId, deletedAt: null },
      });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      // Only property owner or admin can create listings
      if (property.ownerId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot create listing for this property." });
      }

      return prisma.listing.create({
        data: {
          propertyId: input.propertyId,
          createdBy: ctx.user.id,
          description: input.description,
          highlights: input.highlights,
        },
        include: {
          property: { select: { id: true, title: true } },
        },
      });
    }),

  // Update listing
  update: protectedProcedure
    .input(
      z.object({
        id: cuidSchema,
        description: safeString(1000).optional(),
        highlights: z.array(safeString(100)).optional(),
        active: z.boolean().optional(),
        promoted: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const listing = await prisma.listing.findUnique({ where: { id: input.id } });
      if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found." });

      // Only creator or admin can update
      if (listing.createdBy !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update this listing." });
      }

      const { id, ...data } = input;
      return prisma.listing.update({
        where: { id },
        data,
        include: { property: { select: { id: true, title: true } } },
      });
    }),

  // Delete listing
  delete: protectedProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const listing = await prisma.listing.findUnique({ where: { id: input.id } });
      if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found." });

      if (listing.createdBy !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete this listing." });
      }

      await prisma.listing.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
