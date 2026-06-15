"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Phone, Calendar, Download } from "lucide-react";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { downloadCSV } from "@/lib/download-csv";
import { Head, type DbLead, type OutcomeTone, daysSince, fmtRelative } from "./shared";

const sourceTone: Record<string, OutcomeTone> = {
  WhatsApp: "hot",
  Portal: "new",
  Referral: "warm",
  Direct: "cold",
};

export function MyLeadsTab() {
  const [filter, setFilter] = useState<"All" | "Hot" | "Warm" | "Cold">("All");

  const leadsQ = trpc.leads.list.useQuery({
    status: filter !== "All" ? (filter as "Hot" | "Warm" | "Cold") : undefined,
    limit: 50,
  });
  const items = (leadsQ.data?.items ?? []) as DbLead[];

  const hotCount = items.filter((l) => l.status === "Hot").length;

  function handleExport() {
    const headers = ["ID", "Name", "Phone", "City", "Interest", "Status", "Source", "Days In Pipeline", "Last Activity"];
    const rows = items.map((l) => [
      l.id, l.name, l.phone, l.city ?? "", l.interest ?? l.property?.title ?? "",
      l.status, l.source, String(daysSince(l.createdAt)), fmtRelative(l.updatedAt),
    ]);
    downloadCSV("my-leads.csv", headers, rows);
    toast.success("CSV downloaded");
  }

  return (
    <>
      <Head t="My Leads" s="Your active queue — call, WhatsApp or annotate." />

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="My Open Leads" value={String(items.length)} sub="assigned to you" />
        <StatCard label="Hot Leads" value={String(hotCount)} sub="needs action" accent="text-accent" />
        <StatCard label="Closed MTD" value="—" sub="in progress" />
        <StatCard label="Visits This Wk" value="—" sub="scheduled" />
        <StatCard label="Commission MTD" value="—" sub="pending" accent="text-accent" />
        <StatCard label="Avg Deal Size" value="—" sub="MTD average" />
      </div>

      <Section
        title="Assigned to you"
        action={
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
              {(["All", "Hot", "Warm", "Cold"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 transition-colors ${filter === f ? "bg-accent text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              <Download size={12} /> Export
            </button>
          </div>
        }
      >
        {leadsQ.isLoading ? (
          <div className="space-y-4 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2 border-b border-border pb-4">
                <div className="h-4 w-48 rounded bg-secondary" />
                <div className="h-3 w-64 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No leads match this filter.</p>
        ) : (
          items.map((l) => (
            <div key={l.id} className="border-b border-border py-4 last:border-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-navy">{l.name}</span>
                    <Badge tone={l.status.toLowerCase() as "hot" | "warm" | "cold" | "new"}>
                      {l.status}
                    </Badge>
                    <Badge tone={sourceTone[l.source] ?? "new"}>{l.source}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {l.interest ?? l.property?.title ?? "Property enquiry"} · {l.city ?? "—"}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground flex items-center gap-2">
                    <span>{l.id.slice(0, 8)}… · {fmtRelative(l.updatedAt)}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                      {daysSince(l.createdAt)}d in pipeline
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => toast.success(`Calling ${l.name}`)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Phone size={12} /> Call
                  </button>
                  <button
                    onClick={() => toast.success(`WhatsApp opened for ${l.name}`)}
                    className="rounded-md bg-mid-blue px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() => toast("Note saved")}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
                  >
                    + Note
                  </button>
                  <button
                    onClick={() => toast.success(`Visit scheduled for ${l.name}`)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Calendar size={12} /> Schedule Visit
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </Section>
    </>
  );
}
