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
import { ensureDummyLeadsAssigned } from "../dummyLeads";
import { notify, notifyAdmins } from "../notify";

const filter = z.object({ propertyId: cuidSchema.optional() }).optional();
const propertyInput = z.object({ propertyId: cuidSchema });

// Fires at most once per seller (see the repContactId ledger check in
// escalateHighEngagementSeller) — a free seller whose total clicks across
// their dummy leads crosses this crosses into "ready for a call".
const DUMMY_LEAD_ENGAGEMENT_THRESHOLD = 2;

async function escalateHighEngagementSeller(sellerId: string, triggeringRowId: string): Promise<void> {
  // Fire at most once per seller. Without this, every click past the
  // threshold would re-upsert and re-notify, spamming the rep's bell.
  const already = await prisma.dummyLeadAssignment.findFirst({
    where: { sellerId, repContactId: { not: null } },
    select: { id: true },
  });
  if (already) return;

  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: { id: true, name: true, phone: true, email: true, city: true },
  });
  if (!seller?.phone) {
    // RepContact.phone is required and is the dedup key — no fallback upsert
    // is possible. Tell ops rather than silently dropping the signal.
    await notifyAdmins({
      type: "dummy_lead_high_engagement_no_phone",
      title: "High-intent free seller has no phone on file",
      content: `${seller?.name ?? sellerId} crossed the dummy-lead engagement threshold but has no phone; can't create a RepContact.`,
      hash: "sellers",
    });
    return;
  }

  const ownerId = process.env.DUMMY_LEAD_TRIAGE_REP_ID;
  if (!ownerId) {
    // Fail closed, but never silently: an unset env var disables the entire
    // staff-follow-up half of this feature. The repContactId ledger check
    // above keeps this from firing per-click.
    await notifyAdmins({
      type: "dummy_lead_triage_rep_unset",
      title: "DUMMY_LEAD_TRIAGE_REP_ID is not configured",
      content:
        "A free seller crossed the dummy-lead engagement threshold but no triage rep is configured, so no RepContact was created.",
      hash: "config",
    });
    return;
  }

  const contact = await prisma.repContact.upsert({
    where: { ownerId_phone: { ownerId, phone: seller.phone } },
    create: {
      ownerId,
      name: seller.name,
      phone: seller.phone,
      email: seller.email,
      city: seller.city,
      interest: "High-intent free-plan seller — crossed dummy-lead engagement threshold",
      source: "dummy_lead_signal",
      status: "New",
      callbackAt: new Date(), // surfaces immediately in repContacts.list's callbackAt-first ordering
    },
    update: {}, // don't reset status/callbackAt if a rep is already working it
  });
  await prisma.dummyLeadAssignment.update({
    where: { id: triggeringRowId },
    data: { repContactId: contact.id },
  });
  await notify({
    userId: ownerId,
    type: "dummy_lead_high_engagement",
    title: "High-intent free seller ready for a call",
    content: `${seller.name} has been added to your contacts — repeatedly viewed masked buyer leads without upgrading.`,
    actionUrl: "/sales-portal#contacts",
  });
}

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
  // Free-plan conversion-urgency teaser: fabricated buyer leads shown to
  // sellers who don't yet have paid contact access. Deliberately a separate
  // query from `leads` (not merged into its response), so the two can never
  // be confused in the UI and a paying seller's real-lead flow stays
  // untouched by anything here.
  dummyLeads: protectedProcedure.input(filter).query(async ({ input, ctx }) => {
    // The load-bearing correctness guard: a paying seller must never see
    // fabricated leads, on any listing, via any payment path (including one
    // added after this code is written). Gating on live entitlement — rather
    // than relying on every payment webhook having been caught — is what
    // guarantees that, independent of whether suppressedAt got set anywhere.
    if (await hasSellerContactAccess(ctx.user.id)) return { items: [] };

    const full = await prisma.property.findMany({
      where: {
        ownerId: ctx.user.id,
        deletedAt: null,
        freeListing: true,
        status: "Active",
        ...(input?.propertyId ? { id: input.propertyId } : {}),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        location: { select: { city: true, state: true } },
      },
    });
    if (input?.propertyId && !full.length)
      throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found." });

    await ensureDummyLeadsAssigned(full.map((p) => ({ ...p, sellerId: ctx.user.id })));

    const rows = await prisma.dummyLeadAssignment.findMany({
      where: { propertyId: { in: full.map((p) => p.id) }, suppressedAt: null },
      include: { dummyBuyer: { select: { name: true, phone: true, email: true } } },
      orderBy: { assignedAt: "desc" },
    });
    const propertyById = new Map(full.map((p) => [p.id, p]));
    return {
      items: rows.map((row) => ({
        id: row.id,
        property: propertyById.get(row.propertyId),
        createdAt: row.assignedAt,
        ...maskContact(
          { name: row.dummyBuyer.name, phone: row.dummyBuyer.phone, email: row.dummyBuyer.email },
          false, // dummy leads are always masked, never unlockable
        ),
      })),
    };
  }),
  trackDummyLeadClick: protectedProcedure
    .use(generalRateLimit)
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const row = await prisma.dummyLeadAssignment.findFirst({
        where: { id: input.id, sellerId: ctx.user.id, suppressedAt: null },
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      await prisma.dummyLeadAssignment.update({
        where: { id: row.id },
        data: { clickCount: { increment: 1 }, lastClickedAt: new Date() },
      });

      const agg = await prisma.dummyLeadAssignment.aggregate({
        where: { sellerId: ctx.user.id, suppressedAt: null },
        _sum: { clickCount: true },
      });
      if ((agg._sum.clickCount ?? 0) > DUMMY_LEAD_ENGAGEMENT_THRESHOLD) {
        // Never let a sales-side signal break the seller's click — a
        // stale/misconfigured triage rep id would otherwise surface as a
        // failed mutation on a buyer-facing button.
        try {
          await escalateHighEngagementSeller(ctx.user.id, row.id);
        } catch {
          // swallow — escalation is non-critical to the click
        }
      }
      return { ok: true };
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
