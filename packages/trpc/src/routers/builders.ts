import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, publicProcedure, adminProcedure } from "../server";
import {
  safeString,
  searchSchema,
  geoTextSchema,
  pageSchema,
  limitSchema,
} from "../sanitize";

// The bulk-imported city field is inconsistent: some rows store "<City> <Locality>"
// (e.g. "Mumbai Ghatkopar", "Chennai Velachery" — city filter matches these fine),
// but most store the bare locality only (e.g. "Gachibowli", "Salt Lake", "Sector 93")
// with the real metro name living in `district` instead ("Hyderabad", "Kolkata",
// "Gautam Buddha Nagar" for Noida, "Gurugram" for Gurgaon, "Ernakulam" for Kochi).
// Map each public-facing city option to every district/city spelling it should
// match so the filter works uniformly instead of only for Mumbai.
const CITY_METRO_ALIASES: Record<string, string[]> = {
  Mumbai:      ["Mumbai", "Thane", "Raigad"],
  Bengaluru:   ["Bengaluru", "Bangalore"],
  "Delhi NCR": ["Delhi", "Gurugram", "Gurgaon", "Gautam Buddha Nagar", "Noida", "Ghaziabad", "Faridabad"],
  Hyderabad:   ["Hyderabad", "Rangareddy"],
  Pune:        ["Pune"],
  Chennai:     ["Chennai"],
  Kolkata:     ["Kolkata", "24 Parganas", "Howrah", "Hooghly"],
  Ahmedabad:   ["Ahmedabad"],
  Jaipur:      ["Jaipur"],
  Noida:       ["Noida", "Gautam Buddha Nagar"],
  Gurgaon:     ["Gurgaon", "Gurugram"],
  Kochi:       ["Kochi", "Ernakulam"],
};

