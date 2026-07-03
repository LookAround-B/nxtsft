import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, staffProcedure } from "../server";
import { deriveTicketRow } from "./tickets";

type ReportCategory = "Buyer" | "Seller" | "Agent" | "Owner" | "Tenant";

function roleToCategory(role: string, interest?: string | null): ReportCategory {
  if (role === "sales") return "Agent";
  if (role === "home-seller") return "Owner";
  const i = (interest ?? "").toLowerCase();
  if (i.includes("rent") || i.includes("lease") || i.includes("tenant") || i.includes("pg")) {
    return "Tenant";
  }
  return "Buyer";
}

function roleToJobCategory(role: string): string {
  switch (role) {
    case "super-admin": return "Super Admin";
    case "admin": return "Admin";
    case "supervisor": return "Supervisor";
    case "sales": return "Sales Rep";
    case "user": return "Customer";
    case "home-seller": return "Agent";
    default: return "—";
  }
}

// Latest comment = the most recent appended line of a lead's notes string.
// Mirrors latestNote() in the sales-portal shared client helper; kept here so
// reports surface the same comment the rep sees on the lead/caller.
function latestNote(notes?: string | null): string {
  if (!notes?.trim()) return "—";
  const lines = notes.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.at(-1) ?? "—";
}

function subStatusToPayStatus(status: string): "Paid" | "Unpaid" | "Follow-up" | "Not Interested" {
  if (status === "Active") return "Paid";
  if (status === "Cancelled") return "Not Interested";
  return "Unpaid";
}

function shapeTicket(
  t: Parameters<typeof deriveTicketRow>[0],
  assignedMap: Record<string, string>,
) {
  const row = deriveTicketRow(t, assignedMap);
  return { ...row, id: row.id.slice(-6).toUpperCase() };
}

