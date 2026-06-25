import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, staffProcedure } from "../server.js";
import { deriveTicketRow } from "./tickets.js";

type ReportCategory = "Buyer" | "Seller" | "Agent" | "Owner" | "Tenant";

// Derive the report category from role + lead interest. Renters/tenants are
// users whose lead interest mentions rent/lease; property owners are sellers.
function roleToCategory(role: string, interest?: string | null): ReportCategory {
  if (role === "sales") return "Agent";
  if (role === "home-seller") return "Owner";
  const i = (interest ?? "").toLowerCase();
  if (i.includes("rent") || i.includes("lease") || i.includes("tenant") || i.includes("pg")) {
    return "Tenant";
  }
  return "Buyer";
}

// Map an auth role to the GOL-137 "job category" display label. Keep in sync
// with JOB_CATEGORIES in apps/web/src/data/reports.ts. Roles without a report
// presence yet (e.g. referral) simply never appear in the data.
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

function subStatusToPayStatus(status: string): "Paid" | "Unpaid" | "Follow-up" | "Not Interested" {
  if (status === "Active") return "Paid";
  if (status === "Cancelled") return "Not Interested";
  return "Unpaid";
}

// Derive a ticket report row, then truncate the id for dashboard display
// consistency with the other report arrays.
function shapeTicket(
  t: Parameters<typeof deriveTicketRow>[0],
  assignedMap: Record<string, string>,
) {
  const row = deriveTicketRow(t, assignedMap);
  return { ...row, id: row.id.slice(0, 6).toUpperCase() };
}

