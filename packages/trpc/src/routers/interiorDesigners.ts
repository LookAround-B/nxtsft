import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { notifyCredit, portalBase } from "../notify";
import { router, publicProcedure, protectedProcedure, contactRateLimit } from "../server";
import {
  safeString,
  searchSchema,
  geoTextSchema,
  pageSchema,
  limitSchema,
  cuidSchema,
  amenitiesSchema,
  safeUrlArraySchema,
  phoneSchema,
  emailSchema,
} from "../sanitize";

function makeSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// Serialize BigInt budget field to number for JSON transport
function serializeDesigner<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? Number(v) : v)));
}

export const interiorDesignersRouter = router({
  // ── Public directory procedures ────────────────────────────────────────

  publicList: publicProcedure
    .input(
      z.object({
        search:      searchSchema.optional(),
        city:        geoTextSchema.optional(),
        designStyle: safeString(60).optional(),
        maxBudget:   z.number().int().positive().max(999_999_999_999).optional(),
        minBudget:   z.number().int().positive().max(999_999_999_999).optional(),
        sort:        z.enum(["featured", "latest", "popular", "budget_low"]).default("featured"),
        page:        pageSchema,
        limit:       limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { search, city, designStyle, maxBudget, minBudget, sort, page, limit } = input;
      const where: NonNullable<Parameters<typeof prisma.interiorDesigner.findMany>[0]>["where"] = {
        status: "active",
      };
      if (city) where.city = { contains: city, mode: "insensitive" };
      if (designStyle) where.designStyles = { has: designStyle };
      if (maxBudget != null || minBudget != null) {
        where.startingBudget = {
          ...(maxBudget != null ? { lte: BigInt(maxBudget) } : {}),
          ...(minBudget != null ? { gte: BigInt(minBudget) } : {}),
        };
      }
      if (search) {
        where.OR = [
          { companyName: { contains: search, mode: "insensitive" } },
          { city:        { contains: search, mode: "insensitive" } },
          { areasServed: { has: search } },
        ];
      }

      const orderBy: NonNullable<Parameters<typeof prisma.interiorDesigner.findMany>[0]>["orderBy"] =
        sort === "latest"     ? [{ createdAt: "desc" }, { id: "asc" }]
        : sort === "popular"    ? [{ views: "desc" }, { id: "asc" }]
        : sort === "budget_low" ? [{ startingBudget: "asc" }, { id: "asc" }]
        : [{ verified: "desc" }, { projectsCompleted: "desc" }, { id: "asc" }];

      const items = await prisma.interiorDesigner.findMany({
        where,
        orderBy,
        take: limit,
        skip: (page - 1) * limit,
      });
      const total = await prisma.interiorDesigner.count({ where });
      return {
        items: items.map(serializeDesigner),
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        total,
      };
    }),

  publicGet: publicProcedure
    .input(z.object({ slug: safeString(300, 1) }))
    .query(async ({ input }) => {
      const designer = await prisma.interiorDesigner.findFirst({
        where: { slug: input.slug, status: "active" },
      });
      if (!designer) return null;
      // Contact fields are credit-gated — never sent on the public read.
      const { phone: _phone, email: _email, ...safe } = designer;
      return serializeDesigner(safe);
    }),

  // Similar designers — same city first, then shared design styles. Excludes self.
  similar: publicProcedure
    .input(z.object({ slug: safeString(300, 1), limit: z.number().int().min(1).max(12).default(4) }))
    .query(async ({ input }) => {
      const base = await prisma.interiorDesigner.findFirst({
        where: { slug: input.slug, status: "active" },
        select: { id: true, city: true, designStyles: true },
      });
      if (!base) return [];
      const items = await prisma.interiorDesigner.findMany({
        where: {
          status: "active",
          id: { not: base.id },
          OR: [
            { city: { equals: base.city, mode: "insensitive" } },
            ...(base.designStyles.length ? [{ designStyles: { hasSome: base.designStyles } }] : []),
          ],
        },
        orderBy: [{ verified: "desc" }, { projectsCompleted: "desc" }, { id: "asc" }],
        take: input.limit,
      });
      return items.map(serializeDesigner);
    }),

  // Self-serve business submission — any signed-in user can submit their own
  // interior-design company. Always lands as status "pending" (model default)
  // so it stays out of the public directory until an admin approves it via
  // the InteriorsTab review queue (mirrors admin.interiorDesigners.create).
  submit: protectedProcedure
    .use(contactRateLimit)
    .input(
      z.object({
        companyName: safeString(200, 1),
        city: geoTextSchema,
        state: geoTextSchema.optional(),
        description: safeString(5000).optional(),
        areasServed: amenitiesSchema.optional(),
        yearsExperience: z.number().int().min(0).max(100).optional(),
        startingBudget: z.number().int().positive().max(999_999_999_999).optional(),
        designStyles: amenitiesSchema.optional(),
        servicesOffered: amenitiesSchema.optional(),
        portfolioImages: safeUrlArraySchema.optional(),
        workingHours: safeString(120).optional(),
        website: safeString(300).optional(),
        phone: phoneSchema,
        email: emailSchema.optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const base = makeSlug(`${input.companyName}-${input.city}`);
      let slug = base;
      let n = 2;
      while (await prisma.interiorDesigner.findUnique({ where: { slug } })) slug = `${base}-${n++}`;

      const { startingBudget, ...rest } = input;
      const designer = await prisma.interiorDesigner.create({
        data: {
          ...rest,
          slug,
          startingBudget: startingBudget != null ? BigInt(startingBudget) : null,
        },
      });

      // Surface the new pending listing in every admin's notification bell,
      // linking straight to their portal's review queue.
      const admins = await prisma.user.findMany({
        where: { role: { in: ["admin", "super-admin"] } },
        select: { id: true, role: true },
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type: "interior_submission",
            title: "New Home Interiors listing pending review",
            content: `"${input.companyName}" (${input.city}) was submitted and awaits approval.`,
            actionUrl: `${portalBase(a.role)}#interiors`,
          })),
        });
      }

      return { id: designer.id, slug: designer.slug };
    }),

  // Flag a listing — routed to staff as an Enquiry row (mirrors properties.reportIssue).
  reportIssue: publicProcedure
    .use(contactRateLimit)
    .input(
      z.object({
        id: cuidSchema,
        reason: z.enum(["wrong_info", "not_reachable", "closed", "spam", "more_info"]),
        name: safeString(80, 1).optional(),
        phone: safeString(20, 1).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const designer = await prisma.interiorDesigner.findFirst({
        where: { id: input.id },
        select: { companyName: true, slug: true },
      });
      if (!designer) throw new TRPCError({ code: "NOT_FOUND", message: "Designer not found." });

      const REASON_LABEL: Record<typeof input.reason, string> = {
        wrong_info:    "Wrong Info",
        not_reachable: "Not Reachable",
        closed:        "Business Closed",
        spam:          "Spam / Fake Listing",
        more_info:     "Request More Info",
      };
      const contact = input.name || input.phone
        ? `\nReporter: ${input.name ?? "—"}${input.phone ? ` (${input.phone})` : ""}`
        : "";

      await prisma.enquiry.create({
        data: {
          name: input.name || "Designer Report",
          email: "report@nxtsft.local",
          phone: input.phone,
          message: `[${REASON_LABEL[input.reason]}] reported on interior designer "${designer.companyName}" (/interiors/${designer.slug}).${contact}`,
          source: "Report",
          status: "New",
        },
      });
      return { ok: true };
    }),

  // Reveal a designer's phone/email — costs 1 credit, mirrors properties.unlockContact.
  unlockContact: protectedProcedure
    .use(contactRateLimit)
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const designer = await prisma.interiorDesigner.findFirst({
        where: { id: input.id, status: "active" },
        select: { id: true, phone: true, email: true, companyName: true },
      });
      if (!designer) throw new TRPCError({ code: "NOT_FOUND", message: "Designer not found." });

      // Atomic deduct: WHERE credits >= 1 prevents double-spend from concurrent requests
      const deducted = await prisma.user.updateMany({
        where: { id: ctx.user.id, credits: { gte: 1 } },
        data: { credits: { decrement: 1 } },
      });
      if (deducted.count === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Insufficient credits. Purchase a plan to unlock contacts.",
        });
      }

      await Promise.all([
        prisma.creditTransaction.create({
          data: {
            userId: ctx.user.id,
            type: "debit",
            amount: 1,
            reason: "designer_contact_unlock",
            interiorDesignerId: input.id,
          },
        }),
        prisma.interiorDesigner.update({ where: { id: input.id }, data: { contacts: { increment: 1 } } }),
      ]);
      await notifyCredit({ userId: ctx.user.id, type: "debit", amount: 1, reason: "designer_contact_unlock" });

      return { phone: designer.phone, email: designer.email, companyName: designer.companyName };
    }),

  // View tracking — mirrors propertyViews.record, called on unmount from the detail page.
  recordView: publicProcedure
    .input(
      z.object({
        designerId: cuidSchema,
        durationSec: z.number().int().min(0).max(86_400).optional(),
        contactUnlocked: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const designer = await prisma.interiorDesigner.findFirst({
        where: { id: input.designerId },
        select: { id: true },
      });
      if (!designer) throw new TRPCError({ code: "NOT_FOUND", message: "Designer not found." });

      await prisma.$transaction([
        prisma.interiorDesignerView.create({
          data: {
            designerId: input.designerId,
            userId: ctx.user?.id ?? null,
            durationSec: input.durationSec ?? 0,
            contactUnlocked: input.contactUnlocked ?? false,
          },
        }),
        prisma.interiorDesigner.update({ where: { id: input.designerId }, data: { views: { increment: 1 } } }),
      ]);

      return { ok: true };
    }),
});

export { makeSlug as makeInteriorDesignerSlug };
