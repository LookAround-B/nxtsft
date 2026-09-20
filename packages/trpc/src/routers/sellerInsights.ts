import { z } from "zod";
import { TRPCError } from "@trpc/server";
import prisma from "@nxtsft/db";
import { router, publicProcedure, protectedProcedure, generalRateLimit } from "../server";
import { cuidSchema } from "../sanitize";
import {
  hasSellerContactAccess,
  listingInsights,
  ownedSellerProperties,
  buyerLeadWhere,
} from "../sellerInsights";
import { maskContact } from "../sellerContactPolicy";

const filter = z.object({ propertyId: cuidSchema.optional() }).optional();
const propertyInput = z.object({ propertyId: cuidSchema });

export const sellerInsightsRouter = router({
  publicMetrics: publicProcedure.input(propertyInput).query(async ({ input }) => {
    const property = await prisma.property.findFirst({
      where: { id: input.propertyId, status: "Active", deletedAt: null },
      select: { id: true },
    });
    if (!property) throw new TRPCError({ code: "NOT_FOUND" });
    return listingInsights([property.id]);
  }),
  metrics: protectedProcedure.input(filter).query(async ({ input, ctx }) => {
    const properties = await ownedSellerProperties(ctx.user.id, input?.propertyId);
    return listingInsights(properties.map((p) => p.id));
  }),
  leads: protectedProcedure.input(filter).query(async ({ input, ctx }) => {
    const [properties, unlocked] = await Promise.all([
      ownedSellerProperties(ctx.user.id, input?.propertyId),
      hasSellerContactAccess(ctx.user.id),
    ]);
    const ids = properties.map((p) => p.id);
    const where = { propertyId: { in: ids } };
    const [leads, unlocks, visits, shares, seller] = await Promise.all([
      prisma.lead.findMany({
        where: { ...where, ...buyerLeadWhere },
        select: {
          id: true,
          propertyId: true,
          buyerUserId: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.creditTransaction.findMany({
        where: { ...where, reason: "contact_unlock" },
        select: { id: true, propertyId: true, userId: true, createdAt: true },
      }),
      prisma.siteVisit.findMany({
        where,
        select: { id: true, propertyId: true, userId: true, createdAt: true, status: true },
      }),
      prisma.sellerContactShare.findMany({
        where: { sellerId: ctx.user.id, propertyId: { in: ids } },
      }),
      prisma.user.findUnique({ where: { id: ctx.user.id }, select: { phone: true } }),
    ]);
    const buyerIds = [
      ...new Set(
        [
          ...leads.map((l) => l.buyerUserId),
          ...unlocks.map((u) => u.userId),
          ...visits.map((v) => v.userId),
        ].filter((id): id is string => !!id),
      ),
    ];
    const buyers = await prisma.user.findMany({
      where: { id: { in: buyerIds }, active: true },
      select: { id: true, name: true, phone: true, email: true },
    });
    const buyerById = new Map(buyers.map((b) => [b.id, b]));
    const propertyById = new Map(properties.map((p) => [p.id, p]));
    const rows = [
      ...leads.map((l) => ({ ...l, kind: "enquiry" as const, buyerId: l.buyerUserId })),
      ...unlocks.map((u) => ({
        ...u,
        kind: "unlock" as const,
        status: "Contact unlocked",
        buyerId: u.userId,
        name: buyerById.get(u.userId)?.name ?? "Buyer",
        phone: buyerById.get(u.userId)?.phone,
        email: buyerById.get(u.userId)?.email,
      })),
      ...visits.map((v) => ({
        ...v,
        kind: "visit" as const,
        status: v.status === "Cancelled" ? "Visit cancelled" : `Site visit · ${v.status}`,
        buyerId: v.userId,
        name: buyerById.get(v.userId)?.name ?? "Buyer",
        phone: buyerById.get(v.userId)?.phone,
        email: buyerById.get(v.userId)?.email,
      })),
    ];
    return {
      unlocked,
      properties,
      items: rows
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((row) => {
          const contact = maskContact(
            { name: row.name, phone: row.phone ?? null, email: row.email ?? null },
            unlocked,
          );
          const shared = shares.some(
            (s) => s.buyerId === row.buyerId && s.propertyId === row.propertyId,
          );
          const shareUnavailable =
            !row.buyerId || !buyerById.has(row.buyerId) || row.buyerId === ctx.user.id
              ? "No linked buyer account is available."
              : !seller?.phone
                ? "Add your phone number in Profile to share your contact."
                : null;
          return {
            id: row.id,
            kind: row.kind,
            status: row.status,
            createdAt: row.createdAt,
            property: propertyById.get(row.propertyId!),
            ...contact,
            shared,
            shareUnavailable,
          };
        }),
    };
  }),
  shareSellerContact: protectedProcedure
    .use(generalRateLimit)
    .input(z.object({ kind: z.enum(["enquiry", "unlock", "visit"]), id: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      if (!(await hasSellerContactAccess(ctx.user.id)))
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Activate a seller plan to share your contact.",
        });
      const request =
        input.kind === "enquiry"
          ? await prisma.lead
              .findFirst({
                where: { id: input.id, ...buyerLeadWhere },
                select: { propertyId: true, buyerUserId: true },
              })
              .then((l) => l && { propertyId: l.propertyId, buyerId: l.buyerUserId })
          : input.kind === "unlock"
            ? await prisma.creditTransaction
                .findFirst({
                  where: { id: input.id, reason: "contact_unlock" },
                  select: { propertyId: true, userId: true },
                })
                .then((u) => u && { propertyId: u.propertyId, buyerId: u.userId })
            : await prisma.siteVisit
                .findUnique({ where: { id: input.id }, select: { propertyId: true, userId: true } })
                .then((v) => v && { propertyId: v.propertyId, buyerId: v.userId });
      if (!request?.propertyId) throw new TRPCError({ code: "NOT_FOUND" });
      const [property] = await ownedSellerProperties(ctx.user.id, request.propertyId);
      if (!request.buyerId || request.buyerId === ctx.user.id)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No linked buyer account is available.",
        });
      const buyerId = request.buyerId;
      const [buyer, seller] = await Promise.all([
        prisma.user.findFirst({ where: { id: buyerId, active: true }, select: { id: true } }),
        prisma.user.findUnique({
          where: { id: ctx.user.id },
          select: { name: true, phone: true, email: true },
        }),
      ]);
      if (!buyer || !seller?.phone)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Buyer account or seller phone is unavailable.",
        });
      await prisma.$transaction(async (tx) => {
        const added = await tx.sellerContactShare.createMany({
          data: { sellerId: ctx.user.id, buyerId, propertyId: property!.id },
          skipDuplicates: true,
        });
        if (!added.count) return;
        // Deliberately not notify(): that best-effort helper swallows delivery failures.
        await tx.notification.create({
          data: {
            userId: buyerId,
            type: "lead_update",
            title: "Seller shared their contact",
            content: `${seller.name} shared their contact for ${property!.title}: ${seller.phone} · ${seller.email}`,
            actionUrl: `/properties/${property!.slug}`,
          },
        });
      });
      return { ok: true };
    }),
  watching: protectedProcedure.query(async ({ ctx }) =>
    prisma.propertyWatch.findMany({
      where: { userId: ctx.user.id, property: { deletedAt: null } },
      orderBy: { createdAt: "desc" },
      select: { property: { select: { id: true, title: true, slug: true, status: true } } },
    }),
  ),
  isWatching: protectedProcedure
    .input(propertyInput)
    .query(
      async ({ input, ctx }) =>
        !!(await prisma.propertyWatch.findUnique({
          where: { userId_propertyId: { userId: ctx.user.id, propertyId: input.propertyId } },
        })),
    ),
  setWatching: protectedProcedure
    .use(generalRateLimit)
    .input(propertyInput.extend({ watching: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (!input.watching) {
        await prisma.propertyWatch.deleteMany({
          where: { userId: ctx.user.id, propertyId: input.propertyId },
        });
        return { watching: false };
      }
      const property = await prisma.property.findFirst({
        where: { id: input.propertyId, status: "Active", deletedAt: null },
        select: { ownerId: true },
      });
      if (!property) throw new TRPCError({ code: "NOT_FOUND" });
      if (property.ownerId === ctx.user.id)
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot watch your own listing." });
      await prisma.propertyWatch.createMany({
        data: { userId: ctx.user.id, propertyId: input.propertyId },
        skipDuplicates: true,
      });
      return { watching: true };
    }),
});
