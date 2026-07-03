import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  cuidSchema,
  safeString,
  geoTextSchema,
  purposeSchema,
  priceSchema,
  roomCountSchema,
  searchSchema,
  pageSchema,
  limitSchema,
  descriptionSchema,
  propertyTypeSchema,
  areaSchema,
  furnishingSchema,
  reraSchema,
  latitudeSchema,
  longitudeSchema,
  amenitiesSchema,
  safeUrlArraySchema,
  nearbyPlacesSchema,
  propertyStatusSchema,
} from "../sanitize";
import prisma from "@nxtsft/db";
import { notify, notifyCredit } from "../notify";
import { router, publicProcedure, protectedProcedure, adminProcedure, contactRateLimit } from "../server";

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

// Default cover image per property type — used for bulk-imported listings that
// arrive without their own photos. Files live in apps/web/public/categories/.
const CATEGORY_IMAGE: Record<string, string> = {
  Apartment: "/categories/apartment.png",
  Studio: "/categories/studio.png",
  Villa: "/categories/villa.png",
  Bungalow: "/categories/villa.png",
  Office: "/categories/commercial.png",
  Plot: "/categories/plot.png",
  PG: "/categories/pg.png",
};

// Split a comma-separated cell (amenities, PG occupancy, …) into a clean array.
function splitList(v: string | undefined): string[] {
  return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

// Server-side state-specific RERA validation (mirrors apps/web/src/lib/rera.ts).
// Shared by single create and bulk create. Throws BAD_REQUEST on mismatch.
// The strict per-state pattern only applies when the authority is plain
// "RERA" — HMDA/DTCP/BDA/CMDA/state-RERA-variant registrations follow their
// own authority-specific formats, and "Others" covers approvals (or
// RERA-exempt properties) that don't fit any of the above.
function assertReraValid(city: string, rera: string | undefined, authority?: string) {
  if (!rera) return;
  const CITY_STATE: Record<string, string> = {
    Mumbai: "Maharashtra", Pune: "Maharashtra", Bengaluru: "Karnataka",
    Hyderabad: "Telangana", Chennai: "Tamil Nadu", "Delhi NCR": "Delhi",
    Noida: "Uttar Pradesh", Gurgaon: "Haryana", Ahmedabad: "Gujarat",
    Surat: "Gujarat", Kolkata: "West Bengal", Kochi: "Kerala",
    Jaipur: "Rajasthan", Lucknow: "Uttar Pradesh",
  };
  const STATE_PATTERNS: Record<string, RegExp> = {
    Maharashtra: /^P\d{11}$/, Karnataka: /^PRM\/KA\/RERA\//i,
    Telangana: /^P024\d{8}$/, Delhi: /^DLRERA\d{4}[A-Z]\d{4}$/,
    "Uttar Pradesh": /^UPRERAPRJ\d{7}$/, Haryana: /^GGM\//i,
    "Tamil Nadu": /^TN\/29\//i, "West Bengal": /^WBRERA\//i,
    Rajasthan: /^RAJ\//i, Kerala: /^K-RERA\//i, Gujarat: /^PR\/GJ\//i,
    "Andhra Pradesh": /^AP\//i,
  };
  const isRera = !authority || authority === "RERA";
  const stateName = CITY_STATE[city] ?? "";
  const pattern = isRera ? (STATE_PATTERNS[stateName] ?? /^[A-Za-z0-9\/\-]+$/) : /^[A-Za-z0-9\/\-]+$/;
  if (!pattern.test(rera.trim())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: isRera && stateName && STATE_PATTERNS[stateName]
        ? `Invalid RERA format for ${stateName}. Check your state RERA portal.`
        : "Invalid registration number format",
    });
  }
}

