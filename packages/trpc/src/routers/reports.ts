import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, staffProcedure } from "../server.js";

const TAT_HOURS: Record<string, number> = {
  low: 72, medium: 48, high: 24, urgent: 4,
};

function roleToCategory(role: string): "Buyer" | "Seller" | "Agent" | "Owner" | "Tenant" {
  if (role === "home-seller") return "Seller";
  if (role === "sales") return "Agent";
  return "Buyer";
}

function subStatusToPayStatus(status: string): "Paid" | "Unpaid" | "Follow-up" | "Not Interested" {
  if (status === "Active") return "Paid";
  if (status === "Cancelled") return "Not Interested";
  return "Unpaid";
}

function ticketDisplayStatus(status: string, priority: string): "Open" | "Resolved" | "Escalated" {
  if (priority === "urgent" && !["resolved", "closed"].includes(status)) return "Escalated";
  if (["resolved", "closed"].includes(status)) return "Resolved";
  return "Open";
}

export const reportsRouter = router({
  snapshot: staffProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const from = new Date(input.from + "T00:00:00.000Z");
      const to = new Date(input.to + "T23:59:59.999Z");

      // ── Registered Users (buyers & sellers) ─────────────────
      const dbUsers = await prisma.user.findMany({
        where: {
          joined: { gte: from, lte: to },
          role: { in: ["user", "home-seller"] },
        },
        select: {
          id: true, name: true, email: true, phone: true,
          role: true, city: true, state: true, verified: true, joined: true,
        },
        orderBy: { joined: "desc" },
        take: 500,
      });

      const users = dbUsers.map((u) => ({
        id: u.id.slice(0, 6).toUpperCase(),
        name: u.name,
        email: u.email,
        phone: u.phone ?? "—",
        category: roleToCategory(u.role),
        city: u.city,
        state: u.state ?? "—",
        builder: "—",
        supervisor: "—",
        salesStaff: "—",
        registeredOn: u.joined.toISOString().slice(0, 10),
        status: (u.verified ? "Active" : "Inactive") as "Active" | "Inactive",
      }));

      // ── Subscriptions ────────────────────────────────────────
      const dbSubs = await prisma.subscription.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: {
          user: { select: { name: true, city: true, state: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      });

      // Count subs per user to distinguish Fresh vs Renewal
      const seenUsers: Record<string, number> = {};
      const subscriptions = dbSubs.map((s) => {
        seenUsers[s.userId] = (seenUsers[s.userId] ?? 0) + 1;
        return {
          id: s.id.slice(0, 6).toUpperCase(),
          userId: s.userId,
          userName: s.user.name,
          plan: s.planName,
          amount: Math.round(Number(s.amount) / 100),
          category: roleToCategory(s.user.role),
          city: s.user.city,
          state: s.user.state ?? "—",
          builder: "—",
          supervisor: "—",
          salesStaff: "—",
          type: (seenUsers[s.userId] > 1 ? "Renewal" : "Fresh") as "Fresh" | "Renewal",
          status: subStatusToPayStatus(s.status),
          subscribedOn: s.createdAt.toISOString().slice(0, 10),
          dueDate: s.endDate.toISOString().slice(0, 10),
        };
      });

      // ── Site Visits (manual joins — SiteVisit has no Prisma relations) ──
      const dbVisits = await prisma.siteVisit.findMany({
        where: { scheduledAt: { gte: from, lte: to } },
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
              select: { id: true, title: true, location: { select: { city: true } } },
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
          builder: "—",
          supervisor: "—",
          salesStaff: rep?.name ?? "—",
          scheduledOn: v.scheduledAt.toISOString().slice(0, 10),
          status: v.status as "Scheduled" | "Completed" | "Cancelled" | "Rescheduled",
        };
      });

      // ── Agent Registrations (sales-role users) ───────────────
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

      const agentRegs = dbAgents.map((a) => ({
        id: a.id.slice(0, 6).toUpperCase(),
        name: a.name,
        email: a.email,
        city: a.city,
        state: a.state ?? "—",
        rera: "—",
        supervisor: "—",
        registeredOn: a.joined.toISOString().slice(0, 10),
        status: "Active" as "Active" | "Pending" | "Rejected",
      }));

      // ── Support Tickets ──────────────────────────────────────
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

      const tickets = dbTickets.map((t) => {
        const tatHours = TAT_HOURS[t.priority] ?? 48;
        const actualHours = t.resolvedAt
          ? Math.round((t.resolvedAt.getTime() - t.createdAt.getTime()) / 3600000)
          : null;
        return {
          id: t.id.slice(0, 6).toUpperCase(),
          subject: t.subject,
          raisedBy: t.user.name,
          category: t.category,
          city: "—",
          state: "—",
          assignedTo: t.assignedTo ? (assignedMap[t.assignedTo] ?? "—") : "—",
          supervisor: "—",
          raisedOn: t.createdAt.toISOString().slice(0, 10),
          resolvedOn: t.resolvedAt?.toISOString().slice(0, 10) ?? null,
          tatHours,
          actualHours,
          withinTAT: actualHours != null ? actualHours <= tatHours : null,
          status: ticketDisplayStatus(t.status, t.priority),
        };
      });

      return { users, subscriptions, siteVisits, agentRegs, tickets };
    }),
});