// city OR district contains one of the city's known aliases.
function cityAliasWhere(city: string) {
  const terms = CITY_METRO_ALIASES[city] ?? [city];
  return {
    OR: terms.flatMap((t) => [
      { city: { contains: t, mode: "insensitive" as const } },
      { district: { contains: t, mode: "insensitive" as const } },
    ]),
  };
}

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
  developmentStatus: safeString(120).optional().default(""),
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
        page: pageSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { search, state, projectType, page, limit } = input;

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

      // Pool is max:1 (serverless) — run sequentially, not Promise.all, or the
      // second query waits on the connection and hits the connect timeout.
      const items = await prisma.builder.findMany({
        where,
        orderBy: [{ companyName: "asc" }, { id: "asc" }],
        take: limit,
        skip: (page - 1) * limit,
      });
      const total = await prisma.builder.count({ where });

      return { items, page, totalPages: Math.max(1, Math.ceil(total / limit)), total };
    }),

  stats: adminProcedure.query(async () => {
    const total = await prisma.builder.count();
    try {
      const byState = await prisma.builder.groupBy({
        by: ["state"],
        _count: { _all: true },
      });
      // All states with a real name, sorted by count desc. Null/blank states are
      // dropped so we don't surface an "—" KPI card.
      const sorted = byState
        .filter((s) => s.state && s.state.trim())
        .sort((a, b) => b._count._all - a._count._all);
      return {
        total,
        byState: sorted.map((s) => ({ state: s.state as string, count: s._count._all })),
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
        page:      pageSchema,
        limit:     limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { search, city, state, type, page, limit } = input;
      const where: NonNullable<Parameters<typeof prisma.builder.findMany>[0]>["where"] = {
        slug: { not: null },
      };
      // city and search both need their own OR-group, so accumulate them under
      // AND instead of assigning `where.OR` twice (the second would clobber the
      // first).
      const and: NonNullable<typeof where.AND> = [];
      if (city)  and.push(cityAliasWhere(city));
      if (state) where.state = { contains: state, mode: "insensitive" };
      // Category filter matches builders that have at least one project of that
      // type (the richer Project.type model, not the legacy builder.projectType).
      if (type)  where.projects = { some: { type: { equals: type } } };
      if (search) {
        and.push({
          OR: [
            { companyName: { contains: search, mode: "insensitive" } },
            { city:        { contains: search, mode: "insensitive" } },
            { state:       { contains: search, mode: "insensitive" } },
            { district:    { contains: search, mode: "insensitive" } },
            { projects: { some: { name: { contains: search, mode: "insensitive" } } } },
          ],
        });
      }
      if (and.length) where.AND = and;
      const items = await prisma.builder.findMany({
        where,
        include: { _count: { select: { projects: true } } },
        orderBy: [{ verified: "desc" }, { companyName: "asc" }, { id: "asc" }],
        take: limit,
        skip: (page - 1) * limit,
      });
      const total = await prisma.builder.count({ where });
      return { items, page, totalPages: Math.max(1, Math.ceil(total / limit)), total };
    }),

  publicGet: publicProcedure
    .input(z.object({ slug: safeString(300, 1) }))
    .query(async ({ input }) => {
      const builder = await prisma.builder.findUnique({
        where: { slug: input.slug },
        include: {
          projects: { orderBy: { status: "asc" } },
          _count: { select: { projects: true } },
        },
      });
      if (!builder) return null;
      // Project.priceMin/priceMax are BigInt — convert or JSON serialization throws.
      return {
        ...builder,
        projects: builder.projects.map((p) => ({
          ...p,
          priceMin: p.priceMin != null ? Number(p.priceMin) : null,
          priceMax: p.priceMax != null ? Number(p.priceMax) : null,
        })),
      };
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

  // Generates slugs for all builders that don't have one yet (bulk-imported records).
  // Processes up to `limit` per call so the caller can loop without HTTP timeouts.
  backfillSlugs: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(10000).default(5000) }).optional())
    .mutation(async ({ input }) => {
      const limit = input?.limit ?? 5000;

      const remaining = await prisma.builder.count({ where: { slug: null } });
      if (remaining === 0) return { updated: 0, remaining: 0 };

      // Fetch all existing slugs so we can avoid collisions.
      const existingSlugs = new Set(
        (await prisma.builder.findMany({ where: { slug: { not: null } }, select: { slug: true } }))
          .map((b) => b.slug!),
      );

      const builders = await prisma.builder.findMany({
        where: { slug: null },
        select: { id: true, companyName: true, city: true },
        take: limit,
        orderBy: { id: "asc" },
      });

      if (!builders.length) return { updated: 0, remaining: 0 };

      const updates: { id: string; slug: string }[] = [];
      for (const b of builders) {
        const base = makeSlug(b.companyName + (b.city ? `-${b.city}` : ""));
        let slug = base;
        let n = 2;
        while (existingSlugs.has(slug)) slug = `${base}-${n++}`;
        existingSlugs.add(slug);
        updates.push({ id: b.id, slug });
      }

      // One bulk UPDATE ... FROM (VALUES ...) per chunk — a single round-trip
      // instead of 500 individual UPDATEs. The old per-row $transaction blew the
      // 5s interactive-transaction cap over the VPS Postgres (pool max:1 + latency).
      // No transaction needed: each row's slug is independent.
      const CHUNK = 1000;
      for (let i = 0; i < updates.length; i += CHUNK) {
        const chunk = updates.slice(i, i + CHUNK);
        // Parameterised placeholders ($1,$2),($3,$4)... — cast the first row so
        // Postgres resolves the VALUES column types to text.
        const valuesSql = chunk
          .map((_, j) =>
            j === 0
              ? `($${j * 2 + 1}::text, $${j * 2 + 2}::text)`
              : `($${j * 2 + 1}, $${j * 2 + 2})`,
          )
          .join(", ");
        const params = chunk.flatMap(({ id, slug }) => [id, slug]);
        await prisma.$executeRawUnsafe(
          `UPDATE "Builder" AS b SET slug = v.slug FROM (VALUES ${valuesSql}) AS v(id, slug) WHERE b.id = v.id`,
          ...params,
        );
      }

      return { updated: builders.length, remaining: remaining - builders.length };
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
