import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, publicProcedure, adminProcedure } from "../server.js";
import {
  safeString,
  searchSchema,
  geoTextSchema,
  cursorSchema,
  limitSchema,
} from "../sanitize.js";

function makeSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// One row of the bulk-upload sheet. Only the company name is required.
const builderRow = z.object({
  companyName: safeString(200, 1),
  ownerName: safeString(200).optional().default(""),
  mobile: safeString(40).optional().default(""),
  projectType: safeString(120).optional().default(""),
  state: safeString(120).optional().default(""),
  district: safeString(120).optional().default(""),
  city: safeString(120).optional().default(""),
});

export const buildersRouter = router({
  list: adminProcedure
    .input(
      z.object({
        search: searchSchema.optional(),
        state: geoTextSchema.optional(),
        projectType: safeString(120).optional(),
        cursor: cursorSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { search, state, projectType, cursor, limit } = input;

      const where: NonNullable<Parameters<typeof prisma.builder.findMany>[0]>["where"] = {};
      if (state) where.state = state;
      if (projectType) where.projectType = projectType;
      if (search) {
        where.OR = [
          { companyName: { contains: search, mode: "insensitive" } },
          { ownerName: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } },
          { district: { contains: search, mode: "insensitive" } },
          { mobile: { contains: search } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.builder.findMany({
          where,
          orderBy: { companyName: "asc" },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
        prisma.builder.count({ where }),
      ]);

      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;
      return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore, total };
    }),

  stats: adminProcedure.query(async () => {
    const total = await prisma.builder.count();
    try {
      const byState = await prisma.builder.groupBy({
        by: ["state"],
        _count: { _all: true },
      });
      const sorted = byState
        .sort((a, b) => b._count._all - a._count._all)
        .slice(0, 6);
      return {
        total,
        byState: sorted.map((s) => ({ state: s.state ?? "—", count: s._count._all })),
      };
    } catch (err) {
      console.error("[builders.stats] groupBy failed:", err);
      return { total, byState: [] };
    }
  }),

  // Bulk import parsed rows (from an uploaded Excel/CSV). Idempotent via the
  // [companyName, mobile, city] unique constraint + skipDuplicates.
  bulkImport: adminProcedure
    .input(z.object({ rows: z.array(builderRow).min(1).max(20000) }))
    .mutation(async ({ input }) => {
      const CHUNK = 1000;
      let inserted = 0;
      for (let i = 0; i < input.rows.length; i += CHUNK) {
        const res = await prisma.builder.createMany({
          data: input.rows.slice(i, i + CHUNK),
          skipDuplicates: true,
        });
        inserted += res.count;
      }
      return { received: input.rows.length, inserted, skipped: input.rows.length - inserted };
    }),

  // ── Public directory procedures ────────────────────────────────────────────

  publicList: publicProcedure
    .input(
      z.object({
        search:    searchSchema.optional(),
        city:      geoTextSchema.optional(),
        state:     geoTextSchema.optional(),
        type:      safeString(120).optional(),
        cursor:    cursorSchema,
        limit:     limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { search, city, state, type, cursor, limit } = input;
      const where: NonNullable<Parameters<typeof prisma.builder.findMany>[0]>["where"] = {
        slug: { not: null },
      };
      if (city)  where.city  = { contains: city,  mode: "insensitive" };
      if (state) where.state = { contains: state, mode: "insensitive" };
      // Category filter matches builders that have at least one project of that
      // type (the richer Project.type model, not the legacy builder.projectType).
      if (type)  where.projects = { some: { type: { equals: type } } };
      if (search) {
        where.OR = [
          { companyName: { contains: search, mode: "insensitive" } },
          { city:        { contains: search, mode: "insensitive" } },
          { state:       { contains: search, mode: "insensitive" } },
          { district:    { contains: search, mode: "insensitive" } },
          { projects: { some: { name: { contains: search, mode: "insensitive" } } } },
        ];
      }
      const [items, total] = await Promise.all([
        prisma.builder.findMany({
          where,
          include: { _count: { select: { projects: true } } },
          orderBy: [{ verified: "desc" }, { companyName: "asc" }],
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
        prisma.builder.count({ where }),
      ]);
      const hasMore = items.length > limit;
      const page   = hasMore ? items.slice(0, limit) : items;
      return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore, total };
    }),

  publicGet: publicProcedure
    .input(z.object({ slug: safeString(300, 1) }))
    .query(async ({ input }) => {
      return prisma.builder.findUnique({
        where: { slug: input.slug },
        include: {
          projects: { orderBy: { status: "asc" } },
          _count: { select: { projects: true } },
        },
      });
    }),

  // Project search for the listing wizard — owner/builder picks their project and
  // the form is pre-filled with these defaults (then edited + own details added).
  projectSearch: publicProcedure
    .input(
      z.object({
        search: searchSchema.optional(),
        city:   geoTextSchema.optional(),
        type:   safeString(80).optional(),
        limit:  z.number().int().min(1).max(20).default(10),
      }),
    )
    .query(async ({ input }) => {
      const where: NonNullable<Parameters<typeof prisma.project.findMany>[0]>["where"] = {};
      if (input.city) where.city = { contains: input.city, mode: "insensitive" };
      if (input.type) where.type = input.type;
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { area: { contains: input.search, mode: "insensitive" } },
          { builder: { companyName: { contains: input.search, mode: "insensitive" } } },
        ];
      }
      const projects = await prisma.project.findMany({
        where,
        include: { builder: { select: { companyName: true, verified: true } } },
        orderBy: { name: "asc" },
        take: input.limit,
      });
      return projects.map((p) => ({
        id:          p.id,
        name:        p.name,
        builderName: p.builder.companyName,
        verified:    p.builder.verified,
        city:        p.city,
        area:        p.area ?? "",
        type:        p.type,
        status:      p.status,
        priceMin:    p.priceMin != null ? Number(p.priceMin) : null,
        priceMax:    p.priceMax != null ? Number(p.priceMax) : null,
        sftMin:      p.sftMin ?? null,
        sftMax:      p.sftMax ?? null,
        description: p.description ?? "",
        amenities:   p.amenities,
        reraNo:      p.reraNo ?? "",
      }));
    }),

  // ── XML import ─────────────────────────────────────────────────────────────
  // Accepts parsed XML rows (builders with nested projects). Upserts by slug.
  // The SA portal parses the XML client-side and sends structured JSON here.

  xmlImport: adminProcedure
    .input(
      z.object({
        builders: z.array(
          z.object({
            companyName: safeString(200, 1),
            ownerName:   safeString(200).optional().default(""),
            mobile:      safeString(40).optional().default(""),
            state:       safeString(120).optional().default(""),
            district:    safeString(120).optional().default(""),
            city:        safeString(120).optional().default(""),
            reraNo:      safeString(100).optional().default(""),
            established: z.number().int().min(1800).max(2030).optional(),
            website:     safeString(300).optional().default(""),
            description: safeString(5000).optional().default(""),
            projects: z.array(
              z.object({
                name:        safeString(200, 1),
                city:        safeString(120, 1),
                area:        safeString(120).optional().default(""),
                type:        safeString(80).optional().default("Apartment"),
                status:      safeString(40).optional().default("Ongoing"),
                reraNo:      safeString(100).optional().default(""),
                priceMin:    z.number().int().optional(),
                priceMax:    z.number().int().optional(),
                sftMin:      z.number().int().optional(),
                sftMax:      z.number().int().optional(),
                totalUnits:  z.number().int().optional(),
                description: safeString(5000).optional().default(""),
                amenities:   safeString(2000).optional().default(""),
              }),
            ).optional().default([]),
          }),
        ).min(1).max(5000),
      }),
    )
    .mutation(async ({ input }) => {
      let buildersInserted = 0, buildersUpdated = 0, projectsUpserted = 0;

      for (const b of input.builders) {
        const slug = makeSlug(b.companyName + (b.city ? `-${b.city}` : ""));
        const builderData = {
          ownerName:   b.ownerName   || null,
          mobile:      b.mobile      || null,
          state:       b.state       || null,
          district:    b.district    || null,
          city:        b.city        || null,
          slug,
          reraNo:      b.reraNo      || null,
          established: b.established ?? null,
          website:     b.website     || null,
          description: b.description || null,
        };

        let builder;
        const existing = await prisma.builder.findFirst({
          where: {
            OR: [
              { slug },
              { companyName: b.companyName, city: b.city || null },
            ],
          },
        });

        if (existing) {
          builder = await prisma.builder.update({ where: { id: existing.id }, data: builderData });
          buildersUpdated++;
        } else {
          builder = await prisma.builder.create({ data: { companyName: b.companyName, ...builderData } });
          buildersInserted++;
        }

        for (const p of b.projects) {
          const projectSlug = makeSlug(`${p.name}-${p.city}`);
          const projectData = {
            builderId:   builder.id,
            name:        p.name,
            city:        p.city,
            area:        p.area        || null,
            type:        p.type        || "Apartment",
            status:      p.status      || "Ongoing",
            reraNo:      p.reraNo      || null,
            priceMin:    p.priceMin    ? BigInt(p.priceMin) : null,
            priceMax:    p.priceMax    ? BigInt(p.priceMax) : null,
            sftMin:      p.sftMin      ?? null,
            sftMax:      p.sftMax      ?? null,
            totalUnits:  p.totalUnits  ?? null,
            description: p.description || null,
            amenities:   p.amenities ? p.amenities.split(",").map((a) => a.trim()).filter(Boolean) : [],
          };
          await prisma.project.upsert({
            where:  { slug: projectSlug },
            create: { ...projectData, slug: projectSlug },
            update: projectData,
          });
          projectsUpserted++;
        }
      }

      return { buildersInserted, buildersUpdated, projectsUpserted };
    }),
});
