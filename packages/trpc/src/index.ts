import { router, publicProcedure, protectedProcedure, adminProcedure } from "./server";
import prisma from "@nxtsft/db";
import { z } from "zod";

// Helper to handle BigInt serialization in tRPC JSON payloads
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === "object") {
    if (obj instanceof Date) return obj.toISOString();
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = serializeBigInt(obj[key]);
    }
    return newObj;
  }
  return obj;
}

export const appRouter = router({
  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTIES PROCEDURES
  // ═══════════════════════════════════════════════════════════════════════════
  properties: router({
    list: publicProcedure
      .input(
        z.object({
          city: z.string().optional(),
          type: z.string().optional(),
          purpose: z.string().optional(),
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
          bedrooms: z.number().optional(),
          search: z.string().optional(),
        }),
      )
      .query(async ({ input }) => {
        const whereClause: any = { deletedAt: null };

        if (input.city) {
          whereClause.location = {
            city: { equals: input.city, mode: "insensitive" },
          };
        }
        if (input.type) {
          whereClause.type = input.type;
        }
        if (input.purpose) {
          whereClause.purpose = input.purpose;
        }
        if (input.bedrooms) {
          whereClause.bedrooms = input.bedrooms;
        }
        if (input.minPrice || input.maxPrice) {
          whereClause.price = {};
          if (input.minPrice) {
            whereClause.price.gte = BigInt(input.minPrice);
          }
          if (input.maxPrice) {
            whereClause.price.lte = BigInt(input.maxPrice);
          }
        }
        if (input.search) {
          whereClause.OR = [
            { title: { contains: input.search, mode: "insensitive" } },
            { description: { contains: input.search, mode: "insensitive" } },
          ];
        }

        const data = await prisma.property.findMany({
          where: whereClause,
          include: {
            location: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        return serializeBigInt(data);
      }),

    get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
      const data = await prisma.property.findFirst({
        where: { id: input.id, deletedAt: null },
        include: {
          location: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
        },
      });
      if (!data) throw new Error("Property not found");
      return serializeBigInt(data);
    }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          type: z.string(),
          purpose: z.string(),
          price: z.number(),
          area: z.number(),
          bedrooms: z.number().default(0),
          bathrooms: z.number().default(0),
          balconies: z.number().default(0),
          parking: z.number().default(0),
          city: z.string(),
          state: z.string(),
          locality: z.string(),
          address: z.string().optional(),
          zipCode: z.string().optional(),
          latitude: z.number().default(0),
          longitude: z.number().default(0),
          amenities: z.array(z.string()).default([]),
          images: z.array(z.string()).default([]),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const data = await prisma.property.create({
          data: {
            title: input.title,
            description: input.description,
            type: input.type,
            purpose: input.purpose,
            price: BigInt(input.price),
            pricePerSqft: Math.round(input.price / input.area),
            area: input.area,
            bedrooms: input.bedrooms,
            bathrooms: input.bathrooms,
            balconies: input.balconies,
            parking: input.parking,
            ownerId: ctx.user.id,
            amenities: input.amenities,
            images: input.images,
            location: {
              create: {
                city: input.city,
                state: input.state,
                locality: input.locality,
                address: input.address,
                zipCode: input.zipCode,
                latitude: input.latitude,
                longitude: input.longitude,
              },
            },
          },
          include: {
            location: true,
          },
        });
        return serializeBigInt(data);
      }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // LISTINGS PROCEDURES
  // ═══════════════════════════════════════════════════════════════════════════
  listings: router({
    list: publicProcedure.query(async () => {
      const data = await prisma.listing.findMany({
        include: {
          property: {
            include: {
              location: true,
            },
          },
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return serializeBigInt(data);
    }),

    create: protectedProcedure
      .input(
        z.object({
          propertyId: z.string(),
          description: z.string().optional(),
          highlights: z.array(z.string()).default([]),
          active: z.boolean().default(true),
          promoted: z.boolean().default(false),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const property = await prisma.property.findUnique({
          where: { id: input.propertyId },
        });
        if (!property) throw new Error("Property not found");

        const data = await prisma.listing.create({
          data: {
            propertyId: input.propertyId,
            createdBy: ctx.user.id,
            description: input.description,
            highlights: input.highlights,
            active: input.active,
            promoted: input.promoted,
          },
          include: {
            property: true,
          },
        });
        return serializeBigInt(data);
      }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // LEADS PROCEDURES
  // ═══════════════════════════════════════════════════════════════════════════
  leads: router({
    list: protectedProcedure.query(async () => {
      const data = await prisma.lead.findMany({
        include: {
          property: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return serializeBigInt(data);
    }),

    create: protectedProcedure
      .input(
        z.object({
          propertyId: z.string(),
          contactName: z.string(),
          contactEmail: z.string().email(),
          contactPhone: z.string(),
          source: z.string().optional(),
          notes: z.string().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const property = await prisma.property.findUnique({
          where: { id: input.propertyId },
        });
        if (!property) throw new Error("Property not found");

        const data = await prisma.lead.create({
          data: {
            propertyId: input.propertyId,
            userId: ctx.user.id,
            contactName: input.contactName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            status: "New",
            source: input.source,
            notes: input.notes,
          },
          include: {
            property: true,
          },
        });
        return serializeBigInt(data);
      }),

    assign: adminProcedure
      .input(
        z.object({
          id: z.string(),
          assignedTo: z.string(),
        }),
      )
      .mutation(async ({ input }) => {
        const data = await prisma.lead.update({
          where: { id: input.id },
          data: {
            status: "Contacted",
            notes: {
              // Append assignment note
              push: `Assigned to ${input.assignedTo}`,
            } as any,
          },
        });
        return serializeBigInt(data);
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.string(),
        }),
      )
      .mutation(async ({ input }) => {
        const data = await prisma.lead.update({
          where: { id: input.id },
          data: { status: input.status },
        });
        return serializeBigInt(data);
      }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // USER / PORTAL PROCEDURES
  // ═══════════════════════════════════════════════════════════════════════════
  users: router({
    getSelf: protectedProcedure.query(async ({ ctx }) => {
      return serializeBigInt(ctx.user);
    }),
  }),
});

export type AppRouter = typeof appRouter;
