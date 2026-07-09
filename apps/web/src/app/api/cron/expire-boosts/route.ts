import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sweepExpiredBoosts } from "@nxtsft/trpc/boostSweep";

// Manual/ops trigger to retire lapsed listing boosts immediately.
//
// Nothing schedules this. The sweep normally runs off the read path (see
// sweepExpiredBoosts), which needs no cron, no CRON_SECRET, and no Vercel Pro
// plan. This route exists for the case where you want the sweep to happen right
// now — e.g. a site with no traffic, or verifying behaviour by hand.
//
// Requires `Authorization: Bearer $CRON_SECRET`. With CRON_SECRET unset the
// route is simply disabled; it never falls open.

export const dynamic = "force-dynamic";

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
  const expired = await sweepExpiredBoosts({ force: true });
  return NextResponse.json({ expired });
}
