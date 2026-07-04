import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { notifyCredit } from "../notify";
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
function serializeStore<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? Number(v) : v)));
}

export const decorStoresRouter = router({
  // ── Public directory procedures ────────────────────────────────────────

  publicList: publicProcedure
    .input(
      z.object({
        search:        searchSchema.optional(),
        city:          geoTextSchema.optional(),
        decorCategory: safeString(60).optional(),
        maxBudget:     z.number().int().positive().max(999_999_999_999).optional(),
        sort:          z.enum(["featured", "latest", "popular", "budget_low"]).default("featured"),
        page:          pageSchema,
        limit:         limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { search, city, decorCategory, maxBudget, sort, page, limit } = input;
      const where: NonNullable<Parameters<typeof prisma.decorStore.findMany>[0]>["where"] = {
        status: "active",
      };
      if (city) where.city = { contains: city, mode: "insensitive" };
      if (decorCategory) where.decorCategories = { has: decorCategory };
      if (maxBudget != null) where.startingBudget = { lte: BigInt(maxBudget) };
      if (search) {
        where.OR = [
          { companyName: { contains: search, mode: "insensitive" } },
          { city:        { contains: search, mode: "insensitive" } },
          { areasServed: { has: search } },
        ];
      }

      const orderBy: NonNullable<Parameters<typeof prisma.decorStore.findMany>[0]>["orderBy"] =
        sort === "latest"     ? [{ createdAt: "desc" }, { id: "asc" }]
        : sort === "popular"    ? [{ views: "desc" }, { id: "asc" }]
        : sort === "budget_low" ? [{ startingBudget: "asc" }, { id: "asc" }]
        : [{ verified: "desc" }, { projectsCompleted: "desc" }, { id: "asc" }];

      const items = await prisma.decorStore.findMany({
        where,
        orderBy,
        take: limit,
        skip: (page - 1) * limit,
      });
      const total = await prisma.decorStore.count({ where });
      return {
        items: items.map(serializeStore),
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        total,
      };
    }),

  publicGet: publicProcedure
    .input(z.object({ slug: safeString(300, 1) }))
    .query(async ({ input }) => {
      const store = await prisma.decorStore.findFirst({
        where: { slug: input.slug, status: "active" },
      });
      if (!store) return null;
      // Contact fields are credit-gated — never sent on the public read.
      const { phone: _phone, email: _email, ...safe } = store;
      return serializeStore(safe);
    }),

  // Similar stores — same city first, then shared decor categories. Excludes self.
  similar: publicProcedure
    .input(z.object({ slug: safeString(300, 1), limit: z.number().int().min(1).max(12).default(4) }))
    .query(async ({ input }) => {
      const base = await prisma.decorStore.findFirst({
        where: { slug: input.slug, status: "active" },
        select: { id: true, city: true, decorCategories: true },
      });
      if (!base) return [];
      const items = await prisma.decorStore.findMany({
        where: {
          status: "active",
          id: { not: base.id },
          OR: [
            { city: { equals: base.city, mode: "insensitive" } },
            ...(base.decorCategories.length ? [{ decorCategories: { hasSome: base.decorCategories } }] : []),
          ],
        },
        orderBy: [{ verified: "desc" }, { projectsCompleted: "desc" }, { id: "asc" }],
        take: input.limit,
      });
      return items.map(serializeStore);
    }),

  // Self-serve business submission — any signed-in user can submit their own
  // decor store. Always lands as status "pending" (model default) so it stays
  // out of the public directory until an admin approves it via the DecorTab
  // review queue (mirrors admin.decorStores.create).
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
        decorCategories: amenitiesSchema.optional(),
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
      while (await prisma.decorStore.findUnique({ where: { slug } })) slug = `${base}-${n++}`;

      const { startingBudget, ...rest } = input;
      const store = await prisma.decorStore.create({
        data: {
          ...rest,
          slug,
          startingBudget: startingBudget != null ? BigInt(startingBudget) : null,
        },
      });
      return { id: store.id, slug: store.slug };
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
      const store = await prisma.decorStore.findFirst({
        where: { id: input.id },
        select: { companyName: true, slug: true },
      });
      if (!store) throw new TRPCError({ code: "NOT_FOUND", message: "Store not found." });

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
          name: input.name || "Decor Store Report",
          email: "report@nxtsft.local",
          phone: input.phone,
          message: `[${REASON_LABEL[input.reason]}] reported on decor store "${store.companyName}" (/decor/${store.slug}).${contact}`,
          source: "Report",
          status: "New",
        },
      });
      return { ok: true };
    }),

  // Reveal a store's phone/email — costs 1 credit, mirrors properties.unlockContact.
  unlockContact: protectedProcedure
    .use(contactRateLimit)
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const store = await prisma.decorStore.findFirst({
        where: { id: input.id, status: "active" },
        select: { id: true, phone: true, email: true, companyName: true },
      });
      if (!store) throw new TRPCError({ code: "NOT_FOUND", message: "Store not found." });

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
            reason: "decor_contact_unlock",
            decorStoreId: input.id,
          },
        }),
        prisma.decorStore.update({ where: { id: input.id }, data: { contacts: { increment: 1 } } }),
      ]);
      await notifyCredit({ userId: ctx.user.id, type: "debit", amount: 1, reason: "decor_contact_unlock" });

      return { phone: store.phone, email: store.email, companyName: store.companyName };
    }),

  // View tracking — mirrors propertyViews.record, called on unmount from the detail page.
  recordView: publicProcedure
    .input(
      z.object({
        storeId: cuidSchema,
        durationSec: z.number().int().min(0).max(86_400).optional(),
        contactUnlocked: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const store = await prisma.decorStore.findFirst({
        where: { id: input.storeId },
        select: { id: true },
      });
      if (!store) throw new TRPCError({ code: "NOT_FOUND", message: "Store not found." });

      await prisma.$transaction([
        prisma.decorStoreView.create({
          data: {
            storeId: input.storeId,
            userId: ctx.user?.id ?? null,
            durationSec: input.durationSec ?? 0,
            contactUnlocked: input.contactUnlocked ?? false,
          },
        }),
        prisma.decorStore.update({ where: { id: input.storeId }, data: { views: { increment: 1 } } }),
      ]);

      return { ok: true };
    }),
});

export { makeSlug as makeDecorStoreSlug };
