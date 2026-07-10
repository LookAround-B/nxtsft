import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { buildDailyLeadReport } from "@nxtsft/trpc/dailyLeadReport";

// Daily 9AM lead report (LA-342). Same auth model as expire-boosts: nothing
// schedules this in-repo — hit it from any external scheduler (cron-job.org,
// GitHub Action, Vercel cron once on Pro) at 09:00 IST with
// `Authorization: Bearer $CRON_SECRET`.
//
// `?format=csv` returns the report as a CSV download; the default JSON
// response carries the summary plus the CSV string so an external sender can
// forward it over WhatsApp/email until that delivery channel exists (LA-341).

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

  const report = await buildDailyLeadReport();

  if (req.nextUrl.searchParams.get("format") === "csv") {
    // \uFEFF BOM so Excel decodes as UTF-8 (same as lib/download-csv).
    return new NextResponse("\uFEFF" + report.csv, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${report.filename}"`,
      },
    });
  }

  return NextResponse.json(report);
}
