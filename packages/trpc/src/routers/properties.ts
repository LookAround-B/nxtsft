import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../server.js";

// Serialize BigInt price fields to number for JSON transport
function serializeProperty<T extends object>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? Number(v) : v)),
  );
}

// Fields returned in list view — no owner phone (credit-gated)
const ownerPublicSelect = {
  id: true,
  name: true,
  avatar: true,
  role: true,
  city: true,
  verified: true,
};

const propertyInclude = {
  location: true,
  owner: { select: ownerPublicSelect },
};

function generateSlug(title: string, city: string) {
  const base = `${title}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${base}-${Date.now()}`;
}

export const propertiesRouter = router({
  // Browse properties — public, cursor-paginated
  list: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
        type: z.string().optional(),
        purpose: z.enum(["Sale", "Rent"]).optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        bedrooms: z.number().int().optional(),
        search: z.string().optional(),
        featured: z.boolean().optional(),
        cursor: z.string().optional(), // id of the last item
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const { cursor, limit, city, type, purpose, minPrice, maxPrice, bedrooms, search, featured } = input;

      const where: NonNullable<Parameters<typeof prisma.property.findMany>[0]>["where"] = {
        deletedAt: null,
        status: "Active",
      };

      if (city) where.location = { city: { equals: city, mode: "insensitive" } };
      if (type) where.type = type;
      if (purpose) where.purpose = purpose;
      if (bedrooms) where.bedrooms = bedrooms;
      if (featured !== undefined) where.featured = featured;

      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = BigInt(minPrice);
        if (maxPrice !== undefined) where.price.lte = BigInt(maxPrice);
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { type: { contains: search, mode: "insensitive" } },
          { bhk: { contains: search, mode: "insensitive" } },
          { builder: { contains: search, mode: "insensitive" } },
          { location: { locality: { contains: search, mode: "insensitive" } } },
          { location: { city: { contains: search, mode: "insensitive" } } },
          { location: { state: { contains: search, mode: "insensitive" } } },
        ];
      }

      const items = await prisma.property.findMany({
        where,
        include: propertyInclude,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;
      const total = await prisma.property.count({ where });

      return serializeProperty({ items: page, nextCursor: page.at(-1)?.id ?? null, hasMore, total });
    }),

  // Per-property engagement: interest (leads), wishlists, contact requests.
  // Names are anonymized ("Rohan M.") — safe for public social proof.
  engagement: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const propertyId = input.id;
      const since7d = new Date(Date.now() - 7 * 86_400_000);
      const unlockWhere = { propertyId, reason: "contact_unlock" } as const;

      const [leads, favorites, unlocks, interested, wishlisted, contactRequested, l7, f7, u7] =
        await Promise.all([
          prisma.lead.findMany({
            where: { propertyId }, orderBy: { createdAt: "desc" }, take: 8,
            select: { name: true, createdAt: true, user: { select: { name: true } } },
          }),
          prisma.favorite.findMany({
            where: { propertyId }, orderBy: { createdAt: "desc" }, take: 8,
            select: { createdAt: true, user: { select: { name: true } } },
          }),
          prisma.creditTransaction.findMany({
            where: unlockWhere, orderBy: { createdAt: "desc" }, take: 8,
            select: { userId: true, createdAt: true },
          }),
          prisma.lead.count({ where: { propertyId } }),
          prisma.favorite.count({ where: { propertyId } }),
          prisma.creditTransaction.count({ where: unlockWhere }),
          prisma.lead.count({ where: { propertyId, createdAt: { gte: since7d } } }),
          prisma.favorite.count({ where: { propertyId, createdAt: { gte: since7d } } }),
          prisma.creditTransaction.count({ where: { ...unlockWhere, createdAt: { gte: since7d } } }),
        ]);

      // CreditTransaction has no user relation — batch-resolve names.
      const unlockUserIds = [...new Set(unlocks.map((u) => u.userId))];
      const unlockUsers = unlockUserIds.length
        ? await prisma.user.findMany({ where: { id: { in: unlockUserIds } }, select: { id: true, name: true } })
        : [];
      const nameById = new Map(unlockUsers.map((u) => [u.id, u.name]));

      const anon = (full?: string | null) => {
        const parts = (full ?? "Someone").trim().split(/\s+/);
        return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.` : parts[0]!;
      };

      const recent = [
        ...leads.map((l) => ({ name: anon(l.name ?? l.user?.name), action: "interested" as const, at: l.createdAt })),
        ...favorites.map((f) => ({ name: anon(f.user?.name), action: "wishlisted" as const, at: f.createdAt })),
        ...unlocks.map((u) => ({ name: anon(nameById.get(u.userId)), action: "contact" as const, at: u.createdAt })),
      ]
        .sort((a, b) => b.at.getTime() - a.at.getTime())
        .slice(0, 8)
        .map((e) => ({ name: e.name, action: e.action, at: e.at.toISOString() }));

      return {
        counts: { interested, wishlisted, contactRequested, total: interested + wishlisted + contactRequested },
        recent,
        trending: l7 + f7 + u7 >= 4,
      };
    }),

  // Single property by id or slug
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const property = await prisma.property.findFirst({
        where: {
          OR: [{ id: input.id }, { slug: input.id }],
          deletedAt: null,
        },
        include: propertyInclude,
      });

      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      // Increment view count without blocking the response
      prisma.property.update({ where: { id: property.id }, data: { views: { increment: 1 } } }).catch(() => null);

      return serializeProperty(property);
    }),

  // Create a new property listing (authenticated owners)
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(10).max(200),
        description: z.string().optional(),
        type: z.enum(["Apartment", "Villa", "Studio", "Office", "Bungalow", "Plot", "PG"]),
        purpose: z.enum(["Sale", "Rent"]),
        price: z.number().int().positive(),
        area: z.number().int().positive(),
        bhk: z.string().optional(),
        bedrooms: z.number().int().min(0).default(0),
        bathrooms: z.number().int().min(0).default(0),
        balconies: z.number().int().min(0).default(0),
        parking: z.number().int().min(0).default(0),
        floors: z.string().optional(),
        age: z.string().optional(),
        furnishing: z.enum(["Furnished", "Semi-Furnished", "Unfurnished"]).optional(),
        facing: z.string().optional(),
        possession: z.string().optional(),
        builder: z.string().optional(),
        rera: z.string().min(1, "RERA registration number is required").regex(/^[a-zA-Z0-9\/\-]+$/, "Invalid RERA registration number format"),
        city: z.string().min(2),
        state: z.string().min(2),
        locality: z.string().min(2),
        address: z.string().optional(),
        zipCode: z.string().optional(),
        latitude: z.number().default(0),
        longitude: z.number().default(0),
        amenities: z.array(z.string()).default([]),
        images: z.array(z.string()).default([]),
        nearbyPlaces: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { city, state, locality, address, zipCode, latitude, longitude, nearbyPlaces, price, area, ...rest } =
        input;

      const slug = generateSlug(input.title, city);

      const property = await prisma.property.create({
        data: {
          ...rest,
          slug,
          price: BigInt(price),
          pricePerSqft: Math.round(price / area),
          area,
          ownerId: ctx.user.id,
          location: {
            create: { city, state, locality, address, zipCode, latitude, longitude, nearbyPlaces },
          },
        },
        include: propertyInclude,
      });

      return serializeProperty(property);
    }),

  // Update own property (or admin overriding)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(10).max(200).optional(),
        description: z.string().optional(),
        price: z.number().int().positive().optional(),
        area: z.number().int().positive().optional(),
        bhk: z.string().optional(),
        bedrooms: z.number().int().min(0).optional(),
        bathrooms: z.number().int().min(0).optional(),
        balconies: z.number().int().min(0).optional(),
        parking: z.number().int().min(0).optional(),
        furnishing: z.enum(["Furnished", "Semi-Furnished", "Unfurnished"]).optional(),
        facing: z.string().optional(),
        possession: z.string().optional(),
        rera: z.string().regex(/^[a-zA-Z0-9\/\-]+$/, "Invalid RERA registration number format").optional(),
        status: z.enum(["Active", "Sold", "Rented", "Inactive"]).optional(),
        amenities: z.array(z.string()).optional(),
        images: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, price, area, ...rest } = input;

      const property = await prisma.property.findFirst({ where: { id, deletedAt: null } });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      const isOwner = property.ownerId === ctx.user.id;
      const isAdmin = ["admin", "super-admin"].includes(ctx.user.role);
      if (!isOwner && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });

      const priceUpdate = price !== undefined ? { price: BigInt(price) } : {};
      const sqftUpdate = price !== undefined && area !== undefined ? { pricePerSqft: Math.round(price / area) } : {};

      const updated = await prisma.property.update({
        where: { id },
        data: { ...rest, ...priceUpdate, ...sqftUpdate },
        include: propertyInclude,
      });

      return serializeProperty(updated);
    }),

  // Soft-delete (owner or admin)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const property = await prisma.property.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      const isOwner = property.ownerId === ctx.user.id;
      const isAdmin = ["admin", "super-admin"].includes(ctx.user.role);
      if (!isOwner && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });

      await prisma.property.update({ where: { id: input.id }, data: { deletedAt: new Date() } });
      return { ok: true };
    }),

  // Toggle featured (admin only)
  toggleFeatured: adminProcedure
    .input(z.object({ id: z.string(), featured: z.boolean() }))
    .mutation(async ({ input }) => {
      const updated = await prisma.property.update({
        where: { id: input.id },
        data: { featured: input.featured },
      });
      return { id: updated.id, featured: updated.featured };
    }),

  // Unlock owner contact — costs 1 credit (credit gate)
  unlockContact: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.credits < 1) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Insufficient credits. Purchase a plan to unlock contacts.",
        });
      }

      const property = await prisma.property.findFirst({
        where: { id: input.id, deletedAt: null },
        include: { owner: { select: { id: true, name: true, phone: true } } },
      });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      await Promise.all([
        prisma.user.update({ where: { id: ctx.user.id }, data: { credits: { decrement: 1 } } }),
        prisma.creditTransaction.create({
          data: { userId: ctx.user.id, type: "debit", amount: 1, reason: "contact_unlock", propertyId: input.id },
        }),
        prisma.property.update({ where: { id: input.id }, data: { contacts: { increment: 1 } } }),
      ]);

      return { phone: property.owner.phone, name: property.owner.name };
    }),
});
