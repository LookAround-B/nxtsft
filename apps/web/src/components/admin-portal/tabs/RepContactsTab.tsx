"use client";
import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Download, Users } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { Pagination } from "@/components/ui/pagination";
import { ListSkeleton } from "@/components/ui/skeleton";
import { downloadCSV } from "@/lib/download-csv";
import { trpc } from "@/lib/trpc";
import {
  CONTACT_STATUSES, CONTACT_STATUS_STYLE, OUTCOME_LABEL, type ContactStatus,
} from "@/components/sales-portal/tabs/shared";
import { PageHead } from "./PageHead";

const PAGE_SIZE = 20;

/** Admin view over every rep's telecalling book, with bulk reassignment. */
export function RepContactsTab() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [moveTo, setMoveTo] = useState("");

  const utils = trpc.useUtils();
  const reset = (fn: () => void) => { fn(); setPage(1); setSelected([]); };

  const query = trpc.repContacts.list.useQuery(
    {
      status: (status || undefined) as ContactStatus | undefined,
      search: search.trim() || undefined,
      ownerId: ownerId || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { placeholderData: keepPreviousData },
  );
  const repsQ = trpc.repContacts.reps.useQuery();

  const reassign = trpc.repContacts.reassign.useMutation({
    onError: (e) => toast.error(e.message),
    onSuccess: (r) => {
      toast.success(
        r.skipped > 0
          ? `Moved ${r.moved}. Skipped ${r.skipped} — that rep already has those numbers.`
          : `Moved ${r.moved} contact${r.moved === 1 ? "" : "s"}.`,
      );
      setSelected([]);
      void utils.repContacts.list.invalidate();
    },
  });

  async function exportCsv() {
    const rows = await utils.repContacts.exportRows.fetch({
      status: (status || undefined) as ContactStatus | undefined,
    });
    if (!rows.length) { toast.error("Nothing to export"); return; }
    downloadCSV(
      `rep-contacts-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Phone", "Email", "City", "Interest", "Status", "Value", "Calls", "Last call", "Last outcome", "Callback", "Rep", "Added"],
      rows.map((r) => [r.name, r.phone, r.email, r.city, r.interest, r.status, r.value, r.calls, r.lastCallAt, r.lastOutcome, r.callbackAt, r.owner, r.addedAt]),
    );
  }

  const items = query.data?.items ?? [];
  const allSelected = items.length > 0 && selected.length === items.length;

  return (
    <>
      <PageHead title="Rep Contacts" subtitle="Every telecalling book, across all sales reps." />

      <Section title="Contacts">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => reset(() => setSearch(e.target.value))}
              placeholder="Name or phone"
              className="w-56 rounded-xl border border-border py-2 pl-9 pr-3 text-sm"
            />
          </div>

          <select value={ownerId} onChange={(e) => reset(() => setOwnerId(e.target.value))} className="rounded-xl border border-border px-3 py-2 text-sm">
            <option value="">All reps</option>
            {(repsQ.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <select value={status} onChange={(e) => reset(() => setStatus(e.target.value))} className="rounded-xl border border-border px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {CONTACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <button onClick={() => void exportCsv()} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-navy hover:border-accent">
            <Download size={14} /> Export
          </button>
        </div>

        {selected.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3">
            <Users size={14} className="text-accent" />
            <span className="text-sm font-semibold text-navy">{selected.length} selected</span>
            <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="rounded-xl border border-border px-3 py-2 text-sm">
              <option value="">Reassign to…</option>
              {(repsQ.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button
              onClick={() => moveTo && reassign.mutate({ ids: selected, toRepId: moveTo })}
              disabled={!moveTo || reassign.isPending}
              className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {reassign.isPending ? "Moving…" : "Reassign"}
            </button>
          </div>
        )}

        {query.isLoading && <ListSkeleton rows={6} />}

        {!query.isLoading && items.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No contacts match those filters.</p>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={allSelected}
                      onChange={(e) => setSelected(e.target.checked ? items.map((c) => c.id) : [])}
                    />
                  </th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Rep</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Last call</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Select ${c.name}`}
                        checked={selected.includes(c.id)}
                        onChange={(e) =>
                          setSelected((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)))
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-navy">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.phone}{c.city ? ` · ${c.city}` : ""}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{c.owner.name}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${CONTACT_STATUS_STYLE[c.status] ?? ""}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {c.lastCallAt
                        ? `${new Date(c.lastCallAt).toLocaleDateString("en-IN")}${c.lastOutcome ? ` · ${OUTCOME_LABEL[c.lastOutcome] ?? c.lastOutcome}` : ""}`
                        : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={query.data?.totalPages ?? 1}
          onPageChange={setPage}
          shown={items.length}
          total={query.data?.total}
          noun="contacts"
        />
      </Section>
    </>
  );
}
