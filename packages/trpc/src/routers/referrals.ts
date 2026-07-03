import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, protectedProcedure, adminProcedure } from "../server";
import {
  cuidSchema,
  nameSchema,
  phoneSchema,
  geoTextSchema,
  safeString,
  safeUrlSchema,
  pageSchema,
  limitSchema,
} from "../sanitize";

const REFERRAL_TYPES = ["buyer_tenant", "property_owner", "board"] as const;
type ReferralType = (typeof REFERRAL_TYPES)[number];

// Snapshotted onto each submission at creation time so a later rate change
// never retroactively alters what's owed on an already-submitted row.
const REFERRAL_REWARDS: Record<ReferralType, number> = {
  buyer_tenant: 500,
  property_owner: 120,
  board: 100,
};

export const referralsRouter = router({
  // Submit a "3 Ways to Earn" card. A photo is mandatory for "board" (there's
  // nothing to verify otherwise); optional for the other two types.
  submit: protectedProcedure
    .input(
      z.object({
        type: z.enum(REFERRAL_TYPES),
        customerName: nameSchema,
        customerPhone: phoneSchema,
        location: geoTextSchema.optional(),
        requirements: safeString(2000).optional(),
        imageUrl: safeUrlSchema.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.type === "board" && !input.imageUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A photo of the board is required for this submission type.",
        });
      }

      // A buyer/tenant referral becomes a real Lead so sales reps see it in
      // their normal pipeline — it has no property yet (propertyId is
      // optional on Lead precisely for this case), reps work out the fit.
      let leadId: string | undefined;
      if (input.type === "buyer_tenant") {
        const lead = await prisma.lead.create({
          data: {
            userId: ctx.user.id,
            name: input.customerName,
            phone: input.customerPhone,
            city: input.location,
            interest: input.requirements,
            source: "Referral",
            status: "New",
          },
        });
        leadId = lead.id;
      }

      return prisma.referralSubmission.create({
        data: {
          submitterId: ctx.user.id,
          type: input.type,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          location: input.location,
          requirements: input.requirements,
          imageUrl: input.imageUrl,
          rewardAmount: REFERRAL_REWARDS[input.type],
          leadId,
        },
      });
    }),

  // Own submissions + rolled-up stats — powers the user-facing Refer & Earn tab.
  // There's no withdrawal/redemption flow yet, so wallet balance is simply the
  // lifetime sum of approved rewards.
  myOverview: protectedProcedure.query(async ({ ctx }) => {
    const submissions = await prisma.referralSubmission.findMany({
      where: { submitterId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const totalReferrals = submissions.length;
    const pendingRewards = submissions
      .filter((s) => s.status === "Pending")
      .reduce((sum, s) => sum + s.rewardAmount, 0);
    const paidOut = submissions
      .filter((s) => s.status === "Approved")
      .reduce((sum, s) => sum + s.rewardAmount, 0);

    return {
      totalReferrals,
      pendingRewards,
      paidOut,
      walletBalance: paidOut,
      recent: submissions.map((s) => ({
        id: s.id,
        type: s.type,
        customerName: s.customerName,
        status: s.status,
        rewardAmount: s.rewardAmount,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }),

  // Top referrers leaderboard — shared by the user Refer & Earn tab and the
  // admin Referrals tab.
  topReferrers: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(5) }))
    .query(async ({ input }) => {
      const grouped = await prisma.referralSubmission.groupBy({
        by: ["submitterId"],
        where: { status: "Approved" },
        _sum: { rewardAmount: true },
        _count: { _all: true },
      });
      const sorted = grouped
        .sort((a, b) => (b._sum.rewardAmount ?? 0) - (a._sum.rewardAmount ?? 0))
        .slice(0, input.limit);

      const users = await prisma.user.findMany({
        where: { id: { in: sorted.map((g) => g.submitterId) } },
        select: { id: true, name: true, city: true },
      });
      const userById = new Map(users.map((u) => [u.id, u]));

      return sorted.map((g, i) => ({
        rank: i + 1,
        name: userById.get(g.submitterId)?.name ?? "Unknown",
        city: userById.get(g.submitterId)?.city ?? "",
        refs: g._count._all,
        earned: g._sum.rewardAmount ?? 0,
      }));
    }),

  // ── Admin review queue ──────────────────────────────────────────────────

  list: adminProcedure
    .input(
      z.object({
        status: z.enum(["Pending", "Approved", "Rejected"]).optional(),
        type: z.enum(REFERRAL_TYPES).optional(),
        page: pageSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { status, type, page, limit } = input;
      const where: NonNullable<Parameters<typeof prisma.referralSubmission.findMany>[0]>["where"] = {};
      if (status) where.status = status;
      if (type) where.type = type;

      const items = await prisma.referralSubmission.findMany({
        where,
        include: { submitter: { select: { id: true, name: true, city: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      });
      const total = await prisma.referralSubmission.count({ where });
      return { items, page, totalPages: Math.max(1, Math.ceil(total / limit)), total };
    }),

  stats: adminProcedure.query(async () => {
    const [total, pending, approvedAgg] = await Promise.all([
      prisma.referralSubmission.count(),
      prisma.referralSubmission.count({ where: { status: "Pending" } }),
      prisma.referralSubmission.aggregate({ where: { status: "Approved" }, _sum: { rewardAmount: true } }),
    ]);
    return { total, pending, totalPaidOut: approvedAgg._sum.rewardAmount ?? 0 };
  }),

  // Approve credits the referrer's wallet (via the derived-balance queries
  // above); reject just records the decision. Either way the submitter is
  // notified.
  review: adminProcedure
    .input(z.object({ id: cuidSchema, decision: z.enum(["Approved", "Rejected"]) }))
    .mutation(async ({ input, ctx }) => {
      const submission = await prisma.referralSubmission.findUnique({ where: { id: input.id } });
      if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found." });
      if (submission.status !== "Pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This submission has already been reviewed." });
      }

      const updated = await prisma.referralSubmission.update({
        where: { id: input.id },
        data: { status: input.decision, reviewedById: ctx.user.id, reviewedAt: new Date() },
      });

      await prisma.notification.create({
        data: {
          userId: submission.submitterId,
          type: "system",
          title: input.decision === "Approved" ? "Referral approved!" : "Referral submission rejected",
          content:
            input.decision === "Approved"
              ? `Your referral for ${submission.customerName} was approved — ₹${submission.rewardAmount} added to your wallet.`
              : `Your referral for ${submission.customerName} wasn't approved this time.`,
        },
      });

      return updated;
    }),
});
