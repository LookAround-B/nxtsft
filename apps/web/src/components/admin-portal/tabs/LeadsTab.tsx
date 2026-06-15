"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { leads } from "@/data/static";
import { PageHead } from "./PageHead";

export function LeadsTab() {
  const [filter, setFilter] = useState<string>("All");
  const dbLeadsQ = trpc.admin.leads.list.useQuery({ limit: 50, status: filter === "All" ? undefined : filter });
  const dbLeads = dbLeadsQ.data?.items ?? [];

  return (
    <>
      <PageHead title="Lead Management" subtitle="All leads across cities and reps." />
      <Section title="Filter by status">
        <div className="flex flex-wrap gap-2">
          {["All", "Hot", "Warm", "Cold", "New"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === s ? "border-accent bg-accent text-accent-foreground" : "border-border bg-white"}`}
            >
              {s}
            </button>
          ))}
        </div>
        {dbLeadsQ.isLoading && (
          <div className="mt-4 text-sm text-muted-foreground">Loading leads…</div>
        )}
        <div className="mt-5 overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">ID</th>
                <th>Lead</th>
                <th>Property</th>
                <th>Source</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dbLeads.length > 0 ? dbLeads.map((l) => (
                <tr key={l.id}>
                  <td className="font-mono text-[11px]">{l.id.slice(0, 8)}…</td>
                  <td>
                    <div className="font-semibold text-navy">{l.user?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{l.user?.email}</div>
                  </td>
                  <td className="text-xs">{l.property?.title ?? "—"}</td>
                  <td>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-navy">
                      {l.source ?? "Portal"}
                    </span>
                  </td>
                  <td className="text-xs">{l.assignedToId ? l.assignedToId.slice(0, 8) + "…" : "Unassigned"}</td>
                  <td>
                    <Badge tone={(l.status?.toLowerCase() ?? "new") as "hot" | "warm" | "cold" | "new"}>
                      {l.status ?? "New"}
                    </Badge>
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {new Date(l.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => toast.success(`Assigning lead…`)}
                      className="text-xs font-semibold text-accent"
                    >
                      Assign →
                    </button>
                  </td>
                </tr>
              )) : (leads.filter((l) => filter === "All" || l.status === filter)).map((l) => (
                <tr key={l.id}>
                  <td className="font-mono text-xs">{l.id}</td>
                  <td>
                    <div className="font-semibold text-navy">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.phone}</div>
                  </td>
                  <td className="text-xs">{l.interest}</td>
                  <td>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-navy">
                      {l.source}
                    </span>
                  </td>
                  <td className="text-xs">{l.owner}</td>
                  <td>
                    <Badge tone={l.status.toLowerCase() as "hot" | "warm" | "cold" | "new"}>
                      {l.status}
                    </Badge>
                  </td>
                  <td className="text-xs text-muted-foreground">{l.lastActivity}</td>
                  <td className="text-right">
                    <button
                      onClick={() => toast.success(`Assigning ${l.name}…`)}
                      className="text-xs font-semibold text-accent"
                    >
                      Assign →
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
