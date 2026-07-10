import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import prisma from "@nxtsft/db";
import { sendWhatsAppTemplate, waConfigured } from "@nxtsft/trpc/whatsapp";

// WhatsApp signup nudges (LA-341). Hit from an external scheduler every
// 15-30 min with `Authorization: Bearer $CRON_SECRET` (same model as the
// other cron routes). Sending times are the scheduler's job — the brief
// wants sends inside 6-10AM / 7-9PM IST windows, so schedule the trigger
// accordingly.
//
// Two nudges, only for users who ticked WhatsApp opt-in at signup:
//   1. `nxtsft_owner_welcome`  — 10+ min after signup, still unpaid.
//   2. `nxtsft_followup_48hr`  — 48+ h after signup, still unpaid.
// Each is recorded in user.metadata.waNudges so it never repeats, and both
// require the Meta templates to be approved (docs/whatsapp-templates.md).

export const dynamic = "force-dynamic";

const SITE = "https://www.nxtsft.com";
const LIST_URL = `${SITE}/list-property`;
const BADGE_PREVIEW = `${SITE}/images/listing-preview-badge.jpg`;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed

  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Meta = { waOptIn?: boolean; waNudges?: { welcome?: string; followup48?: string } } & Record<string, unknown>;

async function hasPaid(userId: string): Promise<boolean> {
  const paid = await prisma.payment.count({ where: { userId, status: "Success" } });
  return paid > 0;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!waConfigured()) {
    return NextResponse.json({ ok: true, skipped: "WhatsApp API not configured" });
  }

  const now = Date.now();
  const candidates = await prisma.user.findMany({
    where: {
      metadata: { path: ["waOptIn"], equals: true },
      phone: { not: null },
      createdAt: { lte: new Date(now - 10 * 60 * 1000) },
    },
    select: { id: true, name: true, phone: true, metadata: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  let welcome = 0;
  let followup = 0;

  for (const user of candidates) {
    const meta = (user.metadata ?? {}) as Meta;
    const nudges = meta.waNudges ?? {};
    const firstName = user.name.split(" ")[0] || user.name;

    if (!nudges.welcome) {
      if (await hasPaid(user.id)) continue;
      const res = await sendWhatsAppTemplate({
        to: user.phone!,
        template: "nxtsft_owner_welcome",
        headerImageUrl: BADGE_PREVIEW,
        bodyParams: [firstName, BADGE_PREVIEW, LIST_URL],
      });
      if (res.sent) {
        welcome++;
        await prisma.user.update({
          where: { id: user.id },
          data: { metadata: { ...meta, waNudges: { ...nudges, welcome: new Date().toISOString() } } },
        });
      }
      continue;
    }

    const age = now - user.createdAt.getTime();
    if (!nudges.followup48 && age >= 48 * 60 * 60 * 1000) {
      if (await hasPaid(user.id)) continue;
      const res = await sendWhatsAppTemplate({
        to: user.phone!,
        template: "nxtsft_followup_48hr",
        bodyParams: [firstName, LIST_URL],
      });
      if (res.sent) {
        followup++;
        await prisma.user.update({
          where: { id: user.id },
          data: { metadata: { ...meta, waNudges: { ...nudges, followup48: new Date().toISOString() } } },
        });
      }
    }
  }

  return NextResponse.json({ ok: true, candidates: candidates.length, welcome, followup });
}
