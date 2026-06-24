import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, supervisorProcedure } from "../server.js";
import { cuidSchema, noteSchema } from "../sanitize.js";

const escalationLevelSchema = z.enum(["Low", "Medium", "High"]);

// Monthly closed-deal target per sales rep (matches the previous UI constant).
const MONTHLY_TARGET = 8;

export const supervisorRouter = router({
  // Per-rep performance derived from real Lead + Commission data.
  // "Closed" = a lead marked Converted; conversion = converted / assigned.
  performance: supervisorProcedure.query(async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    // Pull converted leads back far enough to cover both the MTD window and
    // the 4-week trend, whichever reaches further back.
    const windowStart = startOfMonth < fourWeeksAgo ? startOfMonth : fourWeeksAgo;

    const [reps, assignedCounts, convertedCounts, recentConverted] = await Promise.all([
      prisma.user.findMany({
        where: { role: "sales" },
        select: { id: true, name: true, city: true },
      }),
      prisma.lead.groupBy({
        by: ["assignedToId"],
        where: { assignedToId: { not: null } },
        _count: { _all: true },
      }),
      prisma.lead.groupBy({
        by: ["assignedToId"],
        where: { assignedToId: { not: null }, status: "Converted" },
        _count: { _all: true },
      }),
      prisma.lead.findMany({
        where: {
          assignedToId: { not: null },
          status: "Converted",
          updatedAt: { gte: windowStart },
        },
        select: { assignedToId: true, updatedAt: true },
      }),
    ]);

    const assignedByRep = new Map(assignedCounts.map((c) => [c.assignedToId, c._count._all]));
    const convertedByRep = new Map(convertedCounts.map((c) => [c.assignedToId, c._count._all]));

    // 4 buckets of 7 days each, oldest → newest.
    const weekBucket = (d: Date) => {
      const idx = Math.floor((d.getTime() - fourWeeksAgo.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return Math.min(3, Math.max(0, idx));
    };
    const trendByRep = new Map<string, number[]>();
    const mtdByRep = new Map<string, number>();
    for (const lead of recentConverted) {
      const repId = lead.assignedToId!;
      if (lead.updatedAt >= fourWeeksAgo) {
        const trend = trendByRep.get(repId) ?? [0, 0, 0, 0];
        trend[weekBucket(lead.updatedAt)] = (trend[weekBucket(lead.updatedAt)] ?? 0) + 1;
        trendByRep.set(repId, trend);
      }
      if (lead.updatedAt >= startOfMonth) {
        mtdByRep.set(repId, (mtdByRep.get(repId) ?? 0) + 1);
      }
    }

    return {
      monthlyTarget: MONTHLY_TARGET,
      reps: reps
        .map((r) => {
          const assigned = assignedByRep.get(r.id) ?? 0;
          const converted = convertedByRep.get(r.id) ?? 0;
          const closedMTD = mtdByRep.get(r.id) ?? 0;
          const conversion = assigned > 0 ? Math.round((converted / assigned) * 100) : 0;
          const achieved = Math.min(100, Math.round((closedMTD / MONTHLY_TARGET) * 100));
          return {
            id: r.id,
            name: r.name,
            city: r.city,
            closedMTD,
            conversion,
            achieved,
            weeklyTrend: trendByRep.get(r.id) ?? [0, 0, 0, 0],
          };
        })
        .sort((a, b) => b.closedMTD - a.closedMTD),
    };
  }),

  escalations: router({
    list: supervisorProcedure
      .input(z.object({ status: z.enum(["open", "resolved", "escalated"]).optional() }).optional())
      .query(async ({ input }) => {
        const items = await prisma.escalation.findMany({
          where: input?.status ? { status: input.status } : {},
          include: {
            lead: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

        const now = Date.now();
        return items.map((e) => ({
          id: e.id,
          leadId: e.leadId,
          leadName: e.lead?.name ?? "—",
          note: e.note,
          level: e.level,
          status: e.status,
          assignedTo: e.assignedTo?.name ?? "Unassigned",
          createdAt: e.createdAt.toISOString(),
          ageHours: Math.max(0, Math.round((now - e.createdAt.getTime()) / (60 * 60 * 1000))),
        }));
      }),

    create: supervisorProcedure
      .input(
        z.object({
          leadId: cuidSchema,
          note: noteSchema,
          level: escalationLevelSchema.default("Medium"),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const lead = await prisma.lead.findUnique({
          where: { id: input.leadId },
          select: { id: true, assignedToId: true },
        });
        if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

        return prisma.escalation.create({
          data: {
            leadId: lead.id,
            note: input.note,
            level: input.level,
            assignedToId: lead.assignedToId,
            raisedById: ctx.user.id,
          },
        });
      }),

    resolve: supervisorProcedure
      .input(z.object({ id: cuidSchema }))
      .mutation(async ({ input }) => {
        const escalation = await prisma.escalation.findUnique({ where: { id: input.id } });
        if (!escalation) throw new TRPCError({ code: "NOT_FOUND", message: "Escalation not found." });

        return prisma.escalation.update({
          where: { id: input.id },
          data: { status: "resolved", resolvedAt: new Date() },
        });
      }),

    escalateToAdmin: supervisorProcedure
      .input(z.object({ id: cuidSchema }))
      .mutation(async ({ input, ctx }) => {
        const escalation = await prisma.escalation.findUnique({ where: { id: input.id } });
        if (!escalation) throw new TRPCError({ code: "NOT_FOUND", message: "Escalation not found." });

        const [updated] = await Promise.all([
          prisma.escalation.update({
            where: { id: input.id },
            data: { status: "escalated" },
          }),
          prisma.auditLog.create({
            data: {
              userId: ctx.user.id,
              action: "escalation_to_admin",
              entity: "Escalation",
              entityId: input.id,
              changes: { leadId: escalation.leadId, level: escalation.level },
            },
          }),
        ]);
        return updated;
      }),
  }),
});
