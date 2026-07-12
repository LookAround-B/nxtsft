"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { downloadCSV } from "@/lib/download-csv";
import { TableSkeleton } from "@/components/ui/skeleton";
import { PageHead } from "./PageHead";

export function LeadsTab() {
  const [filter, setFilter] = useState<string>("All");
  // LA-342: leads ticked in the unassigned queue + the chosen supervisor.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [supervisorId, setSupervisorId] = useState("");
  const utils = trpc.useUtils();
  const dbLeadsQ = trpc.admin.leads.list.useQuery({ limit: 50, status: filter === "All" ? undefined : filter });
  const dbLeads = dbLeadsQ.data?.items ?? [];

  const repsQ = trpc.admin.users.list.useQuery({ role: "sales", limit: 100 });
  const reps = repsQ.data?.items ?? [];

  const unassignedQ = trpc.leads.unassigned.useQuery({ limit: 50 });
  const unassigned = unassignedQ.data?.items ?? [];
  const supervisorsQ = trpc.leads.supervisors.useQuery();
  const supervisors = supervisorsQ.data ?? [];

  const assign = trpc.leads.assign.useMutation({
    onSuccess: (_data, vars) => {
      utils.admin.leads.list.invalidate();
      const rep = reps.find((r) => r.id === vars.assignedToId);
      toast.success(rep ? `Lead assigned to ${rep.name}` : "Lead assigned");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const unassign = trpc.leads.unassign.useMutation({
    onSuccess: () => {
      utils.admin.leads.list.invalidate();
      toast.success("Lead unassigned");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const assignToSupervisor = trpc.leads.assignToSupervisor.useMutation({
    onSuccess: (res) => {
      utils.leads.unassigned.invalidate();
      utils.admin.leads.list.invalidate();
      setSelected(new Set());
      toast.success(`${res.count} lead${res.count === 1 ? "" : "s"} routed to supervisor`);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const exportQ = trpc.leads.exportRows.useQuery({}, { enabled: false });

  async function handleExport() {
    const res = await exportQ.refetch();
    const rows = res.data ?? [];
    if (rows.length === 0) {
      toast.info("No leads to export.");
      return;
    }
    const headers = Object.keys(rows[0]);
    downloadCSV(
      `NXTFT_Leads_Report_${new Date().toISOString().slice(0, 10)}_admin.csv`,
      headers,
      rows.map((r) => headers.map((h) => String(r[h as keyof typeof r] ?? ""))),
    );
    toast.success("CSV downloaded");
  }

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const busy = assign.isPending || unassign.isPending;

  return (
    <>
      <PageHead title="Lead Management" subtitle="All leads across cities and reps." />

      {/* LA-342: first assignment hop — route fresh leads to a supervisor. */}
      <Section
        title={`Unassigned queue (${unassigned.length})`}
        action={
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            <Download size={12} /> Export CSV
          </button>
        }
      >
        {unassignedQ.isLoading ? (
          <TableSkeleton rows={3} cols={5} />
        ) : unassigned.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No leads waiting — every open lead is with a supervisor.
          </p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <select
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-medium outline-none focus:border-accent"
              >
                <option value="">
                  {supervisors.length === 0 ? "No supervisors" : "Pick supervisor…"}
                </option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.city}
                  </option>
                ))}
              </select>
              <button
                onClick={() => assignToSupervisor.mutate({ leadIds: [...selected], supervisorId })}
                disabled={selected.size === 0 || !supervisorId || assignToSupervisor.isPending}
                className="rounded-lg bg-accent px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
              >
                {assignToSupervisor.isPending
                  ? "Assigning…"
                  : `Assign ${selected.size || ""} selected`}
              </button>
              <button
                onClick={() =>
                  setSelected(
                    selected.size === unassigned.length
                      ? new Set()
                      : new Set(unassigned.map((l) => l.id)),
                  )
                }
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                {selected.size === unassigned.length ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th className="py-2 w-8"></th>
                    <th>Lead</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Property / Interest</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {unassigned.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(l.id)}
                          onChange={() => toggleSelected(l.id)}
                          className="accent-accent"
                        />
                      </td>
                      <td className="font-semibold text-navy">{l.name}</td>
                      <td className="text-xs">{l.phone}</td>
                      <td className="text-xs">{l.city ?? "—"}</td>
                      <td className="text-xs">{l.property?.title ?? l.interest ?? "—"}</td>
                      <td>
                        <Badge tone={(l.status?.toLowerCase() ?? "new") as "hot" | "warm" | "cold" | "new"}>
                          {l.status}
                        </Badge>
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {new Date(l.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>
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
          <div className="mt-4"><TableSkeleton rows={5} cols={6} /></div>
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
              {dbLeadsQ.isLoading ? null : dbLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No leads found.
                  </td>
                </tr>
              ) : dbLeads.map((l) => (
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
                      disabled={busy || repsQ.isLoading || reps.length === 0}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        if (v === "") unassign.mutate({ id: l.id });
                        else assign.mutate({ id: l.id, assignedToId: v });
                      }}
                      className="rounded-lg border border-border bg-white px-2 py-1 text-xs font-medium outline-none focus:border-accent disabled:opacity-60"
                    >
                      {l.assignedToId ? (
                        <option value="">— Unassign —</option>
                      ) : (
                        <option value="" disabled>
                          {reps.length === 0 ? "No sales reps" : "Unassigned — pick rep"}
                        </option>
                      )}
                      {reps.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
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
