// Web Push send helpers (LA-332). VAPID keys come from env; the same public key
// must also be exposed to the browser as NEXT_PUBLIC_VAPID_PUBLIC_KEY so it can
// subscribe. This module owns the actual send loop so both the admin broadcast
// router and the automatic "new listing" trigger share one implementation.
import webpush from "web-push";
import prisma from "@nxtsft/db";
import { formatPrice } from "@nxtsft/shared/utils";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:support@nxtsft.com";

let configured = false;

// Sets the VAPID details once, on first send. Returns false when the keys are
// absent so callers can no-op gracefully instead of throwing (mirrors
// sendTemplateIfConfigured for WhatsApp).
function ensureConfigured(): boolean {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  if (!configured) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    configured = true;
  }
  return true;
}

// Whether web push can actually send — lets the admin broadcast surface a clear
// "not configured" error while the fire-and-forget triggers just no-op.
export function pushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  image?: string;
  tag?: string;
};

export type PushResult = { sent: number; failed: number; pruned: number };

// Send a payload to every stored subscription, pruning endpoints the push
// service reports as gone (404/410). No-ops (sent:0) when VAPID is unconfigured.
export async function sendPushToAll(payload: PushPayload): Promise<PushResult> {
  if (!ensureConfigured()) return { sent: 0, failed: 0, pruned: 0 };

  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return { sent: 0, failed: 0, pruned: 0 };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    image: payload.image,
    tag: payload.tag ?? "nxtsft-broadcast",
  });

  let sent = 0;
  let failed = 0;
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
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
}

// Fire-and-forget: notify every subscriber that a listing just went live. Safe to
// `void` from any publish path — it never throws and no-ops when push is
// unconfigured. Guards on status === "Active" so it can't fire for a test/dummy
// (status "Test") or still-pending listing even if called by mistake.
export async function notifyNewProperty(propertyId: string): Promise<void> {
  try {
    if (!pushConfigured()) return;

    const property = await prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      select: {
        title: true,
        slug: true,
        type: true,
        bhk: true,
        price: true,
        status: true,
        images: true,
        location: { select: { locality: true, city: true } },
      },
    });
    if (!property || property.status !== "Active") return;

    const area = property.location?.locality || property.location?.city || "your city";
    const detail = [property.bhk, property.type].filter(Boolean).join(" ");
    const body = `${[detail, formatPrice(Number(property.price))].filter(Boolean).join(" · ")} — tap to view`;

    await sendPushToAll({
      title: `New property in ${area}`,
      body,
      url: `/properties/${property.slug}`,
      image: property.images?.[0],
      // Per-property tag so a new-listing push never collapses onto the admin
      // broadcast's notification (or another listing's).
      tag: `new-property-${propertyId}`,
    });
  } catch {
    // Best-effort: a push failure must never affect the publish that triggered it.
  }
}