export const reportsRouter = router({
  snapshot: staffProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input, ctx }) => {
      const from = new Date(input.from + "T00:00:00.000Z");
      const to = new Date(input.to + "T23:59:59.999Z");

      // Sales reps see only what's attributable to them: buyers on their
      // assigned leads (for users & subscriptions) and their own site visits.
      // Other staff (supervisor/admin/super-admin/support-admin) see all data.
      const isSales = ctx.user.role === "sales";
      let repBuyerIds: string[] | null = null;
      if (isSales) {
        const repLeads = await prisma.lead.findMany({
          where: { assignedToId: ctx.user.id },
          select: { userId: true },
        });
        repBuyerIds = [...new Set(repLeads.map((l) => l.userId).filter(Boolean))];
      }

      // ── Registered Users (buyers & sellers) ─────────────────
      const dbUsers = await prisma.user.findMany({
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
      });

      // ── Subscriptions ────────────────────────────────────────
      const dbSubs = await prisma.subscription.findMany({
        where: {
          createdAt: { gte: from, lte: to },
          ...(repBuyerIds ? { userId: { in: repBuyerIds } } : {}),
        },
        include: {
          user: { select: { name: true, city: true, state: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      });

      // ── Attribution: rep → supervisor, and user → assigned rep / builder ──
      // Staff (sales + supervisors) with their supervisor name resolved.
      const staff = await prisma.user.findMany({
        where: { role: { in: ["sales", "supervisor"] } },
        select: { id: true, name: true, supervisorId: true },
      });
      const staffById = new Map(staff.map((s) => [s.id, s]));
      const repName = (id?: string | null) => (id ? staffById.get(id)?.name ?? "—" : "—");
      const supName = (repId?: string | null) => {
        const rep = repId ? staffById.get(repId) : null;
        return rep?.supervisorId ? staffById.get(rep.supervisorId)?.name ?? "—" : "—";
      };

      // Map each report user → their most recent lead (for rep, builder, interest).
      const reportUserIds = [
        ...new Set([...dbUsers.map((u) => u.id), ...dbSubs.map((s) => s.userId)]),
      ];
      const userLeads = reportUserIds.length
        ? await prisma.lead.findMany({
            where: { userId: { in: reportUserIds } },
            select: { userId: true, assignedToId: true, interest: true, propertyId: true },
            orderBy: { createdAt: "desc" },
          })
        : [];
      const leadByUser = new Map<string, (typeof userLeads)[number]>();
      for (const l of userLeads) {
        if (l.userId && !leadByUser.has(l.userId)) leadByUser.set(l.userId, l);
      }

      // Resolve builder names for the properties referenced by those leads.
      const leadPropIds = [
        ...new Set([...leadByUser.values()].map((l) => l.propertyId).filter(Boolean)),
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
        };
      };

      const users = dbUsers.map((u) => {
        const a = attrFor(u.id, u.role);
        return {
          id: u.id.slice(0, 6).toUpperCase(),
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
          registeredOn: u.joined.toISOString().slice(0, 10),
          status: (u.verified ? "Active" : "Inactive") as "Active" | "Inactive",
        };
      });

      // Count subs per user to distinguish Fresh vs Renewal
      const seenUsers: Record<string, number> = {};
      const subscriptions = dbSubs.map((s) => {
        seenUsers[s.userId] = (seenUsers[s.userId] ?? 0) + 1;
        const a = attrFor(s.userId, s.user.role);
        return {
          id: s.id.slice(0, 6).toUpperCase(),
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
          type: ((seenUsers[s.userId] ?? 0) > 1 ? "Renewal" : "Fresh") as "Fresh" | "Renewal",
          status: subStatusToPayStatus(s.status),
          subscribedOn: s.createdAt.toISOString().slice(0, 10),
          dueDate: s.endDate.toISOString().slice(0, 10),
        };
      });

      // ── Site Visits (manual joins — SiteVisit has no Prisma relations) ──
      const dbVisits = await prisma.siteVisit.findMany({
        where: {
          scheduledAt: { gte: from, lte: to },
          ...(isSales ? { salesRepId: ctx.user.id } : {}),
        },
        orderBy: { scheduledAt: "desc" },
        take: 500,
      });

      const propertyIds = [...new Set(dbVisits.map((v) => v.propertyId))];
      const buyerIds = [...new Set(dbVisits.map((v) => v.userId))];
      const repIds = [...new Set(dbVisits.map((v) => v.salesRepId).filter(Boolean))] as string[];

      const [properties, buyers, reps] = await Promise.all([
        propertyIds.length
          ? prisma.property.findMany({
              where: { id: { in: propertyIds } },
              select: {
                id: true,
                title: true,
                builder: true,
                location: { select: { city: true } },
              },
            })
          : Promise.resolve([]),
        buyerIds.length
          ? prisma.user.findMany({
              where: { id: { in: buyerIds } },
              select: { id: true, name: true },
            })
          : Promise.resolve([]),
        repIds.length
          ? prisma.user.findMany({
              where: { id: { in: repIds } },
              select: { id: true, name: true },
            })
          : Promise.resolve([]),
      ]);

      const propMap = Object.fromEntries(properties.map((p) => [p.id, p]));
      const buyerMap = Object.fromEntries(buyers.map((u) => [u.id, u]));
      const repMap = Object.fromEntries(reps.map((u) => [u.id, u]));

      const siteVisits = dbVisits.map((v) => {
        const prop = propMap[v.propertyId];
        const buyer = buyerMap[v.userId];
        const rep = v.salesRepId ? repMap[v.salesRepId] : null;
        return {
          id: v.id.slice(0, 6).toUpperCase(),
          leadName: buyer?.name ?? "—",
          property: prop?.title ?? "—",
          city: prop?.location?.city ?? "—",
          state: "—",
          category: "—",
          builder: prop?.builder ?? "—",
          supervisor: supName(v.salesRepId),
          salesStaff: rep?.name ?? "—",
          scheduledOn: v.scheduledAt.toISOString().slice(0, 10),
          status: v.status as "Scheduled" | "Completed" | "Cancelled" | "Rescheduled",
        };
      });

      // ── Agent Registrations & Support Tickets ────────────────
      // Neither attributes to an individual sales rep, so reps get empty
      // sections; all other staff see the full platform-wide lists.
      type AgentReg = {
        id: string; name: string; email: string; city: string; state: string;
        rera: string; supervisor: string; registeredOn: string;
        status: "Active" | "Pending" | "Rejected";
      };
      let agentRegs: AgentReg[] = [];
      let tickets: ReturnType<typeof shapeTicket>[] = [];

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
          id: a.id.slice(0, 6).toUpperCase(),
          name: a.name,
          email: a.email,
          city: a.city,
          state: a.state ?? "—",
          rera: "—",
          supervisor: "—",
          registeredOn: a.joined.toISOString().slice(0, 10),
          status: "Active" as const,
        }));

        const dbTickets = await prisma.ticket.findMany({
          where: { createdAt: { gte: from, lte: to } },
          include: {
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        });

        // Batch-resolve assignedTo user names (assignedTo is String?, no relation)
        const assignedIds = [...new Set(
          dbTickets.map((t) => t.assignedTo).filter(Boolean) as string[]
        )];
        const assignedUsers = assignedIds.length
          ? await prisma.user.findMany({
              where: { id: { in: assignedIds } },
              select: { id: true, name: true },
            })
          : [];
        const assignedMap = Object.fromEntries(assignedUsers.map((u) => [u.id, u.name]));

        tickets = dbTickets.map((t) => shapeTicket(t, assignedMap));
      }

      return { users, subscriptions, siteVisits, agentRegs, tickets };
    }),
});
