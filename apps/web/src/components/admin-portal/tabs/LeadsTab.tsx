"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { leads } from "@/data/static";
import { PageHead } from "./PageHead";

export function LeadsTab() {
  const [filter, setFilter] = useState<string>("All");
  const utils = trpc.useUtils();
  const dbLeadsQ = trpc.admin.leads.list.useQuery({ limit: 50, status: filter === "All" ? undefined : filter });
  const dbLeads = dbLeadsQ.data?.items ?? [];

  const repsQ = trpc.admin.users.list.useQuery({ role: "sales", limit: 100 });
  const reps = repsQ.data?.items ?? [];

  const assign = trpc.leads.assign.useMutation({
    onSuccess: (_data, vars) => {
      utils.admin.leads.list.invalidate();
      const rep = reps.find((r) => r.id === vars.assignedToId);
      toast.success(rep ? `Lead assigned to ${rep.name}` : "Lead assigned");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

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
                <th>Status</th>
                <th>Created</th>
                <th>Assigned To</th>
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
                  <td>
                    <Badge tone={(l.status?.toLowerCase() ?? "new") as "hot" | "warm" | "cold" | "new"}>
                      {l.status ?? "New"}
                    </Badge>
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {new Date(l.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td>
                    <select
                      value={l.assignedToId ?? ""}
                      disabled={assign.isPending || repsQ.isLoading || reps.length === 0}
                      onChange={(ev) => assign.mutate({ id: l.id, assignedToId: ev.target.value })}
                      className="rounded-lg border border-border bg-white px-2 py-1 text-xs font-medium outline-none focus:border-accent disabled:opacity-60"
                    >
                      <option value="" disabled>
                        {reps.length === 0 ? "No sales reps" : "Unassigned — pick rep"}
                      </option>
                      {reps.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
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
                  <td>
                    <Badge tone={l.status.toLowerCase() as "hot" | "warm" | "cold" | "new"}>
                      {l.status}
                    </Badge>
                  </td>
                  <td className="text-xs text-muted-foreground">{l.lastActivity}</td>
                  <td className="text-xs">{l.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
