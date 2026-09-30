"use client";
import { trpc } from "@/lib/trpc";

// Shared filter bar (boss 09-30): Sales rep · Supervisor · From / To date.
// Used by Admin › CRM Pipeline and Admin › Subscriptions.
export type StaffDateFilterValue = { repId: string; supervisorId: string; from: string; to: string };
export const EMPTY_STAFF_DATE_FILTER: StaffDateFilterValue = { repId: "", supervisorId: "", from: "", to: "" };

/** Only the filters that are set, ready to spread into a query input. */
export function filterInput(f: StaffDateFilterValue) {
  return {
    ...(f.supervisorId ? { supervisorId: f.supervisorId } : {}),
    ...(f.from ? { from: f.from } : {}),
    ...(f.to ? { to: f.to } : {}),
  };
}

export function StaffDateFilters({
  value,
  onChange,
}: {
  value: StaffDateFilterValue;
  onChange: (v: StaffDateFilterValue) => void;
}) {
  const repsQ = trpc.leads.bulkRepOptions.useQuery();
  const supsQ = trpc.leads.supervisors.useQuery();
  // Reps who hold leads (incl. inactive) plus active reps without leads yet.
  const reps = [
    ...(repsQ.data?.holders ?? []),
    ...(repsQ.data?.active ?? [])
      .filter((a) => !(repsQ.data?.holders ?? []).some((h) => h.id === a.id))
      .map((a) => ({ ...a, active: true, leads: 0 })),
  ];
  const cls = "rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs outline-none focus:border-accent";
  const set = (k: keyof StaffDateFilterValue) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  const active = value.repId || value.supervisorId || value.from || value.to;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <select value={value.repId} onChange={set("repId")} className={cls}>
        <option value="">All sales reps</option>
        {reps.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}{r.active ? "" : " · inactive"}
          </option>
        ))}
      </select>
      <select value={value.supervisorId} onChange={set("supervisorId")} className={cls}>
        <option value="">All supervisors</option>
        {(supsQ.data ?? []).map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        From <input type="date" value={value.from} onChange={set("from")} className={cls} />
      </label>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        To <input type="date" value={value.to} onChange={set("to")} className={cls} />
      </label>
      {active && (
        <button onClick={() => onChange(EMPTY_STAFF_DATE_FILTER)} className="text-xs font-semibold text-accent hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
}
