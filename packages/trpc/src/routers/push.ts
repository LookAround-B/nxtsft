import { z } from "zod";
import webpush from "web-push";
import { TRPCError } from "@trpc/server";
import prisma from "@nxtsft/db";
import { router, protectedProcedure, adminProcedure, broadcastRateLimit } from "../server";
import { safeString } from "../sanitize";

// Web Push (LA-332). VAPID keys come from env; the same public key must also be
// exposed to the browser as NEXT_PUBLIC_VAPID_PUBLIC_KEY so it can subscribe.
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:support@nxtsft.com";

let configured = false;
function ensureConfigured() {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Web push is not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
    });
  }
  if (!configured) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    configured = true;
  }
}

export const pushRouter = router({
  // Store a browser's push subscription for the current user. Idempotent on
  // endpoint — re-subscribing from the same browser just refreshes the keys.
  subscribe: protectedProcedure
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
          userId: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          userAgent: input.userAgent,
        },
        update: {
          userId: ctx.user.id,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          userAgent: input.userAgent,
        },
      });
      return { ok: true };
    }),

  unsubscribe: protectedProcedure
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
      ensureConfigured();

      const subs = await prisma.pushSubscription.findMany();
      if (subs.length === 0) return { sent: 0, failed: 0, pruned: 0 };

      const payload = JSON.stringify({
        title: input.title,
        body: input.body,
        url: input.url ?? "/",
        image: input.image,
        tag: "nxtsft-broadcast",
      });

      let sent = 0;
      let failed = 0;
      const dead: string[] = [];

      await Promise.all(
        subs.map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              payload,
            );
            sent++;
          } catch (err) {
            failed++;
            const status = (err as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) dead.push(s.endpoint);
          }
        }),
      );

      if (dead.length) {
        await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: dead } } });
      }

      return { sent, failed, pruned: dead.length };
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