export const reportsRouter = router({
  snapshot: staffProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input, ctx }) => {
      const from = new Date(input.from + "T00:00:00.000Z");
      const to = new Date(input.to + "T23:59:59.999Z");

      const isSales = ctx.user.role === "sales";
      let repBuyerIds: string[] | null = null;
      if (isSales) {
        const repLeads = await prisma.lead.findMany({
          where: { assignedToId: ctx.user.id },
          select: { userId: true },
        });
        repBuyerIds = [...new Set(repLeads.map((l) => l.userId).filter(Boolean))];
      }

      // ── Core data — run in parallel ──────────────────────────
      const [dbUsers, dbSubs, dbVisitsRaw, dbLeadsAll, dbCommissions, dbCampaigns] =
        await Promise.all([
          prisma.user.findMany({
            where: {
              joined: { gte: from, lte: to },
              role: { in: ["user", "home-seller"] },
              ...(repBuyerIds ? { id: { in: repBuyerIds } } : {}),
            },
            select: {
              id: true, name: true, email: true, phone: true,
              role: true, city: true, state: true, verified: true, joined: true,
            },
            orderBy: { joined: "desc" },
            take: 500,
          }),

          prisma.subscription.findMany({
            where: {
              createdAt: { gte: from, lte: to },
              ...(repBuyerIds ? { userId: { in: repBuyerIds } } : {}),
            },
            include: {
              user: { select: { name: true, city: true, state: true, role: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 500,
          }),

          prisma.siteVisit.findMany({
            where: {
              scheduledAt: { gte: from, lte: to },
              ...(isSales ? { salesRepId: ctx.user.id } : {}),
            },
            orderBy: { scheduledAt: "desc" },
            take: 500,
          }),

          // All leads in period — for funnel + staff performance
          prisma.lead.findMany({
            where: {
              createdAt: { gte: from, lte: to },
              ...(isSales ? { assignedToId: ctx.user.id } : {}),
            },
            select: {
              id: true, assignedToId: true, status: true,
              userId: true, value: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1000,
          }),

          // Commissions in period
          prisma.commission.findMany({
            where: {
              createdAt: { gte: from, lte: to },
              ...(isSales ? { salesRepId: ctx.user.id } : {}),
            },
            include: {
              salesRep: { select: { id: true, name: true, supervisorId: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 500,
          }),

          // Campaigns — admin-level only
          isSales
            ? Promise.resolve([] as Awaited<ReturnType<typeof prisma.campaign.findMany>>)
            : prisma.campaign.findMany({
                where: { createdAt: { gte: from, lte: to } },
                orderBy: { createdAt: "desc" },
                take: 100,
              }),
        ]);

      // ── Staff lookup (sales + supervisors with role) ─────────
      const staff = await prisma.user.findMany({
        where: { role: { in: ["sales", "supervisor"] } },
        select: { id: true, name: true, supervisorId: true, role: true },
      });
      const staffById = new Map(staff.map((s) => [s.id, s]));
      const repName = (id?: string | null) => (id ? staffById.get(id)?.name ?? "—" : "—");
      const supName = (repId?: string | null) => {
        const rep = repId ? staffById.get(repId) : null;
        return rep?.supervisorId ? staffById.get(rep.supervisorId)?.name ?? "—" : "—";
      };

      // ── Attribution: user → most-recent lead → rep, builder ──
      const reportUserIds = [
        ...new Set([...dbUsers.map((u) => u.id), ...dbSubs.map((s) => s.userId)]),
      ];
      const userLeads = reportUserIds.length
        ? await prisma.lead.findMany({
            where: { userId: { in: reportUserIds } },
            select: { userId: true, assignedToId: true, interest: true, propertyId: true, notes: true },
            orderBy: { createdAt: "desc" },
          })
        : [];
      const leadByUser = new Map<string, (typeof userLeads)[number]>();
      for (const l of userLeads) {
        if (l.userId && !leadByUser.has(l.userId)) leadByUser.set(l.userId, l);
      }

      const leadPropIds = [
        ...new Set(
          [...leadByUser.values()].map((l) => l.propertyId).filter((id): id is string => !!id),
        ),
      ];
      const leadProps = leadPropIds.length
        ? await prisma.property.findMany({
            where: { id: { in: leadPropIds } },
            select: { id: true, builder: true },
          })
        : [];
      const builderByProp = new Map(leadProps.map((p) => [p.id, p.builder ?? "—"]));

      const attrFor = (userId: string, role: string) => {
        const lead = leadByUser.get(userId);
        const builder = lead?.propertyId ? builderByProp.get(lead.propertyId) ?? "—" : "—";
        return {
          category: roleToCategory(role, lead?.interest),
          builder,
          supervisor: supName(lead?.assignedToId),
          salesStaff: repName(lead?.assignedToId),
          latestComment: latestNote(lead?.notes),
        };
      };

      // ── Shape users ───────────────────────────────────────────
      const users = dbUsers.map((u) => {
        const a = attrFor(u.id, u.role);
        return {
          id: u.id.slice(-6).toUpperCase(),
          name: u.name,
          email: u.email,
          phone: u.phone ?? "—",
          category: a.category,
          jobCategory: roleToJobCategory(u.role),
          city: u.city,
          state: u.state ?? "—",
          builder: a.builder,
          supervisor: a.supervisor,
          salesStaff: a.salesStaff,
          latestComment: a.latestComment,
          registeredOn: u.joined.toISOString().slice(0, 10),
          status: (u.verified ? "Active" : "Inactive") as "Active" | "Inactive",
        };
      });

      // ── Shape subscriptions ───────────────────────────────────
      const seenUsers: Record<string, number> = {};
      const subscriptions = dbSubs.map((s) => {
        seenUsers[s.userId] = (seenUsers[s.userId] ?? 0) + 1;
        const a = attrFor(s.userId, s.user.role);
        return {
          id: s.id.slice(-6).toUpperCase(),
          userId: s.userId,
          userName: s.user.name,
          plan: s.planName,
          amount: Math.round(Number(s.amount) / 100),
          category: a.category,
          city: s.user.city,
          state: s.user.state ?? "—",
          builder: a.builder,
          supervisor: a.supervisor,
          salesStaff: a.salesStaff,
          latestComment: a.latestComment,
          type: ((seenUsers[s.userId] ?? 0) > 1 ? "Renewal" : "Fresh") as "Fresh" | "Renewal",
          status: subStatusToPayStatus(s.status),
          subscribedOn: s.createdAt.toISOString().slice(0, 10),
          dueDate: s.endDate.toISOString().slice(0, 10),
        };
      });

      // ── Revenue summary ───────────────────────────────────────
      const paidSubs = subscriptions.filter((s) => s.status === "Paid");
      const totalRevenue = paidSubs.reduce((a, s) => a + s.amount, 0);
      const freshRevenue = paidSubs.filter((s) => s.type === "Fresh").reduce((a, s) => a + s.amount, 0);
      const renewalRevenue = paidSubs.filter((s) => s.type === "Renewal").reduce((a, s) => a + s.amount, 0);
      const pendingRevenue = subscriptions.filter((s) => s.status !== "Paid").reduce((a, s) => a + s.amount, 0);
      const byPlanMap: Record<string, { count: number; total: number }> = {};
      for (const s of paidSubs) {
        byPlanMap[s.plan] = byPlanMap[s.plan] ?? { count: 0, total: 0 };
        byPlanMap[s.plan]!.count++;
        byPlanMap[s.plan]!.total += s.amount;
      }
      const revSummary = {
        totalRevenue,
        freshRevenue,
        renewalRevenue,
        pendingRevenue,
        avgDeal: paidSubs.length > 0 ? Math.round(totalRevenue / paidSubs.length) : 0,
        byPlan: Object.entries(byPlanMap).map(([plan, v]) => ({
          plan,
          count: v.count,
          total: v.total,
        })),
      };

      // ── Leads funnel ──────────────────────────────────────────
      const FUNNEL_STAGES = ["New", "Hot", "Warm", "Cold", "Converted", "Lost"] as const;
      const leadsFunnel = FUNNEL_STAGES.map((status) => ({
        status,
        count: dbLeadsAll.filter((l) => l.status === status).length,
      }));

      // ── Site visits shape ─────────────────────────────────────
      const propertyIds = [...new Set(dbVisitsRaw.map((v) => v.propertyId))];
      const buyerIds = [...new Set(dbVisitsRaw.map((v) => v.userId))];
      const repIds = [...new Set(dbVisitsRaw.map((v) => v.salesRepId).filter(Boolean))] as string[];

      const [properties, buyers, repsArr] = await Promise.all([
        propertyIds.length
          ? prisma.property.findMany({
              where: { id: { in: propertyIds } },
              select: { id: true, title: true, builder: true, location: { select: { city: true } } },
            })
          : Promise.resolve([]),
        buyerIds.length
          ? prisma.user.findMany({ where: { id: { in: buyerIds } }, select: { id: true, name: true } })
          : Promise.resolve([]),
        repIds.length
          ? prisma.user.findMany({ where: { id: { in: repIds } }, select: { id: true, name: true } })
          : Promise.resolve([]),
      ]);

      const propMap = Object.fromEntries(properties.map((p) => [p.id, p]));
      const buyerMap = Object.fromEntries(buyers.map((u) => [u.id, u]));
      const repMap = Object.fromEntries(repsArr.map((u) => [u.id, u]));

      // Latest comment per visit buyer, from their most recent lead. Visit
      // buyers aren't necessarily in leadByUser (built from users/subs), so
      // resolve notes for them directly.
      const visitLeads = buyerIds.length
        ? await prisma.lead.findMany({
            where: { userId: { in: buyerIds } },
            select: { userId: true, notes: true },
            orderBy: { createdAt: "desc" },
          })
        : [];
      const commentByBuyer = new Map<string, string>();
      for (const l of visitLeads) {
        if (l.userId && !commentByBuyer.has(l.userId)) {
          commentByBuyer.set(l.userId, latestNote(l.notes));
        }
      }

      const siteVisits = dbVisitsRaw.map((v) => {
        const prop = propMap[v.propertyId];
        const buyer = buyerMap[v.userId];
        const rep = v.salesRepId ? repMap[v.salesRepId] : null;
        return {
          id: v.id.slice(-6).toUpperCase(),
          leadName: buyer?.name ?? "—",
          property: prop?.title ?? "—",
          city: prop?.location?.city ?? "—",
          state: "—",
          category: "—",
          builder: prop?.builder ?? "—",
          supervisor: supName(v.salesRepId),
          salesStaff: rep?.name ?? "—",
          latestComment: commentByBuyer.get(v.userId) ?? "—",
          scheduledOn: v.scheduledAt.toISOString().slice(0, 10),
          status: v.status as "Scheduled" | "Completed" | "Cancelled" | "Rescheduled",
        };
      });

      // ── Staff performance (one row per sales rep) ─────────────
      const salesReps = staff.filter((s) => s.role === "sales");
      const staffPerf = salesReps.map((rep) => {
        const repLeads = dbLeadsAll.filter((l) => l.assignedToId === rep.id);
        const repVisits = dbVisitsRaw.filter((v) => v.salesRepId === rep.id);
        const repSubs = subscriptions.filter((s) => s.salesStaff === rep.name && s.status === "Paid");
        const repComms = dbCommissions.filter((c) => c.salesRepId === rep.id);
        const converted = repLeads.filter((l) => l.status === "Converted").length;
        return {
          repId: rep.id,
          repName: rep.name,
          supervisor: rep.supervisorId ? staffById.get(rep.supervisorId)?.name ?? "—" : "—",
          leadsTotal: repLeads.length,
          leadsConverted: converted,
          conversionRate: repLeads.length > 0 ? Math.round((converted / repLeads.length) * 100) : 0,
          siteVisitsTotal: repVisits.length,
          siteVisitsCompleted: repVisits.filter((v) => v.status === "Completed").length,
          subsCount: repSubs.length,
          subsRevenue: repSubs.reduce((a, s) => a + s.amount, 0),
          commissionsTotal: repComms.reduce((a, c) => a + Math.round(Number(c.amount) / 100), 0),
          commissionsPaid: repComms
            .filter((c) => c.status === "cleared")
            .reduce((a, c) => a + Math.round(Number(c.amount) / 100), 0),
        };
      });

      // ── Shape commissions ─────────────────────────────────────
      const commissions = dbCommissions.map((c) => ({
        id: c.id.slice(-6).toUpperCase(),
        repName: c.salesRep.name,
        supervisor: c.salesRep.supervisorId
          ? staffById.get(c.salesRep.supervisorId)?.name ?? "—"
          : "—",
        dealValue: Math.round(Number(c.dealValue) / 100),
        amount: Math.round(Number(c.amount) / 100),
        status: c.status as "pending" | "cleared",
        period: c.periodMonth ?? "—",
        note: c.note ?? "—",
        createdAt: c.createdAt.toISOString().slice(0, 10),
      }));

      // ── Shape campaigns ───────────────────────────────────────
      const campaigns = dbCampaigns.map((c) => ({
        // Last 6 chars, not first 6: cuids (and the seed ids like "seed-camp-01")
        // share a common prefix, so slice(0,6) collapses distinct campaigns to the
        // same code and collides the React key downstream.
        id: c.id.slice(-6).toUpperCase(),
        name: c.name,
        type: c.type,
        audience: c.audience,
        status: c.status,
        budget: c.budget ?? 0,
        leads: c.leads,
        clicks: c.clicks,
        scheduledAt: c.scheduledAt?.toISOString().slice(0, 10) ?? "—",
        createdAt: c.createdAt.toISOString().slice(0, 10),
      }));

      // ── Agent regs + tickets (non-sales staff only) ───────────
      type AgentReg = {
        id: string; name: string; email: string; city: string; state: string;
        rera: string; supervisor: string; registeredOn: string;
        latestComment: string;
        status: "Active" | "Pending" | "Rejected";
      };
      let agentRegs: AgentReg[] = [];
      let tickets: (ReturnType<typeof shapeTicket> & { latestComment: string })[] = [];

      if (!isSales) {
        const dbAgents = await prisma.user.findMany({
          where: {
            joined: { gte: from, lte: to },
            role: "sales",
          },
          select: {
            id: true, name: true, email: true, city: true, state: true, joined: true,
          },
          orderBy: { joined: "desc" },
          take: 200,
        });

        agentRegs = dbAgents.map((a) => ({
          id: a.id.slice(-6).toUpperCase(),
          name: a.name,
          email: a.email,
          city: a.city,
          state: a.state ?? "—",
          rera: "—",
          supervisor: "—",
          registeredOn: a.joined.toISOString().slice(0, 10),
          // Agent registrations have no associated lead, so no comment.
          latestComment: "—",
          status: "Active" as const,
        }));

        const dbTickets = await prisma.ticket.findMany({
          where: { createdAt: { gte: from, lte: to } },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 500,
        });

        const assignedIds = [
          ...new Set(dbTickets.map((t) => t.assignedTo).filter(Boolean) as string[]),
        ];
        const assignedUsers = assignedIds.length
          ? await prisma.user.findMany({
              where: { id: { in: assignedIds } },
              select: { id: true, name: true },
            })
          : [];
        const assignedMap = Object.fromEntries(assignedUsers.map((u) => [u.id, u.name]));

        // Tickets aren't lead-linked either; keep the column consistent.
        tickets = dbTickets.map((t) => ({ ...shapeTicket(t, assignedMap), latestComment: "—" }));
      }

      return {
        users,
        subscriptions,
        siteVisits,
        agentRegs,
        tickets,
        revSummary,
        leadsFunnel,
        staffPerf,
        commissions,
        campaigns,
      };
    }),
});
