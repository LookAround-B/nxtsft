import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sweepListingValidity } from "@nxtsft/trpc/listingExpiry";

// Listing-validity sweep for rep-assisted sales (CRM V3). Hit once a day from
// an external scheduler with `Authorization: Bearer $CRON_SECRET`, same as the
// other cron routes.
//
// Warns 3 days out, then unpublishes the listing and marks the lead Expired.
// Safe to run more often than daily — the sweep is driven by lead status
// transitions, so nothing is warned or expired twice.

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
  const result = await sweepListingValidity();
  return NextResponse.json({ ok: true, ...result });
}
