"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { PropertyLink } from "@/components/portal/PropertyLink";

// Bulk reassign & transfer (boss 09-30), shared by Admin › Lead Management and
// Supervisor › Reassignment. Server scopes everything: supervisors only see
// and move their own team's leads, to their own active reps.
const STATUSES = [
  "New", "Hot", "Warm", "Cold", "Payment Pending", "Paid", "Listed",
  "Expiring Soon", "Expired", "Converted", "Lost",
] as const;
type Status = (typeof STATUSES)[number];
const REP_LABEL: Record<string, string> = { sales: "Sales Rep", "virtual-rep": "VC" };

export function LeadBulkTools() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<"" | Status>("");
  const [rep, setRep] = useState(""); // "" all · "__none" unassigned · id
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState("");
  const [fromRep, setFromRep] = useState("");
  const [toRep, setToRep] = useState("");
  const [loadingAll, setLoadingAll] = useState(false);

  const input = {
    limit: 100,
    ...(status ? { status } : {}),
    ...(rep === "__none" ? { unassigned: true } : rep ? { assignedToId: rep } : {}),
    ...(city.trim() ? { city: city.trim() } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  };
  const listQ = trpc.leads.list.useInfiniteQuery(input, {
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor ?? undefined : undefined),
  });
  const leads = useMemo(() => listQ.data?.pages.flatMap((p) => p.items) ?? [], [listQ.data]);
  const optsQ = trpc.leads.bulkRepOptions.useQuery();
  const active = optsQ.data?.active ?? [];
  const holders = optsQ.data?.holders ?? [];

  const refresh = () => {
    setSelected(new Set());
    void utils.leads.list.invalidate();
    void utils.leads.bulkRepOptions.invalidate();
    void utils.admin.leads.list.invalidate().catch(() => {});
  };
  const assign = trpc.leads.bulkAssign.useMutation({
    onSuccess: (_d, v) => {
      toast.success(`${v.leadIds.length} lead${v.leadIds.length === 1 ? "" : "s"} assigned to ${active.find((a) => a.id === v.assignedToId)?.name ?? "the rep"}`);
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const transfer = trpc.leads.transferAll.useMutation({
    onSuccess: (r) => {
      toast.success(r.moved ? `Transferred ${r.moved} leads.` : "That rep has no leads to transfer.");
      setFromRep("");
      setToRep("");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const loadAll = async () => {
    setLoadingAll(true);
    try {
      let r = await listQ.fetchNextPage();
      for (let i = 0; i < 50 && r.hasNextPage; i++) r = await r.fetchNextPage(); // cap: 5,000
    } finally {
      setLoadingAll(false);
    }
  };
  const allSelected = leads.length > 0 && leads.every((l) => selected.has(l.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const reset = (fn: () => void) => {
    fn();
    setSelected(new Set());
  };
  const inputCls = "rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs outline-none focus:border-accent";
  const fromHolder = holders.find((h) => h.id === fromRep);

  return (
    <Section title="Bulk reassign & transfer">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={status} onChange={(e) => reset(() => setStatus(e.target.value as "" | Status))} className={inputCls}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={rep} onChange={(e) => reset(() => setRep(e.target.value))} className={inputCls}>
          <option value="">All reps</option>
          <option value="__none">Unassigned</option>
          {holders.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} ({h.leads}){h.active ? "" : " · inactive"}
            </option>
          ))}
        </select>
        <input value={city} onChange={(e) => reset(() => setCity(e.target.value))} placeholder="City" className={`${inputCls} w-28`} />
        <input value={search} onChange={(e) => reset(() => setSearch(e.target.value))} placeholder="Name or phone" className={`${inputCls} w-36`} />
      </div>

      {/* Bulk assign bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 p-2.5">
        <span className="text-xs font-semibold text-navy">{selected.size} selected</span>
        <button
          onClick={() => setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)))}
          className="rounded-md border border-border bg-white px-2.5 py-1 text-xs font-semibold"
        >
          {allSelected ? "Clear" : `Select all ${leads.length}`}
        </button>
        <select value={target} onChange={(e) => setTarget(e.target.value)} className={inputCls}>
          <option value="">Assign to…</option>
          {active.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {REP_LABEL[a.role] ?? a.role}
            </option>
          ))}
        </select>
        <button
          disabled={!target || selected.size === 0 || assign.isPending}
          onClick={() => {
            const ids = [...selected];
            for (let i = 0; i < ids.length; i += 500) {
              assign.mutate({ leadIds: ids.slice(i, i + 500), assignedToId: target, keepStatus: true });
            }
          }}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          Assign selected
        </button>
      </div>

      {/* List */}
      <div className="mt-3 max-h-[28rem] overflow-auto rounded-xl border border-border">
        <table className="portal-table">
          <thead>
            <tr>
              <th className="py-2"></th>
              <th>Lead</th>
              <th>City</th>
              <th>Property</th>
              <th>Status</th>
              <th>Rep</th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading ? (
              <tr><td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">Loading…</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">No leads match these filters.</td></tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id}>
                  <td><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} className="accent-accent" /></td>
                  <td>
                    <div className="font-semibold text-navy">{l.name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{l.phone}</div>
                  </td>
                  <td className="text-xs">{l.city ?? "—"}</td>
                  <td className="max-w-56 truncate text-xs">{l.property ? <PropertyLink property={l.property} /> : l.interest ?? "—"}</td>
                  <td className="text-xs">{l.status}</td>
                  <td className="text-xs">
                    {l.assignedTo ? (
                      <>
                        {l.assignedTo.name}
                        {l.assignedTo.active === false && <span className="ml-1 text-[10px] font-semibold text-amber-600">inactive</span>}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Showing {leads.length}{listQ.hasNextPage ? "+" : ""} leads</span>
        {listQ.hasNextPage && (
          <div className="flex gap-2">
            <button onClick={() => void listQ.fetchNextPage()} disabled={listQ.isFetchingNextPage || loadingAll} className="rounded-lg border border-border bg-white px-3 py-1.5 font-semibold text-navy disabled:opacity-50">
              Load more
            </button>
            <button onClick={() => void loadAll()} disabled={loadingAll} className="rounded-lg bg-navy px-3 py-1.5 font-semibold text-white disabled:opacity-50">
              {loadingAll ? "Loading all…" : "Load all"}
            </button>
          </div>
        )}
      </div>

      {/* Transfer all */}
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
        <div className="text-sm font-bold text-navy">Transfer all leads from one rep to another</div>
        <p className="text-[11px] text-muted-foreground">
          For a rep who left or is inactive: moves every lead they hold in one go. Lead stages are kept.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={fromRep} onChange={(e) => setFromRep(e.target.value)} className={inputCls}>
            <option value="">From rep…</option>
            {holders.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.leads} leads){h.active ? "" : " · inactive"}
              </option>
            ))}
          </select>
          <span className="text-xs">→</span>
          <select value={toRep} onChange={(e) => setToRep(e.target.value)} className={inputCls}>
            <option value="">To active rep…</option>
            {active.filter((a) => a.id !== fromRep).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {REP_LABEL[a.role] ?? a.role}
              </option>
            ))}
          </select>
          <button
            disabled={!fromRep || !toRep || transfer.isPending}
            onClick={() => {
              const to = active.find((a) => a.id === toRep)?.name;
              if (confirm(`Move ALL ${fromHolder?.leads ?? ""} leads from ${fromHolder?.name} to ${to}?`)) {
                transfer.mutate({ fromRepId: fromRep, toRepId: toRep });
              }
            }}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
          >
            {transfer.isPending ? "Transferring…" : "Transfer all"}
          </button>
        </div>
      </div>
    </Section>
  );
}
