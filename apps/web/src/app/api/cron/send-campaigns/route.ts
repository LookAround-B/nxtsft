import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import prisma from "@nxtsft/db";
import { sendWhatsAppTemplate, bhashConfigured } from "@nxtsft/trpc/bhashsms";
import { audienceWhere, substituteParams, type Audience } from "@nxtsft/trpc/waBroadcast";

// Drains queued WhatsApp broadcasts (admin campaign sender). Hit from an external
// scheduler every 1-2 min with `Authorization: Bearer $CRON_SECRET` (same model
// as the other cron routes). Each tick processes ONE broadcast's next batch, so
// a big blast drains over many ticks without any long-running request — the
// throttle is BATCH × cron frequency (no in-function sleeps → timeout-safe).

export const dynamic = "force-dynamic";

// Recipients sent per cron tick. Small enough to finish well under the function
// timeout; the scheduler frequency controls the overall send rate.
const BATCH = 40;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!bhashConfigured()) {
    return NextResponse.json({ ok: true, skipped: "BhashSMS not configured" });
  }

  // Oldest still-running broadcast (queued or mid-send). One per tick.
  const broadcast = await prisma.waBroadcast.findFirst({
    where: { status: { in: ["queued", "sending"] } },
    orderBy: { createdAt: "asc" },
  });
  if (!broadcast) {
    return NextResponse.json({ ok: true, idle: true });
  }

  if (broadcast.status === "queued") {
    await prisma.waBroadcast.update({ where: { id: broadcast.id }, data: { status: "sending" } });
  }

  const base = audienceWhere(broadcast.audience as Audience);
  // Resume after the last processed id (cursor). Ordered by id so it's stable.
  const where = broadcast.cursor ? { ...base, id: { gt: broadcast.cursor } } : base;
  const recipients = await prisma.user.findMany({
    where,
    select: { id: true, name: true, city: true, phone: true },
    orderBy: { id: "asc" },
    take: BATCH,
  });

  const params = (broadcast.params as string[]) ?? [];
  let sent = 0;
  let failed = 0;
  let lastId = broadcast.cursor;

  for (const u of recipients) {
    lastId = u.id;
    if (!u.phone) {
      failed++;
      continue;
    }
    const res = await sendWhatsAppTemplate({
      to: u.phone,
      template: broadcast.templateName,
      params: substituteParams(params, u),
    });
    if (res.sent) sent++;
    else failed++;
  }

  const done = recipients.length < BATCH; // exhausted the audience
  await prisma.waBroadcast.update({
    where: { id: broadcast.id },
    data: {
      sent: { increment: sent },
      failed: { increment: failed },
      cursor: lastId,
      status: done ? "completed" : "sending",
    },
  });

  return NextResponse.json({
    ok: true,
    broadcast: broadcast.id,
    processed: recipients.length,
    sent,
    failed,
    done,
  });
}
