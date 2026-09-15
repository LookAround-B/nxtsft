import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, supervisorProcedure } from "../server";
import { cuidSchema, noteSchema } from "../sanitize";
import { leadScope, teamRepIds, seesAllTeams } from "../teamScope";

const escalationLevelSchema = z.enum(["Low", "Medium", "High"]);

/** Escalations a supervisor may see/act on: their reps' + the ones they raised. */
const escalationScope = (userId: string, repIds: string[]) => ({
  OR: [{ assignedToId: { in: repIds } }, { raisedById: userId }],
});

/** Load an escalation and assert this supervisor owns it. */
async function ownedEscalation(ctx: { user: { id: string; role: string } }, id: string) {
  const escalation = await prisma.escalation.findUnique({ where: { id } });
  if (!escalation) throw new TRPCError({ code: "NOT_FOUND", message: "Escalation not found." });
  if (seesAllTeams(ctx.user.role)) return escalation;
  const repIds = await teamRepIds(ctx);
  const mine =
    escalation.raisedById === ctx.user.id ||
    (escalation.assignedToId != null && repIds.includes(escalation.assignedToId));
  if (!mine) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This escalation belongs to another team." });
  }
  return escalation;
}

// Monthly closed-deal target per sales rep (matches the previous UI constant).
const MONTHLY_TARGET = 8;

export const supervisorRouter = router({
  // Live sidebar badge counts — one number per "needs action" queue.
  badgeCounts: supervisorProcedure.query(async ({ ctx }) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const scope = await leadScope(ctx);
    const repIds = await teamRepIds(ctx);
    const all = seesAllTeams(ctx.user.role);
    const [hotLeads, unassigned, escalations, visitsToday] = await Promise.all([
      prisma.lead.count({ where: { ...scope, status: "Hot" } }),
      // "Unassigned" for a supervisor = routed to them but not yet with a rep.
      prisma.lead.count({
        where: all
          ? { assignedToId: null, status: { notIn: ["Converted", "Lost"] } }
          : { supervisorId: ctx.user.id, assignedToId: null, status: { notIn: ["Converted", "Lost"] } },
      }),
      prisma.escalation.count({
        where: all ? { status: "open" } : { status: "open", ...escalationScope(ctx.user.id, repIds) },
      }),
      prisma.siteVisit.count({
        where: {
          ...(all ? {} : { salesRepId: { in: repIds } }),
          status: "Scheduled",
          scheduledAt: { gte: startOfDay, lt: endOfDay },
        },
      }),
    ]);
    return { hotLeads, unassigned, escalations, visitsToday };
  }),

  // Reps this supervisor may assign work to (super-admin sees every rep).
  // Drives the Reassign dropdown in Team Leads.
  myReps: supervisorProcedure.query(({ ctx }) =>
    prisma.user.findMany({
      where: seesAllTeams(ctx.user.role)
        ? { role: "sales", active: true }
        : { role: "sales", active: true, supervisorId: ctx.user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ),

  // My team at a glance: rep names + their live lead counts.
  // Drives the "My Team" list on the supervisor dashboard.
  teamOverview: supervisorProcedure.query(async ({ ctx }) => {
    const reps = await prisma.user.findMany({
      where: seesAllTeams(ctx.user.role)
        ? { role: "sales", active: true }
        : { role: "sales", active: true, supervisorId: ctx.user.id },
      select: { id: true, name: true, city: true, phone: true },
      orderBy: { name: "asc" },
    });
    if (reps.length === 0) return [];

    const repIds = reps.map((r) => r.id);
    const byStatus = await prisma.lead.groupBy({
      by: ["assignedToId", "status"],
      where: { assignedToId: { in: repIds } },
      _count: { _all: true },
    });

    const counts = new Map<string, { open: number; hot: number; converted: number }>();
    for (const row of byStatus) {
      const repId = row.assignedToId!;
      const c = counts.get(repId) ?? { open: 0, hot: 0, converted: 0 };
      const n = row._count._all;
      if (row.status === "Converted") c.converted += n;
      else if (row.status !== "Lost") c.open += n;
      if (row.status === "Hot") c.hot += n;
      counts.set(repId, c);
    }

    return reps.map((r) => ({
      ...r,
      ...(counts.get(r.id) ?? { open: 0, hot: 0, converted: 0 }),
    }));
  }),

  // Per-rep performance derived from real Lead + Commission data.
  // "Closed" = a lead marked Converted; conversion = converted / assigned.
  performance: supervisorProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    // Pull converted leads back far enough to cover both the MTD window and
    // the 4-week trend, whichever reaches further back.
    const windowStart = startOfMonth < fourWeeksAgo ? startOfMonth : fourWeeksAgo;

    const [reps, assignedCounts, convertedCounts, recentConverted] = await Promise.all([
      prisma.user.findMany({
        where: seesAllTeams(ctx.user.role)
          ? { role: "sales" }
          : { role: "sales", supervisorId: ctx.user.id },
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
      .query(async ({ input, ctx }) => {
        const items = await prisma.escalation.findMany({
          where: {
            ...(input?.status ? { status: input.status } : {}),
            // Supervisors only see escalations sitting with their own reps
            // (plus any they raised themselves on a still-unassigned lead).
            ...(seesAllTeams(ctx.user.role)
              ? {}
              : escalationScope(ctx.user.id, await teamRepIds(ctx))),
          },
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
        const lead = await prisma.lead.findFirst({
          where: { id: input.leadId, ...(await leadScope(ctx)) },
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
      .mutation(async ({ input, ctx }) => {
        await ownedEscalation(ctx, input.id);

        return prisma.escalation.update({
          where: { id: input.id },
          data: { status: "resolved", resolvedAt: new Date() },
        });
      }),

    escalateToAdmin: supervisorProcedure
      .input(z.object({ id: cuidSchema }))
      .mutation(async ({ input, ctx }) => {
        const escalation = await ownedEscalation(ctx, input.id);

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
