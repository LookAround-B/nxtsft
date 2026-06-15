"use client";
import { useState } from "react";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { PageHead } from "./PageHead";

type Campaign = {
  id: string;
  name: string;
  budget: string;
  budgetNum: number;
  clicks: number;
  leads: number;
  cpl: string;
  roi: string;
  status: "Active" | "Paused";
};

export function MarketingTab() {
  const [dateRange] = useState({ from: "2026-05-01", to: "2026-05-31" });
  const campaigns: Campaign[] = [
    {
      id: "C-21",
      name: "Bandra Premium — Google",
      budget: "₹2.4L",
      budgetNum: 240000,
      clicks: 4820,
      leads: 64,
      cpl: "₹3,750",
      roi: "3.2x",
      status: "Active",
    },
    {
      id: "C-22",
      name: "Whitefield Villa — Meta",
      budget: "₹1.8L",
      budgetNum: 180000,
      clicks: 3210,
      leads: 41,
      cpl: "₹4,390",
      roi: "2.6x",
      status: "Active",
    },
    {
      id: "C-23",
      name: "Pune Rentals — WhatsApp",
      budget: "₹60K",
      budgetNum: 60000,
      clicks: 1240,
      leads: 28,
      cpl: "₹2,140",
      roi: "4.1x",
      status: "Paused",
    },
  ];
  const [statuses, setStatuses] = useState<Record<string, "Active" | "Paused">>(
    Object.fromEntries(campaigns.map((c) => [c.id, c.status])),
  );
  const toggleStatus = (id: string) => {
    setStatuses((prev) => {
      const next = prev[id] === "Active" ? "Paused" : "Active";
      toast(next === "Paused" ? `Pausing ${id}…` : `Resuming ${id}…`);
      return { ...prev, [id]: next };
    });
  };
  return (
    <>
      <PageHead title="Marketing" subtitle="Campaigns, attribution and creative library." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Spend MTD" value="₹4.8 L" sub="+12% vs last mo" />
        <StatCard label="Leads Generated" value="133" sub="+18 today" />
        <StatCard label="Avg CPL" value="₹3,621" sub="-8% vs last mo" />
      </div>

      {/* Date range display */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Date Range
        </span>
        <div className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-mono text-navy">
          <span>{dateRange.from}</span>
          <span className="text-muted-foreground">→</span>
          <span>{dateRange.to}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">(static preview)</span>
      </div>

      <Section title="Active Campaigns">
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th>
                <th>Name</th>
                <th>Budget</th>
                <th>Clicks</th>
                <th>Leads</th>
                <th>CPL</th>
                <th>ROI</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs">{c.id}</td>
                  <td className="font-semibold text-navy">{c.name}</td>
                  <td className="font-mono text-xs">{c.budget}</td>
                  <td>{c.clicks.toLocaleString()}</td>
                  <td>{c.leads}</td>
                  <td className="font-mono text-xs text-accent">{c.cpl}</td>
                  <td className="font-mono text-xs font-semibold text-emerald-600">{c.roi}</td>
                  <td>
                    <Badge tone={statuses[c.id] === "Active" ? "success" : "cold"}>
                      {statuses[c.id]}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => toggleStatus(c.id)}
                      className="text-xs font-semibold text-accent"
                    >
                      {statuses[c.id] === "Active" ? "Pause" : "Resume"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
