import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, adminProcedure } from "../server.js";

// One row of the bulk-upload sheet. Only the company name is required.
const builderRow = z.object({
  companyName: z.string().trim().min(1).max(200),
  ownerName: z.string().trim().max(200).optional().default(""),
  mobile: z.string().trim().max(40).optional().default(""),
  projectType: z.string().trim().max(120).optional().default(""),
  state: z.string().trim().max(120).optional().default(""),
  district: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
});

export const buildersRouter = router({
  list: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        state: z.string().optional(),
        projectType: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
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
    const [total, byState] = await Promise.all([
      prisma.builder.count(),
      prisma.builder.groupBy({
        by: ["state"],
        _count: { _all: true },
        orderBy: { _count: { state: "desc" } },
        take: 6,
      }),
    ]);
    return {
      total,
      byState: byState.map((s) => ({ state: s.state ?? "—", count: s._count._all })),
    };
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
});