export const propertiesRouter = router({
  // Browse properties — public, page-paginated
  list: publicProcedure
    .input(
      z.object({
        city: geoTextSchema.optional(),
        type: safeString(50).optional(),
        purpose: purposeSchema.optional(),
        minPrice: priceSchema.optional(),
        maxPrice: priceSchema.optional(),
        bedrooms: roomCountSchema.optional(),
        search: searchSchema.optional(),
        featured: z.boolean().optional(),
        // PG-specific filters (only meaningful when type === "PG")
        pgGender: z.enum(["Boys", "Girls", "Co-living"]).optional(),
        pgOccupancy: safeString(30).optional(),
        page: pageSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { page, limit, city, type, purpose, minPrice, maxPrice, bedrooms, search, featured, pgGender, pgOccupancy } = input;

      const where: NonNullable<Parameters<typeof prisma.property.findMany>[0]>["where"] = {
        deletedAt: null,
        status: "Active",
      };

      if (city) where.location = { city: { equals: city, mode: "insensitive" } };
      if (type) where.type = type;
      if (purpose) where.purpose = purpose;
      if (bedrooms) where.bedrooms = bedrooms;
      if (featured !== undefined) where.featured = featured;
      if (pgGender) where.pgGender = pgGender;
      if (pgOccupancy) where.pgOccupancy = { has: pgOccupancy };

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
        take: limit,
        skip: (page - 1) * limit,
      });
      const total = await prisma.property.count({ where });

      return serializeProperty({ items, page, totalPages: Math.max(1, Math.ceil(total / limit)), total });
    }),

  // Per-property engagement: interest (leads), wishlists, contact requests.
  // Names are anonymized ("Rohan M.") — safe for public social proof.
  engagement: publicProcedure
    .input(z.object({ id: cuidSchema }))
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

  // Public: report an issue on a listing (GOL-123 "Report what was not correct").
  // Flag-style reports are anonymous; "more_info" carries optional contact back.
  // Stored as an Enquiry (source "Report") so staff triage it with other enquiries.
  reportIssue: publicProcedure
    .use(contactRateLimit)
    .input(
      z.object({
        propertyId: cuidSchema,
        reason: z.enum(["broker", "rented", "sold", "wrong_info", "more_info"]),
        name: safeString(80, 1).optional(),
        phone: safeString(20, 1).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const property = await prisma.property.findFirst({
        where: { id: input.propertyId, deletedAt: null },
        select: { title: true, slug: true },
      });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      const REASON_LABEL: Record<typeof input.reason, string> = {
        broker: "Listed by Broker",
        rented: "Rented Out",
        sold: "Sold Out",
        wrong_info: "Wrong Info",
        more_info: "Request More Info",
      };

      const contact = input.name || input.phone
        ? `\nReporter: ${input.name ?? "—"}${input.phone ? ` (${input.phone})` : ""}`
        : "";

      await prisma.enquiry.create({
        data: {
          name: input.name || "Property Report",
          email: "report@nxtsft.local",
          phone: input.phone,
          message: `[${REASON_LABEL[input.reason]}] reported on "${property.title}" (/${property.slug}).${contact}`,
          source: "Report",
          status: "New",
        },
      });

      return { ok: true };
    }),

  // Single property by id or slug
  get: publicProcedure
    .input(z.object({ id: safeString(100, 1) }))
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
        title: safeString(200, 10),
        description: descriptionSchema.optional(),
        type: propertyTypeSchema,
        purpose: purposeSchema,
        price: priceSchema,
        area: areaSchema,
        builtUpArea: areaSchema.optional(),
        bhk: safeString(20).optional(),
        bedrooms: roomCountSchema,
        bathrooms: roomCountSchema,
        balconies: roomCountSchema,
        parking: roomCountSchema,
        floors: safeString(20).optional(),
        age: safeString(20).optional(),
        furnishing: furnishingSchema.optional(),
        facing: safeString(30).optional(),
        possession: safeString(30).optional(),
        builder: safeString(100).optional(),
        projectId: cuidSchema.optional(),
        rera: reraSchema.optional(),
        reraLabel: safeString(20).optional(),
        city: geoTextSchema,
        state: geoTextSchema,
        locality: geoTextSchema,
        address: safeString(500).optional(),
        zipCode: safeString(6).optional(),
        latitude: latitudeSchema,
        longitude: longitudeSchema,
        amenities: amenitiesSchema,
        images: safeUrlArraySchema,
        nearbyPlaces: nearbyPlacesSchema,
        // PG-specific (optional; only set when type === "PG")
        pgGender: z.enum(["Boys", "Girls", "Co-living"]).optional(),
        pgOccupancy: amenitiesSchema.optional(),
        pgAvailableBeds: roomCountSchema.optional(),
        pgDeposit: z.coerce.number().int().nonnegative().max(999_999_999_999).optional(),
        pgRoomTypes: amenitiesSchema.optional(),
        pgHouseRules: amenitiesSchema.optional(),
        pgFood: safeString(30).optional(),
        virtualTourUrl: safeString(500).optional(),
        walkthroughVideoUrl: safeString(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { city, state, locality, address, zipCode, latitude, longitude, nearbyPlaces, price, area, pgDeposit, ...rest } =
        input;

      assertReraValid(city, input.rera, input.reraLabel);

      const slug = generateSlug(input.title, city);

      const property = await prisma.property.create({
        data: {
          ...rest,
          slug,
          price: BigInt(price),
          pricePerSqft: Math.round(price / area),
          area,
          ...(pgDeposit !== undefined && { pgDeposit: BigInt(pgDeposit) }),
          ownerId: ctx.user.id,
          location: {
            create: { city, state, locality, address, zipCode, latitude, longitude, nearbyPlaces },
          },
        },
        include: propertyInclude,
      });

      await notify({
        userId: ctx.user.id,
        type: "listing_published",
        title: "Listing published",
        content: `"${property.title}" is now live.`,
        actionUrl: `/properties/${property.slug}`,
      });

      return serializeProperty(property);
    }),

  // Bulk-create listings from a parsed spreadsheet (home sellers). Each listing
  // is created with status "Pending" and stays hidden from buyers until an admin
  // approves it. Rows are validated individually so one bad row doesn't sink the
  // batch — the result reports per-row errors (row numbers are 1-based incl. the
  // header, matching the uploaded sheet). Photos are added later per listing.
  bulkCreate: protectedProcedure
    .input(z.object({ rows: z.array(z.unknown()).min(1).max(500) }))
    .mutation(async ({ input, ctx }) => {
      // Numbers may arrive as strings from CSV cells — coerce them. Empty
      // optional cells arrive as undefined from the client, so .optional() holds.
      const rowSchema = z.object({
        title: safeString(200, 10),
        description: descriptionSchema.optional(),
        type: propertyTypeSchema,
        purpose: purposeSchema,
        price: z.coerce.number().int().positive().max(999_999_999_999),
        area: z.coerce.number().int().positive().max(9_999_999),
        builtUpArea: z.coerce.number().int().positive().max(9_999_999).optional(),
        bhk: safeString(20).optional(),
        bedrooms: z.coerce.number().int().min(0).max(50).default(0),
        bathrooms: z.coerce.number().int().min(0).max(50).default(0),
        balconies: z.coerce.number().int().min(0).max(50).optional(),
        parking: z.coerce.number().int().min(0).max(50).optional(),
        furnishing: furnishingSchema.optional(),
        facing: safeString(30).optional(),
        floors: safeString(20).optional(),
        age: safeString(20).optional(),
        possession: safeString(30).optional(),
        builder: safeString(100).optional(),
        reraLabel: safeString(20).optional(),
        rera: reraSchema.optional(),
        city: geoTextSchema,
        state: geoTextSchema,
        locality: geoTextSchema,
        address: safeString(500).optional(),
        zipCode: safeString(6).optional(),
        latitude: z.coerce.number().min(-90).max(90).optional(),
        longitude: z.coerce.number().min(-180).max(180).optional(),
        amenities: safeString(2000).optional(),
        images: safeString(4000).optional(),
        virtualTourUrl: safeString(500).optional(),
        walkthroughVideoUrl: safeString(500).optional(),
        // PG-specific (only meaningful when type === "PG")
        pgGender: z.enum(["Boys", "Girls", "Co-living"]).optional(),
        pgOccupancy: safeString(200).optional(),
        pgAvailableBeds: z.coerce.number().int().min(0).max(9999).optional(),
        pgDeposit: z.coerce.number().int().min(0).max(999_999_999_999).optional(),
        pgRoomTypes: safeString(200).optional(),
        pgHouseRules: safeString(2000).optional(),
        pgFood: safeString(30).optional(),
      });

      const errors: { row: number; message: string }[] = [];
      let created = 0;

      for (let i = 0; i < input.rows.length; i++) {
        const sheetRow = i + 2; // +1 for 0-index, +1 for the header row
        const parsed = rowSchema.safeParse(input.rows[i]);
        if (!parsed.success) {
          errors.push({ row: sheetRow, message: parsed.error.issues[0]?.message ?? "Invalid row" });
          continue;
        }
        const d = parsed.data;
        try {
          assertReraValid(d.city, d.rera, d.reraLabel);
          // Use uploaded image URLs if given, else the type's default cover.
          const images = splitList(d.images);
          const isPg = d.type === "PG";
          await prisma.property.create({
            data: {
              title: d.title,
              description: d.description,
              type: d.type,
              purpose: d.purpose,
              bhk: d.bhk,
              bedrooms: d.bedrooms,
              bathrooms: d.bathrooms,
              balconies: d.balconies,
              parking: d.parking,
              furnishing: d.furnishing,
              facing: d.facing,
              floors: d.floors,
              age: d.age,
              possession: d.possession,
              builder: d.builder,
              reraLabel: d.reraLabel,
              rera: d.rera,
              slug: generateSlug(d.title, d.city),
              price: BigInt(d.price),
              pricePerSqft: Math.round(d.price / d.area),
              area: d.area,
              builtUpArea: d.builtUpArea,
              amenities: splitList(d.amenities),
              images: images.length ? images : [CATEGORY_IMAGE[d.type] ?? CATEGORY_IMAGE.Apartment!],
              virtualTourUrl: d.virtualTourUrl,
              walkthroughVideoUrl: d.walkthroughVideoUrl,
              status: "Pending",
              ownerId: ctx.user.id,
              // PG fields only when the listing is a PG.
              ...(isPg
                ? {
                    pgGender: d.pgGender,
                    pgOccupancy: splitList(d.pgOccupancy),
                    pgAvailableBeds: d.pgAvailableBeds,
                    pgDeposit: d.pgDeposit != null ? BigInt(d.pgDeposit) : undefined,
                    pgRoomTypes: splitList(d.pgRoomTypes),
                    pgHouseRules: splitList(d.pgHouseRules),
                    pgFood: d.pgFood,
                  }
                : {}),
              location: {
                create: {
                  city: d.city,
                  state: d.state,
                  locality: d.locality,
                  address: d.address,
                  zipCode: d.zipCode,
                  latitude: d.latitude ?? 0,
                  longitude: d.longitude ?? 0,
                },
              },
            },
          });
          created++;
        } catch (e) {
          errors.push({ row: sheetRow, message: e instanceof TRPCError ? e.message : "Failed to create listing" });
        }
      }

      if (created > 0) {
        await notify({
          userId: ctx.user.id,
          type: "listing_submitted",
          title: `${created} listing${created > 1 ? "s" : ""} submitted`,
          content: "Your uploaded listings are pending admin approval.",
        });
      }

      return { received: input.rows.length, created, failed: errors.length, errors: errors.slice(0, 100) };
    }),

  // Update own property (or admin overriding)
  update: protectedProcedure
    .input(
      z.object({
        id: cuidSchema,
        title: safeString(200, 10).optional(),
        description: descriptionSchema.optional(),
        price: priceSchema.optional(),
        area: areaSchema.optional(),
        builtUpArea: areaSchema.optional(),
        bhk: safeString(20).optional(),
        bedrooms: roomCountSchema.optional(),
        bathrooms: roomCountSchema.optional(),
        balconies: roomCountSchema.optional(),
        parking: roomCountSchema.optional(),
        furnishing: furnishingSchema.optional(),
        facing: safeString(30).optional(),
        possession: safeString(30).optional(),
        rera: reraSchema.optional(),
        reraLabel: safeString(20).optional(),
        status: propertyStatusSchema.optional(),
        amenities: amenitiesSchema.optional(),
        images: safeUrlArraySchema.optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, price, area, latitude, longitude, ...rest } = input;

      const property = await prisma.property.findFirst({ where: { id, deletedAt: null } });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      const isOwner = property.ownerId === ctx.user.id;
      const isAdmin = ["admin", "super-admin"].includes(ctx.user.role);
      if (!isOwner && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });

      // A pending listing can only change status via admin approval — owners
      // must not self-approve their way out of review.
      if (input.status && property.status === "Pending" && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Pending listings require admin approval before going live.",
        });
      }

      const priceUpdate = price !== undefined ? { price: BigInt(price) } : {};
      const sqftUpdate = price !== undefined && area !== undefined ? { pricePerSqft: Math.round(price / area) } : {};

      // Coordinates live on the related Location row (created alongside every
      // property), so patch them via a nested update when supplied.
      const locationUpdate =
        latitude !== undefined || longitude !== undefined
          ? {
              location: {
                update: {
                  ...(latitude !== undefined && { latitude }),
                  ...(longitude !== undefined && { longitude }),
                },
              },
            }
          : {};

      const updated = await prisma.property.update({
        where: { id },
        data: { ...rest, ...priceUpdate, ...sqftUpdate, ...locationUpdate },
        include: propertyInclude,
      });

      // Only tell the owner about edits they made themselves — admin edits
      // shouldn't read as "you updated your listing".
      if (isOwner) {
        await notify({
          userId: property.ownerId,
          type: "listing_updated",
          title: "Listing updated",
          content: `Your changes to "${property.title}" were saved.`,
          actionUrl: `/properties/${property.slug}`,
        });
      }

      return serializeProperty(updated);
    }),

  // Owner submits edits to a LIVE listing. Changes are NOT applied immediately —
  // they're held as a PropertyEditRequest for admin review, so the listing keeps
  // showing its current data until approved. Only one pending request per
  // property: re-submitting supersedes any earlier pending edit.
  submitEdit: protectedProcedure
    .input(
      z.object({
        id: cuidSchema,
        title: safeString(200, 10).optional(),
        description: descriptionSchema.optional(),
        price: priceSchema.optional(),
        area: areaSchema.optional(),
        builtUpArea: areaSchema.optional(),
        bhk: safeString(20).optional(),
        bedrooms: roomCountSchema.optional(),
        bathrooms: roomCountSchema.optional(),
        balconies: roomCountSchema.optional(),
        parking: roomCountSchema.optional(),
        furnishing: furnishingSchema.optional(),
        facing: safeString(30).optional(),
        possession: safeString(30).optional(),
        rera: reraSchema.optional(),
        reraLabel: safeString(20).optional(),
        amenities: amenitiesSchema.optional(),
        images: safeUrlArraySchema.optional(),
        locality: geoTextSchema.optional(),
        latitude: latitudeSchema.optional(),
        longitude: longitudeSchema.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...changes } = input;

      const property = await prisma.property.findFirst({
        where: { id, deletedAt: null },
        include: { location: { select: { city: true } } },
      });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });
      if (property.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // Validate RERA against the listing's (unchangeable) city.
      if (changes.rera !== undefined) {
        assertReraValid(property.location?.city ?? "", changes.rera, changes.reraLabel ?? property.reraLabel ?? undefined);
      }

      // Drop keys the seller didn't actually touch so the review diff stays clean.
      const proposed = Object.fromEntries(
        Object.entries(changes).filter(([, v]) => v !== undefined),
      );
      if (Object.keys(proposed).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No changes to submit." });
      }

      // Supersede any earlier pending request for this property.
      await prisma.propertyEditRequest.deleteMany({ where: { propertyId: id, status: "Pending" } });
      await prisma.propertyEditRequest.create({
        data: { propertyId: id, ownerId: ctx.user.id, changes: proposed },
      });

      await notify({
        userId: ctx.user.id,
        type: "listing_edit_submitted",
        title: "Edit submitted for review",
        content: `Your changes to "${property.title}" are pending admin approval.`,
      });

      return { ok: true };
    }),

  // Soft-delete (owner or admin)
  delete: protectedProcedure
    .input(z.object({ id: cuidSchema }))
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
    .input(z.object({ id: cuidSchema, featured: z.boolean() }))
    .mutation(async ({ input }) => {
      const updated = await prisma.property.update({
        where: { id: input.id },
        data: { featured: input.featured },
      });
      return { id: updated.id, featured: updated.featured };
    }),

  // Unlock owner contact — costs 1 credit (credit gate)
  unlockContact: protectedProcedure
    .use(contactRateLimit)
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const property = await prisma.property.findFirst({
        where: { id: input.id, deletedAt: null },
        include: { owner: { select: { id: true, name: true, phone: true } } },
      });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

      // Atomic deduct: WHERE credits >= 1 prevents double-spend from concurrent requests
      const deducted = await prisma.user.updateMany({
        where: { id: ctx.user.id, credits: { gte: 1 } },
        data: { credits: { decrement: 1 } },
      });
      if (deducted.count === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Insufficient credits. Purchase a plan to unlock contacts.",
        });
      }

      await Promise.all([
        prisma.creditTransaction.create({
          data: { userId: ctx.user.id, type: "debit", amount: 1, reason: "contact_unlock", propertyId: input.id },
        }),
        prisma.property.update({ where: { id: input.id }, data: { contacts: { increment: 1 } } }),
      ]);
      await notifyCredit({ userId: ctx.user.id, type: "debit", amount: 1, reason: "contact_unlock" });

      return { phone: property.owner.phone, name: property.owner.name };
    }),
});
