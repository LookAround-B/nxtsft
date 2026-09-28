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

// Referral payouts (boss 09-28): approved rewards are totalled per referrer,
// exported for a Razorpay bulk payout, and marked Paid once sent.
// Status flow: Pending → Approved (earned, in wallet) → Paid (sent to UPI).
// The payout UPI ID lives in User.metadata.upiId (no schema change).
const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
const upiOf = (metadata: unknown): string | null => {
  const v = (metadata as Record<string, unknown> | null)?.upiId;
  return typeof v === "string" && UPI_RE.test(v) ? v : null;
};
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
    const walletBalance = submissions
      .filter((s) => s.status === "Approved")
      .reduce((sum, s) => sum + s.rewardAmount, 0);
    const paidOut = submissions
      .filter((s) => s.status === "Paid")
      .reduce((sum, s) => sum + s.rewardAmount, 0);
    const me = await prisma.user.findUnique({ where: { id: ctx.user.id }, select: { metadata: true } });

    return {
      totalReferrals,
      pendingRewards,
      paidOut,
      walletBalance,
      upiId: upiOf(me?.metadata),
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
        where: { status: { in: ["Approved", "Paid"] } },
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
        status: z.enum(["Pending", "Approved", "Rejected", "Paid"]).optional(),
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
    const [total, pending, approvedAgg, paidAgg] = await Promise.all([
      prisma.referralSubmission.count(),
      prisma.referralSubmission.count({ where: { status: "Pending" } }),
      prisma.referralSubmission.aggregate({ where: { status: "Approved" }, _sum: { rewardAmount: true } }),
      prisma.referralSubmission.aggregate({ where: { status: "Paid" }, _sum: { rewardAmount: true } }),
    ]);
    return {
      total,
      pending,
      payable: approvedAgg._sum.rewardAmount ?? 0,
      totalPaidOut: paidAgg._sum.rewardAmount ?? 0,
    };
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
          actionUrl: "/user-portal#refer",
        },
      });

      return updated;
    }),

  // The signed-in user's UPI ID for referral payouts.
  setUpiId: protectedProcedure
    .input(z.object({ upiId: z.string().trim().max(300) }))
    .mutation(async ({ input, ctx }) => {
      const upiId = input.upiId.trim();
      if (upiId && !UPI_RE.test(upiId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid UPI ID, e.g. name@okaxis" });
      }
      const me = await prisma.user.findUnique({ where: { id: ctx.user.id }, select: { metadata: true } });
      const meta = { ...((me?.metadata as Record<string, unknown> | null) ?? {}) };
      if (upiId) meta.upiId = upiId;
      else delete meta.upiId;
      await prisma.user.update({ where: { id: ctx.user.id }, data: { metadata: meta as object } });
      return { upiId: upiId || null };
    }),

  // Admin: approved-but-unpaid rewards, totalled per referrer, for a Razorpay
  // bulk payout.
  payouts: adminProcedure.query(async () => {
    const rows = await prisma.referralSubmission.findMany({
      where: { status: "Approved" },
      select: { id: true, submitterId: true, rewardAmount: true },
    });
    const bySubmitter = new Map<string, { count: number; amount: number }>();
    for (const r of rows) {
      const cur = bySubmitter.get(r.submitterId) ?? { count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += r.rewardAmount;
      bySubmitter.set(r.submitterId, cur);
    }
    const users = bySubmitter.size
      ? await prisma.user.findMany({
          where: { id: { in: [...bySubmitter.keys()] } },
          select: { id: true, name: true, phone: true, email: true, role: true, metadata: true },
        })
      : [];
    return users
      .map((u) => ({
        userId: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        upiId: upiOf(u.metadata),
        referrals: bySubmitter.get(u.id)!.count,
        amount: bySubmitter.get(u.id)!.amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }),

  // Admin: after the Razorpay payout is sent, mark those referrers' approved
  // rewards Paid and tell each of them.
  markPaid: adminProcedure
    .input(z.object({ userIds: z.array(cuidSchema).min(1).max(500) }))
    .mutation(async ({ input, ctx }) => {
      let total = 0;
      for (const userId of input.userIds) {
        const approved = await prisma.referralSubmission.findMany({
          where: { submitterId: userId, status: "Approved" },
          select: { id: true, rewardAmount: true },
        });
        if (!approved.length) continue;
        const amount = approved.reduce((s, r) => s + r.rewardAmount, 0);
        await prisma.referralSubmission.updateMany({
          where: { id: { in: approved.map((r) => r.id) }, status: "Approved" },
          data: { status: "Paid", reviewedById: ctx.user.id, reviewedAt: new Date() },
        });
        await prisma.notification.create({
          data: {
            userId,
            type: "system",
            title: "Referral reward paid 🎉",
            content: `₹${amount.toLocaleString("en-IN")} has been sent to your UPI ID for ${approved.length} referral${approved.length > 1 ? "s" : ""}.`,
            actionUrl: "/user-portal#refer",
          },
        });
        total += amount;
      }
      return { ok: true, total };
    }),
});
