import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, publicProcedure, adminProcedure } from "../server.js";
import { safeString, searchSchema, geoTextSchema, cursorSchema, limitSchema } from "../sanitize.js";

const PROJECT_TYPES = ["Apartment", "HighRise", "Villa", "Commercial", "Plot", "Studio", "PG", "Others"] as const;
const PROJECT_STATUSES = ["Ongoing", "Completed", "Upcoming"] as const;

export const projectsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        search:   searchSchema.optional(),
        city:     geoTextSchema.optional(),
        area:     safeString(120).optional(),
        type:     z.enum(PROJECT_TYPES).optional(),
        status:   z.enum(PROJECT_STATUSES).optional(),
        builderId: safeString(40).optional(),
        cursor:   cursorSchema,
        limit:    limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { search, city, area, type, status, builderId, cursor, limit } = input;
      const where: NonNullable<Parameters<typeof prisma.project.findMany>[0]>["where"] = {};
      if (city)      where.city      = { contains: city,  mode: "insensitive" };
      if (area)      where.area      = { contains: area,  mode: "insensitive" };
      if (type)      where.type      = type;
      if (status)    where.status    = status;
      if (builderId) where.builderId = builderId;
      if (search) {
        where.OR = [
          { name:            { contains: search, mode: "insensitive" } },
          { city:            { contains: search, mode: "insensitive" } },
          { area:            { contains: search, mode: "insensitive" } },
          { description:     { contains: search, mode: "insensitive" } },
          { builder: { companyName: { contains: search, mode: "insensitive" } } },
        ];
      }
      const [items, total] = await Promise.all([
        prisma.project.findMany({
          where,
          include: { builder: { select: { id: true, companyName: true, slug: true, verified: true } } },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
        prisma.project.count({ where }),
      ]);
      const hasMore = items.length > limit;
      const page   = hasMore ? items.slice(0, limit) : items;
      return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore, total };
    }),

  get: publicProcedure
    .input(z.object({ slug: safeString(300, 1) }))
    .query(async ({ input }) => {
      const project = await prisma.project.findUnique({
        where: { slug: input.slug },
        include: { builder: true },
      });
      return project;
    }),

  upsert: adminProcedure
    .input(
      z.object({
        id:            safeString(40).optional(),
        builderId:     safeString(40, 1),
        name:          safeString(200, 1),
        city:          safeString(120, 1),
        area:          safeString(120).optional().default(""),
        type:          z.enum(PROJECT_TYPES).default("Apartment"),
        status:        z.enum(PROJECT_STATUSES).default("Ongoing"),
        reraNo:        safeString(100).optional().default(""),
        priceMin:      z.number().int().positive().optional(),
        priceMax:      z.number().int().positive().optional(),
        sftMin:        z.number().int().positive().optional(),
        sftMax:        z.number().int().positive().optional(),
        totalUnits:    z.number().int().positive().optional(),
        description:   safeString(5000).optional().default(""),
        amenities:     z.array(safeString(100)).optional().default([]),
        images:        z.array(safeString(500)).optional().default([]),
        launchDate:    z.string().optional(),
        possessionDate:z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const slug = input.id
        ? undefined
        : makeSlug(`${input.name}-${input.city}`);
      const data = {
        builderId:      input.builderId,
        name:           input.name,
        city:           input.city,
        area:           input.area || null,
        type:           input.type,
        status:         input.status,
        reraNo:         input.reraNo || null,
        priceMin:       input.priceMin ? BigInt(input.priceMin) : null,
        priceMax:       input.priceMax ? BigInt(input.priceMax) : null,
        sftMin:         input.sftMin   ?? null,
        sftMax:         input.sftMax   ?? null,
        totalUnits:     input.totalUnits ?? null,
        description:    input.description || null,
        amenities:      input.amenities,
        images:         input.images,
        launchDate:     input.launchDate    ? new Date(input.launchDate)     : null,
        possessionDate: input.possessionDate ? new Date(input.possessionDate) : null,
      };
      if (input.id) {
        return prisma.project.update({ where: { id: input.id }, data });
      }
      return prisma.project.create({ data: { ...data, slug: slug! } });
    }),

  delete: adminProcedure
    .input(z.object({ id: safeString(40, 1) }))
    .mutation(async ({ input }) => {
      await prisma.project.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});

function makeSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}
