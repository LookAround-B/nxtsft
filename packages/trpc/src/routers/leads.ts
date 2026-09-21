import { hasSellerContactAccess } from "../sellerInsights";
import { maskContact } from "../sellerContactPolicy";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { notify } from "../notify";
import { sendTemplateIfConfigured } from "../bhashsms";
import { createRazorpayPaymentLink } from "../razorpayLinks";
import { router, protectedProcedure, staffProcedure, adminProcedure, generalRateLimit } from "../server";
import {
  cuidSchema,
  nameSchema,
  phoneSchema,
  emailSchema,
  geoTextSchema,
  safeString,
  noteSchema,
  leadStatusSchema,
  leadSourceSchema,
  cursorSchema,
  limitSchema,
  datetimeSchema,
  descriptionSchema,
  priceSchema,
  areaSchema,
  areaUnitSchema,
  roomCountSchema,
  furnishingSchema,
  amenitiesSchema,
  safeUrlArraySchema,
  latitudeSchema,
  longitudeSchema,
} from "../sanitize";
import { leadScope, teamRepIds } from "../teamScope";

/** True when a lead sits in the calling supervisor's team scope. */
async function inTeamScope(
  ctx: { user: { id: string; role: string } },
  lead: { assignedToId: string | null; supervisorId: string | null },
) {
  if (lead.supervisorId === ctx.user.id) return true;
  if (!lead.assignedToId) return false;
  return (await teamRepIds(ctx)).includes(lead.assignedToId);
}

/** Minimum gap between payment reminders for one lead (any staff member). */
const REMINDER_COOLDOWN_HOURS = 6;

