import prisma from "@nxtsft/db";
import { notify } from "./notify";

// Daily 9AM lead report (LA-342). Builds the previous 24h summary + a CSV of
// those leads, and pings every super-admin in-app. WhatsApp/email delivery of
// the CSV is intentionally not wired yet — it needs the Meta WA vendor
// credentials (LA-341); the cron route returns the CSV so an external sender
// can forward it in the meantime.

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function buildDailyLeadReport(): Promise<{
  summary: {
    windowStart: string;
    windowEnd: string;
    newLeads: number;
    paidLeads: number;
    revenueRupees: number;
    listed: number;
    paymentPending: number;
  };
  csv: string;
  filename: string;
}> {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  const [leads, paid] = await Promise.all([
    prisma.lead.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { property: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lead.findMany({
      where: { paymentDate: { gte: start, lte: end }, paymentStatus: "Paid" },
      select: { amount: true },
    }),
  ]);

  const revenueRupees = paid.reduce((s, l) => s + (l.amount ?? 0), 0);

  const headers = [
    "Lead ID", "Name", "Phone", "Email", "City", "Source", "Interest", "Property",
    "Status", "Plan", "Amount", "Payment Status", "Payment ID", "Submitted At",
  ];
  const rows = leads.map((l) => [
    l.id, l.name, l.phone, l.email ?? "", l.city ?? "", l.source ?? "", l.interest ?? "",
    l.property?.title ?? "", l.status, l.plan ?? "", l.amount ?? "", l.paymentStatus,
    l.paymentId ?? "", l.createdAt.toISOString(),
  ]);
  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

  const summary = {
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    newLeads: leads.length,
    paidLeads: paid.length,
    revenueRupees,
    listed: leads.filter((l) => l.status === "Listed").length,
    paymentPending: leads.filter((l) => l.status === "Payment Pending").length,
  };

  const superAdmins = await prisma.user.findMany({
    where: { role: "super-admin", active: true },
    select: { id: true },
  });
  await Promise.all(
    superAdmins.map((u) =>
      notify({
        userId: u.id,
        type: "lead_update",
        title: "Daily lead report",
        content: `${summary.newLeads} new lead${summary.newLeads === 1 ? "" : "s"}, ${summary.paidLeads} paid, ₹${revenueRupees.toLocaleString("en-IN")} collected in the last 24h.`,
        actionUrl: "/admin-portal",
      }),
    ),
  );

  const day = end.toISOString().slice(0, 10);
  return { summary, csv, filename: `NXTFT_Leads_Report_${day}.csv` };
}
