import { z } from "zod";
import { TRPCError } from "@trpc/server";
import prisma from "@nxtsft/db";
import { router, publicProcedure, adminProcedure, broadcastRateLimit, generalRateLimit } from "../server";
import { safeString } from "../sanitize";
import { sendPushToAll, pushConfigured } from "../push";

export const pushRouter = router({
  // Store a browser's push subscription. Public + rate-limited so a logged-out
  // visitor can opt in from the site-wide prompt (traffic-building goal); a
  // signed-in caller's id is attached for attribution. Idempotent on endpoint —
  // re-subscribing from the same browser just refreshes the keys.
  subscribe: publicProcedure
    .use(generalRateLimit)
    .input(
      z.object({
        endpoint: z.string().url().max(2000),
        keys: z.object({
          p256dh: safeString(255),
          auth: safeString(255),
        }),
        userAgent: safeString(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await prisma.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        create: {
          userId: ctx.user?.id ?? null,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          userAgent: input.userAgent,
        },
        update: {
          // Only (re)attach a user when one is signed in — an anonymous
          // re-subscribe from the same device must not wipe an existing
          // attribution.
          ...(ctx.user ? { userId: ctx.user.id } : {}),
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          userAgent: input.userAgent,
        },
      });
      return { ok: true };
    }),

  // Public: a device removing its own subscription by endpoint (the Profile
  // toggle and the site-wide prompt both call this). Endpoints are opaque and
  // device-held, so this is safe without auth.
  unsubscribe: publicProcedure
    .input(z.object({ endpoint: z.string().url().max(2000) }))
    .mutation(async ({ input }) => {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: input.endpoint } });
      return { ok: true };
    }),

  // Admin compose + broadcast (mirrors the Envato "Android App Notification"
  // screen — title/message/image/link). Sends to every stored subscription and
  // prunes endpoints the push service reports as gone (404/410).
  broadcast: adminProcedure
    .use(broadcastRateLimit)
    .input(
      z.object({
        title: safeString(120, 2),
        body: safeString(500, 1),
        url: z.string().url().max(2000).optional(),
        image: z.string().url().max(2000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!pushConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Web push is not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
        });
      }
      return sendPushToAll({
        title: input.title,
        body: input.body,
        url: input.url,
        image: input.image,
        tag: "nxtsft-broadcast",
      });
    }),

  // How many devices are currently subscribed — shown on the admin compose UI.
  stats: adminProcedure.query(async () => {
    const [devices, users] = await Promise.all([
      prisma.pushSubscription.count(),
      prisma.pushSubscription.findMany({ distinct: ["userId"], select: { userId: true } }),
    ]);
    return { devices, users: users.length };
  }),
});