export const leadsRouter = router({
  // Buyer submits an inquiry from a property detail page. propertyId is
  // omitted for general leads with no specific listing yet (e.g. a
  // Refer & Earn buyer/tenant submission — see referrals.submit).
  create: protectedProcedure
    .use(generalRateLimit)
    .input(
      z.object({
        propertyId: cuidSchema.optional(),
        name: nameSchema,
        phone: phoneSchema,
        email: emailSchema.optional(),
        city: geoTextSchema.optional(),
        interest: safeString(500).optional(),
        notes: noteSchema.optional(),
        source: leadSourceSchema.default("Portal"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      let property: { ownerId: string; title: string; owner: { phone: string | null } | null } | null = null;
      if (input.propertyId) {
        property = await prisma.property.findFirst({
          where: { id: input.propertyId, deletedAt: null },
          select: { ownerId: true, title: true, owner: { select: { phone: true } } },
        });
        if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });
      }

      const lead = await prisma.lead.create({
        data: {
          propertyId: input.propertyId,
          userId: ctx.user.id,
          buyerUserId: ["user", "home-seller", "agent"].includes(ctx.user.role) ? ctx.user.id : null,
          name: input.name,
          phone: input.phone,
          email: input.email,
          city: input.city,
          interest: input.interest,
          notes: input.notes,
          source: input.source,
          status: "New",
        },
        include: {
          property: { select: { id: true, title: true, slug: true } },
        },
      });

      // Best-effort WhatsApp: alert the owner of the new lead, ack the buyer.
      // No-ops until the template env vars are set (see docs). Never awaited.
      if (property) {
        try {
          const preview = maskContact({ name: input.name, phone: input.phone }, await hasSellerContactAccess(property.ownerId));
          void sendTemplateIfConfigured(
            "BHASHSMS_TEMPLATE_NEW_LEAD_ALERT",
            property.owner?.phone,
            [preview.name, preview.phone ?? "Contact locked", property.title],
          );
          void sendTemplateIfConfigured(
            "BHASHSMS_TEMPLATE_ENQUIRY_ACK",
            input.phone,
            [input.name, property.title],
          );
        } catch {
          // The enquiry is saved; a failed entitlement lookup must not leak contacts or invite a duplicate submission.
        }
      }

      return lead;
    }),

  // Sales: see own assigned leads. Admin/Supervisor: see all
  list: staffProcedure
    .input(
      z.object({
        status: leadStatusSchema.optional(),
        source: leadSourceSchema.optional(),
        propertyId: cuidSchema.optional(),
        // Filter the list down to one sales rep (supervisor's "view rep's leads").
        assignedToId: cuidSchema.optional(),
        cursor: cursorSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input, ctx }) => {
      const { cursor, limit, status, source, propertyId, assignedToId } = input;

      // sales → own leads, supervisor → own team, admin → everything.
      const where: NonNullable<Parameters<typeof prisma.lead.findMany>[0]>["where"] =
        await leadScope(ctx);

      if (status) where.status = status;
      if (source) where.source = source;
      if (propertyId) where.propertyId = propertyId;
      if (assignedToId) where.assignedToId = assignedToId;

      const items = await prisma.lead.findMany({
        where,
        include: {
          // `status` drives the sales portal's Listings tab (draft vs live);
          // freeListing + boostExpiry drive the "send upgrade reminder" button.
          property: {
            select: { id: true, title: true, slug: true, status: true, freeListing: true, boostExpiry: true, tags: true },
          },
          user: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;
      return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
    }),

  get: staffProcedure
    .input(z.object({ id: cuidSchema }))
    .query(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({
        where: { id: input.id },
        include: {
          property: { include: { location: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      // Sales can only access their own leads
      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Supervisors are limited to their own team's leads.
      if (ctx.user.role === "supervisor" && !(await inTeamScope(ctx, lead))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return lead;
    }),

  updateStatus: staffProcedure
    .input(z.object({ id: cuidSchema, status: leadStatusSchema }))
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.id } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Supervisors are limited to their own team's leads.
      if (ctx.user.role === "supervisor" && !(await inTeamScope(ctx, lead))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const updated = await prisma.lead.update({
        where: { id: input.id },
        data: { status: input.status },
      });

      // Auto-create commission when a lead is closed as Converted
      if (input.status === "Converted" && lead.assignedToId && lead.value) {
        const alreadyExists = await prisma.commission.findFirst({ where: { leadId: lead.id } });
        if (!alreadyExists) {
          const dealValue = BigInt(lead.value);
          const rate = 0.02;
          const amount = BigInt(Math.round(Number(dealValue) * rate));
          const now = new Date();
          const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          await prisma.commission.create({
            data: {
              salesRepId: lead.assignedToId,
              leadId: lead.id,
              dealValue,
              rate,
              amount,
              status: "pending",
              periodMonth,
            },
          });

          const fmtAmount = amount >= 100000n
            ? `₹${(Number(amount) / 100000).toFixed(2)}L`
            : `₹${Number(amount).toLocaleString("en-IN")}`;
          await prisma.notification.create({
            data: {
              userId: lead.assignedToId,
              type: "lead_update",
              title: "Commission earned!",
              content: `${fmtAmount} commission pending for converting ${lead.name}.`,
              actionUrl: "/sales-portal#commission",
            },
          });
        }
      }

      return updated;
    }),

  addNote: staffProcedure
    .input(z.object({ id: cuidSchema, note: safeString(2000, 1) }))
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.id } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Supervisors are limited to their own team's leads.
      if (ctx.user.role === "supervisor" && !(await inTeamScope(ctx, lead))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const timestamp = new Date().toISOString();
      const appended = lead.notes
        ? `${lead.notes}\n[${timestamp}] ${ctx.user.name}: ${input.note}`
        : `[${timestamp}] ${ctx.user.name}: ${input.note}`;

      return prisma.lead.update({ where: { id: input.id }, data: { notes: appended } });
    }),

  // Assign a lead to a sales rep (admin only)
  assign: adminProcedure
    .input(z.object({ id: cuidSchema, assignedToId: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.id } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      // Verify the assignee exists and is a sales rep
      const assignee = await prisma.user.findUnique({ where: { id: input.assignedToId } });
      if (!assignee || assignee.role !== "sales") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Assignee must be a sales rep." });
      }

      const updated = await prisma.lead.update({
        where: { id: input.id },
        data: { assignedToId: input.assignedToId, status: "New", assignedAt: new Date() },
      });

      await prisma.assignmentHistory.create({
        data: {
          leadIds: [input.id],
          fromRole: ctx.user.role,
          toRole: "sales",
          assignedById: ctx.user.id,
          assignedToId: input.assignedToId,
        },
      });

      await prisma.notification.create({
        data: {
          userId: input.assignedToId,
          type: "lead_update",
          title: "New lead assigned to you",
          content: `${lead.name} (${lead.phone}) has been assigned to you.`,
          actionUrl: "/sales-portal",
        },
      });

      return updated;
    }),

  // Remove a lead's sales-rep assignment, returning it to the pool (admin only)
  unassign: adminProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.id } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      return prisma.lead.update({
        where: { id: input.id },
        data: { assignedToId: null },
      });
    }),

  // Schedule a site visit for a lead
  scheduleVisit: staffProcedure
    .input(
      z.object({
        leadId: cuidSchema,
        scheduledAt: datetimeSchema,
        notes: noteSchema.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({
        where: { id: input.leadId },
        include: { property: { select: { title: true } } },
      });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });

      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Supervisors are limited to their own team's leads.
      if (ctx.user.role === "supervisor" && !(await inTeamScope(ctx, lead))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!lead.propertyId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This lead isn't linked to a specific property yet — find out which listing they want before scheduling a visit.",
        });
      }

      const visit = await prisma.siteVisit.create({
        data: {
          userId: lead.userId,
          propertyId: lead.propertyId,
          salesRepId: ctx.user.id,
          scheduledAt: new Date(input.scheduledAt),
          notes: input.notes,
        },
      });

      await prisma.lead.update({
        where: { id: input.leadId },
        data: { visitScheduled: new Date(input.scheduledAt) },
      });

      // Best-effort WhatsApp confirmation to the visitor (no-op until configured).
      const whenText = new Date(input.scheduledAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      });
      void sendTemplateIfConfigured(
        "BHASHSMS_TEMPLATE_VISIT_CONFIRMED",
        lead.phone,
        [lead.name, lead.property?.title ?? "your selected property", whenText],
      );

      return visit;
    }),

  myCommissions: staffProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const commissions = await prisma.commission.findMany({
      where: { salesRepId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const pending = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);
    const mtd = commissions.filter((c) => c.createdAt >= startOfMonth).reduce((s, c) => s + Number(c.amount), 0);
    const ytd = commissions.filter((c) => c.createdAt >= startOfYear).reduce((s, c) => s + Number(c.amount), 0);

    const user = await prisma.user.findUnique({ where: { id: ctx.user.id }, select: { kycStatus: true } });

    return {
      pending,
      mtd,
      ytd,
      kycPending: user?.kycStatus !== "verified",
      items: commissions.map((c) => ({
        id: c.id,
        leadId: c.leadId,
        dealValue: Number(c.dealValue),
        amount: Number(c.amount),
        status: c.status,
        periodMonth: c.periodMonth,
        note: c.note,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }),

  logActivity: staffProcedure
    .input(
      z.object({
        type: z.enum(["call", "visit", "note"]),
        leadId: cuidSchema.optional(),
        action: safeString(500, 1),
        outcome: safeString(500, 1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return prisma.salesActivity.create({
        data: {
          salesRepId: ctx.user.id,
          type: input.type,
          leadId: input.leadId,
          action: input.action,
          outcome: input.outcome,
        },
      });
    }),

  myActivities: staffProcedure
    .input(z.object({ cursor: cursorSchema, limit: limitSchema }))
    .query(async ({ input, ctx }) => {
      const { cursor, limit } = input;
      const items = await prisma.salesActivity.findMany({
        where: { salesRepId: ctx.user.id },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;
      return {
        items: page.map((a) => ({
          id: a.id,
          type: a.type,
          leadId: a.leadId,
          action: a.action,
          outcome: a.outcome,
          ts: a.createdAt.toISOString(),
        })),
        nextCursor: page.at(-1)?.id ?? null,
        hasMore,
      };
    }),

  bulkAssign: staffProcedure
    .input(z.object({ leadIds: z.array(cuidSchema).min(1).max(500), assignedToId: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const allowedRoles = ["supervisor", "admin", "super-admin"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only supervisors and admins can assign leads." });
      }

      const assignee = await prisma.user.findUnique({ where: { id: input.assignedToId } });
      if (!assignee || assignee.role !== "sales") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Assignee must be a sales rep." });
      }
      // A supervisor may only route leads to their own attributed reps, and
      // only leads that are already in their team scope.
      if (ctx.user.role === "supervisor") {
        if (assignee.supervisorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "That rep is not on your team." });
        }
        const inScope = await prisma.lead.count({
          where: { id: { in: input.leadIds }, ...(await leadScope(ctx)) },
        });
        if (inScope !== input.leadIds.length) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Some leads are not on your team." });
        }
      }

      await prisma.lead.updateMany({
        where: { id: { in: input.leadIds } },
        data: { assignedToId: input.assignedToId, status: "New", assignedAt: new Date() },
      });

      await prisma.assignmentHistory.create({
        data: {
          leadIds: input.leadIds,
          fromRole: ctx.user.role,
          toRole: "sales",
          assignedById: ctx.user.id,
          assignedToId: input.assignedToId,
        },
      });

      await prisma.notification.create({
        data: {
          userId: input.assignedToId,
          type: "lead_update",
          title: `${input.leadIds.length} lead${input.leadIds.length === 1 ? "" : "s"} assigned to you`,
          content: `You have been assigned ${input.leadIds.length} new lead${input.leadIds.length === 1 ? "" : "s"}.`,
          actionUrl: "/sales-portal",
        },
      });

      return { ok: true };
    }),

  // ── LA-342: two-level assignment + payment-link pipeline ─────────────────

  // Active supervisors for the admin assign dropdown.
  supervisors: adminProcedure.query(async () => {
    return prisma.user.findMany({
      where: { role: "supervisor", active: true },
      select: { id: true, name: true, city: true },
      orderBy: { name: "asc" },
    });
  }),

  // Leads not yet routed to any supervisor (admin's assignment queue).
  unassigned: adminProcedure
    .input(z.object({ cursor: cursorSchema, limit: limitSchema }))
    .query(async ({ input }) => {
      const items = await prisma.lead.findMany({
        where: { supervisorId: null, status: { notIn: ["Converted", "Lost"] } },
        include: {
          property: { select: { id: true, title: true, slug: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });
      const hasMore = items.length > input.limit;
      const page = hasMore ? items.slice(0, input.limit) : items;
      return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
    }),

  // Admin routes leads (bulk or single) to a supervisor — first assignment hop.
  assignToSupervisor: adminProcedure
    .input(z.object({ leadIds: z.array(cuidSchema).min(1).max(500), supervisorId: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const supervisor = await prisma.user.findUnique({ where: { id: input.supervisorId } });
      if (!supervisor || supervisor.role !== "supervisor") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Assignee must be a supervisor." });
      }

      await prisma.lead.updateMany({
        where: { id: { in: input.leadIds } },
        data: { supervisorId: input.supervisorId, assignedAt: new Date() },
      });

      await prisma.assignmentHistory.create({
        data: {
          leadIds: input.leadIds,
          fromRole: ctx.user.role,
          toRole: "supervisor",
          assignedById: ctx.user.id,
          assignedToId: input.supervisorId,
        },
      });

      await notify({
        userId: input.supervisorId,
        type: "lead_update",
        title: `${input.leadIds.length} lead${input.leadIds.length === 1 ? "" : "s"} routed to your team`,
        content: "Reassign them to your sales reps from the supervisor portal.",
        actionUrl: "/supervisor-portal",
      });

      return { ok: true, count: input.leadIds.length };
    }),

  // Sales rep logs a call attempt on a lead.
  recordCall: staffProcedure
    .input(z.object({ id: cuidSchema, remark: safeString(1000, 1) }))
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.id } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Supervisors are limited to their own team's leads.
      if (ctx.user.role === "supervisor" && !(await inTeamScope(ctx, lead))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await prisma.salesActivity.create({
        data: {
          salesRepId: ctx.user.id,
          type: "call",
          leadId: lead.id,
          action: `Called ${lead.name}`,
          outcome: input.remark,
        },
      });

      return prisma.lead.update({
        where: { id: input.id },
        data: { lastCallAt: new Date(), lastCallRemark: input.remark },
      });
    }),

  // Sales rep sends a Razorpay payment link to the lead's customer. The
  // webhook (api/razorpay/webhook) completes the sale: marks the lead Paid →
  // Listed and applies the ₹500 commission rule.
  createPaymentLink: staffProcedure
    .input(
      z.object({
        leadId: cuidSchema,
        amount: z.coerce.number().int().min(1).max(10_000_000), // rupees, pre-discount
        plan: safeString(100, 1),
        // Optional discount coupon (see coupons router). Uppercased before use.
        couponCode: z
          .string()
          .trim()
          .min(3)
          .max(24)
          .regex(/^[A-Za-z0-9]+$/)
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Supervisors are limited to their own team's leads.
      if (ctx.user.role === "supervisor" && !(await inTeamScope(ctx, lead))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (lead.paymentStatus === "Paid") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This lead has already paid." });
      }

      // The rep who sends the link earns any commission — falls back to the
      // acting user when the lead was never formally assigned.
      const salesRepId = lead.assignedToId ?? ctx.user.id;

      // Re-creating a link supersedes any prior one: release the coupon this lead
      // had reserved so we don't leak a use (guarded above: an already-Paid lead
      // never reaches here, so we never release a redeemed-and-paid coupon).
      if (lead.couponCode) {
        await prisma.coupon.updateMany({
          where: { code: lead.couponCode, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }

      // Apply a coupon if supplied: validate, reserve a use atomically, discount.
      let couponCode: string | null = null;
      let couponDiscount: number | null = null;
      let originalAmount: number | null = null;
      let chargeAmount = input.amount;
      if (input.couponCode) {
        const code = input.couponCode.toUpperCase();
        const coupon = await prisma.coupon.findUnique({ where: { code } });
        if (!coupon || !coupon.active) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Coupon not found or inactive." });
        }
        if (coupon.validUntil.getTime() <= Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This coupon has expired." });
        }
        if (coupon.discountRupees >= input.amount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Coupon discount (₹${coupon.discountRupees}) is not less than the amount (₹${input.amount}).`,
          });
        }
        // Atomic reserve: maxUses is a stable literal, so this single conditional
        // increment is race-safe — count 0 means it was exhausted concurrently.
        const reserved = await prisma.coupon.updateMany({
          where: { code, active: true, validUntil: { gte: new Date() }, usedCount: { lt: coupon.maxUses } },
          data: { usedCount: { increment: 1 } },
        });
        if (reserved.count === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This coupon has reached its usage limit." });
        }
        couponCode = code;
        couponDiscount = coupon.discountRupees;
        originalAmount = input.amount;
        chargeAmount = input.amount - coupon.discountRupees;
      }

      const link = await createRazorpayPaymentLink({
        amountRupees: chargeAmount,
        description: `NxtSft ${input.plan} — ${lead.name}`,
        customer: { name: lead.name, contact: lead.phone, email: lead.email ?? undefined },
        notes: { lead_id: lead.id, salesrep_id: salesRepId, plan: input.plan },
      }).catch(async (err) => {
        // The link failed after we reserved the coupon — give the use back.
        if (couponCode) {
          await prisma.coupon.updateMany({
            where: { code: couponCode, usedCount: { gt: 0 } },
            data: { usedCount: { decrement: 1 } },
          });
        }
        throw err;
      });

      return prisma.lead.update({
        where: { id: input.leadId },
        data: {
          plan: input.plan,
          amount: chargeAmount,
          couponCode,
          couponDiscount,
          originalAmount,
          paymentLink: link.shortUrl,
          paymentStatus: "Pending",
          status: "Payment Pending",
        },
      });
    }),

  // Rep edits the listing attached to one of their leads (created on the
  // customer's behalf). The change is NOT applied directly — it goes through the
  // same admin-review pipeline as a seller's own edit (PropertyEditRequest →
  // admin.editRequests.approve), so nothing goes live without final admin sign-off.
  submitListingEdit: staffProcedure
    .input(
      z.object({
        leadId: cuidSchema,
        title: safeString(200, 10).optional(),
        description: descriptionSchema.optional(),
        price: priceSchema.optional(),
        area: areaSchema.optional(),
        areaUnit: areaUnitSchema.optional(),
        builtUpArea: areaSchema.optional(),
        bhk: safeString(20).optional(),
        bedrooms: roomCountSchema.optional(),
        bathrooms: roomCountSchema.optional(),
        balconies: roomCountSchema.optional(),
        parking: roomCountSchema.optional(),
        furnishing: furnishingSchema.optional(),
        facing: safeString(30).optional(),
        possession: safeString(30).optional(),
        amenities: amenitiesSchema.optional(),
        images: safeUrlArraySchema.optional(),
        locality: geoTextSchema.optional(),
        latitude: latitudeSchema.optional(),
        longitude: longitudeSchema.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { leadId, ...changes } = input;

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (ctx.user.role === "supervisor" && !(await inTeamScope(ctx, lead))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!lead.propertyId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This lead has no linked listing to edit." });
      }

      const property = await prisma.property.findFirst({
        where: { id: lead.propertyId, deletedAt: null },
        select: { id: true, ownerId: true, title: true },
      });
      if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Linked listing not found." });

      // Keep only fields the rep actually changed, so the admin's review diff is clean.
      const proposed = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
      if (Object.keys(proposed).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No changes to submit." });
      }

      // Reuse the seller edit-approval pipeline: one pending request per property.
      // ownerId stays the customer, so approval notifies them (admin.editRequests).
      await prisma.propertyEditRequest.deleteMany({ where: { propertyId: property.id, status: "Pending" } });
      await prisma.propertyEditRequest.create({
        data: { propertyId: property.id, ownerId: property.ownerId, changes: proposed },
      });

      await prisma.salesActivity
        .create({
          data: {
            salesRepId: ctx.user.id,
            type: "listing_edit",
            leadId: lead.id,
            action: `Submitted listing edit for "${property.title}"`,
            outcome: "Pending admin approval",
          },
        })
        .catch(() => {});

      await notify({
        userId: ctx.user.id,
        type: "listing_edit_submitted",
        title: "Listing edit submitted",
        content: `Your changes to "${property.title}" are pending admin approval.`,
        actionUrl: "/sales-portal",
      }).catch(() => {});

      return { ok: true as const };
    }),

  // Nudge a customer who has a link but hasn't paid. WhatsApp only (the number
  // we have is a mobile); no-ops silently until the template env var is set, so
  // the rep still gets the activity logged either way.
  sendPaymentReminder: staffProcedure
    .input(z.object({ leadId: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Supervisors are limited to their own team's leads.
      if (ctx.user.role === "supervisor" && !(await inTeamScope(ctx, lead))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (lead.paymentStatus === "Paid") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This lead has already paid." });
      }
      if (!lead.paymentLink) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Create a payment link first." });
      }

      // Anti-spam: one reminder per lead per 6 hours, across all staff. The
      // SalesActivity log doubles as the rate-limit record — no extra column.
      const since = new Date(Date.now() - REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000);
      const recent = await prisma.salesActivity.findFirst({
        where: { leadId: lead.id, type: "payment_reminder", createdAt: { gte: since } },
        select: { createdAt: true },
      });
      if (recent) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `A reminder was already sent ${Math.round((Date.now() - recent.createdAt.getTime()) / 60000)} min ago. Try again later.`,
        });
      }

      await sendTemplateIfConfigured("BHASHSMS_TEMPLATE_PAYMENT_REMINDER", lead.phone, [
        lead.name,
        lead.plan ?? "your NxtSft listing",
        lead.amount ? `₹${lead.amount.toLocaleString("en-IN")}` : "",
        lead.paymentLink,
      ]);

      await prisma.salesActivity.create({
        data: {
          salesRepId: ctx.user.id,
          type: "payment_reminder",
          leadId: lead.id,
          action: `Payment reminder sent to ${lead.name}`,
          outcome: lead.plan ? `${lead.plan} — ${lead.paymentLink}` : lead.paymentLink,
        },
      });

      return { ok: true as const, phone: lead.phone };
    }),

  // Nudge a free-listing customer to upgrade so their listing moves off the
  // last page. Any backend staff member may send it (admin, supervisor, sales,
  // support) — a sales rep only for their own assigned leads, same scoping as
  // the payment reminder above, and the same 6-hour per-lead cooldown so two
  // staff members can't double-message the customer.
  sendUpgradeReminder: staffProcedure
    .input(z.object({ leadId: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({
        where: { id: input.leadId },
        include: {
          property: {
            select: { id: true, title: true, slug: true, ownerId: true, status: true, freeListing: true, boostExpiry: true },
          },
        },
      });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      if (ctx.user.role === "sales" && lead.assignedToId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Supervisors are limited to their own team's leads.
      if (ctx.user.role === "supervisor" && !(await inTeamScope(ctx, lead))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const property = lead.property;
      if (!property?.freeListing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This lead has no free listing to upgrade." });
      }
      if (property.status !== "Active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The listing isn't live yet — it still needs admin approval.",
        });
      }
      if (property.boostExpiry && property.boostExpiry > new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This listing is already boosted." });
      }

      // Same anti-spam shape as sendPaymentReminder: the SalesActivity row is
      // the rate-limit record, so no extra column and it's global per lead.
      const since = new Date(Date.now() - REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000);
      const recent = await prisma.salesActivity.findFirst({
        where: { leadId: lead.id, type: "upgrade_reminder", createdAt: { gte: since } },
        select: { createdAt: true },
      });
      if (recent) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `An upgrade reminder was already sent ${Math.round((Date.now() - recent.createdAt.getTime()) / 60000)} min ago. Try again later.`,
        });
      }

      // Boost packs are sold only while at least one boost plan is active, so
      // don't SMS a customer a link to a section the pricing page won't render.
      const activeBoostPlans = await prisma.plan.count({ where: { type: "boost", active: true } });
      if (activeBoostPlans === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Boost packs are switched off right now — activate one in Plans Manager first.",
        });
      }

      const upgradeUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.nxtsft.com"}/pricing#boost`;
      await sendTemplateIfConfigured("BHASHSMS_TEMPLATE_UPGRADE_REMINDER", lead.phone, [
        lead.name,
        property.title,
        upgradeUrl,
      ]);

      await notify({
        userId: property.ownerId,
        type: "listing_upgrade_reminder",
        title: "Move your listing to the first page",
        content: `"${property.title}" is live as a free listing on the last page. Upgrade it to reach buyers on page 1.`,
        actionUrl: "/pricing#boost",
      });

      await prisma.salesActivity.create({
        data: {
          salesRepId: ctx.user.id,
          type: "upgrade_reminder",
          leadId: lead.id,
          action: `Upgrade reminder sent to ${lead.name}`,
          outcome: `Free listing — "${property.title}"`,
        },
      });

      return { ok: true as const, phone: lead.phone };
    }),

  // Role-scoped flat rows for the CSV export button (client renders the file
  // via lib/download-csv). Sales = own, supervisor = own team, admin = all.
  exportRows: staffProcedure
    .input(
      z.object({
        from: datetimeSchema.optional(),
        to: datetimeSchema.optional(),
        status: leadStatusSchema.optional(),
        paymentStatus: z.enum(["Pending", "Paid", "Failed"]).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const where: NonNullable<Parameters<typeof prisma.lead.findMany>[0]>["where"] =
        await leadScope(ctx);
      if (input.status) where.status = input.status;
      if (input.paymentStatus) where.paymentStatus = input.paymentStatus;
      if (input.from || input.to) {
        where.createdAt = {
          ...(input.from ? { gte: new Date(input.from) } : {}),
          ...(input.to ? { lte: new Date(input.to) } : {}),
        };
      }

      const leads = await prisma.lead.findMany({
        where,
        include: { property: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });

      // Resolve assignee names in one pass.
      const userIds = [
        ...new Set(leads.flatMap((l) => [l.assignedToId, l.supervisorId]).filter((v): v is string => !!v)),
      ];
      const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
      const nameById = new Map(users.map((u) => [u.id, u.name]));

      return leads.map((l) => ({
        leadId: l.id,
        name: l.name,
        phone: l.phone,
        email: l.email ?? "",
        city: l.city ?? "",
        source: l.source ?? "",
        interest: l.interest ?? "",
        property: l.property?.title ?? "",
        status: l.status,
        plan: l.plan ?? "",
        amount: l.amount ?? "",
        paymentStatus: l.paymentStatus,
        paymentId: l.paymentId ?? "",
        paymentDate: l.paymentDate?.toISOString() ?? "",
        expiryDate: l.expiryDate?.toISOString() ?? "",
        supervisor: (l.supervisorId && nameById.get(l.supervisorId)) || "",
        salesRep: (l.assignedToId && nameById.get(l.assignedToId)) || "",
        assignedAt: l.assignedAt?.toISOString() ?? "",
        lastCallAt: l.lastCallAt?.toISOString() ?? "",
        lastCallRemark: l.lastCallRemark ?? "",
        visitScheduled: l.visitScheduled?.toISOString() ?? "",
        visitCompleted: l.visitCompleted?.toISOString() ?? "",
        expectedValue: l.value ?? "",
        submittedAt: l.createdAt.toISOString(),
      }));
    }),

  stats: staffProcedure.query(async ({ ctx }) => {
    const where = await leadScope(ctx);

    // One grouped query returns every status count in a single round trip; the
    // total is just their sum. (7 separate counts were ~7× the VPS latency.)
    const byStatus = await prisma.lead.groupBy({ by: ["status"], where, _count: { _all: true } });
    const c = (s: string) => byStatus.find((g) => g.status === s)?._count._all ?? 0;

    return {
      total: byStatus.reduce((sum, g) => sum + g._count._all, 0),
      hot: c("Hot"),
      warm: c("Warm"),
      cold: c("Cold"),
      new: c("New"),
      converted: c("Converted"),
      lost: c("Lost"),
    };
  }),

  // Live sidebar badge counts for the sales portal — scoped to the signed-in
  // rep (admins/supervisors see the whole pipeline, same rule as stats above).
  badgeCounts: staffProcedure.query(async ({ ctx }) => {
    const where = await leadScope(ctx);

    // The telecalling book is rep-owned, so its badges scope by ownerId even
    // for staff who see every lead.
    const contactWhere =
      ctx.user.role === "sales"
        ? { ownerId: ctx.user.id }
        : ctx.user.role === "supervisor"
          ? { ownerId: { in: [ctx.user.id, ...(await teamRepIds(ctx))] } }
          : {};

    const [openLeads, hotLeads, visitsUpcoming, contacts, callbacksDue] = await Promise.all([
      prisma.lead.count({ where: { ...where, status: { notIn: ["Converted", "Lost"] } } }),
      prisma.lead.count({ where: { ...where, status: "Hot" } }),
      prisma.lead.count({ where: { ...where, visitScheduled: { gte: new Date() } } }),
      prisma.repContact.count({ where: { ...contactWhere, status: { notIn: ["Converted", "NI"] } } }),
      prisma.repContact.count({ where: { ...contactWhere, callbackAt: { lte: new Date() } } }),
    ]);
    return { openLeads, hotLeads, visitsUpcoming, contacts, callbacksDue };
  }),
});
