"use client";
import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Download, Upload, Users, X } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { Pagination } from "@/components/ui/pagination";
import { ListSkeleton } from "@/components/ui/skeleton";
import { downloadCSV } from "@/lib/download-csv";
import { trpc } from "@/lib/trpc";
import {
  CONTACT_STATUSES, CONTACT_STATUS_STYLE, OUTCOME_LABEL, type ContactStatus,
} from "@/components/sales-portal/tabs/shared";
import { ContactImportModal } from "@/components/sales-portal/tabs/ContactImportModal";
import { ContactDrawer } from "@/components/sales-portal/tabs/ContactDrawer";
import { PageHead } from "./PageHead";

const PAGE_SIZE = 20;

/**
 * Telecalling books across reps: upload a list for a chosen rep, see the
 * upload history, bulk reassign. Admins see every rep and also control the rep
 * permissions; supervisors (mode "team") get the same screen scoped to their
 * team — the server applies that scope, this only changes the copy.
 */
export function RepContactsTab({ mode = "admin" }: { mode?: "admin" | "team" }) {
  const isAdmin = mode === "admin";
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [batch, setBatch] = useState<{ id: string; label: string } | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [moveTo, setMoveTo] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const reset = (fn: () => void) => { fn(); setPage(1); setSelected([]); };

  const query = trpc.repContacts.list.useQuery(
    {
      status: (status || undefined) as ContactStatus | undefined,
      search: search.trim() || undefined,
      ownerId: ownerId || undefined,
      batchId: batch?.id,
      page,
      limit: PAGE_SIZE,
    },
    { placeholderData: keepPreviousData },
  );
  const repsQ = trpc.repContacts.reps.useQuery();
  const importsQ = trpc.repContacts.imports.useQuery();

  const refresh = () => {
    void utils.repContacts.list.invalidate();
    void utils.repContacts.imports.invalidate();
  };

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
      batchId: batch?.id,
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
  const reps = repsQ.data ?? [];

  return (
    <>
      <PageHead
        title={isAdmin ? "Rep Contacts" : "Team Contacts"}
        subtitle={
          isAdmin
            ? "Every telecalling book, across all sales reps. Upload a list for a rep, or move contacts between reps."
            : "Your team's telecalling books. Upload a list for one of your reps, or move contacts between them."
        }
      />

      {isAdmin && <RepPermissions />}

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
            {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <select value={status} onChange={(e) => reset(() => setStatus(e.target.value))} className="rounded-xl border border-border px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {CONTACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {batch && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-sm text-navy">
              Upload: {batch.label}
              <button onClick={() => reset(() => setBatch(null))} aria-label="Clear upload filter" className="text-muted-foreground hover:text-navy">
                <X size={14} />
              </button>
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              disabled={reps.length === 0}
              title={reps.length === 0 ? "No active reps to assign to" : undefined}
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <Upload size={14} /> Upload for a rep
            </button>
            <button onClick={() => void exportCsv()} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-navy hover:border-accent">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3">
            <Users size={14} className="text-accent" />
            <span className="text-sm font-semibold text-navy">{selected.length} selected</span>
            <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="rounded-xl border border-border px-3 py-2 text-sm">
              <option value="">Reassign to…</option>
              {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
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
                      <button onClick={() => setOpenId(c.id)} className="text-left font-semibold text-navy hover:text-accent">
                        {c.name}
                      </button>
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

      <Section title="Upload history">
        {importsQ.isLoading && <ListSkeleton rows={3} />}
        {!importsQ.isLoading && (importsQ.data ?? []).length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No uploads yet.</p>
        )}
        {(importsQ.data ?? []).length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">For rep</th>
                  <th className="px-3 py-2">Uploaded by</th>
                  <th className="px-3 py-2 text-right">Added</th>
                  <th className="px-3 py-2 text-right">Skipped</th>
                  <th className="px-3 py-2 text-right">Rejected</th>
                </tr>
              </thead>
              <tbody>
                {(importsQ.data ?? []).map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(u.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => reset(() => {
                          setOwnerId("");
                          setBatch({ id: u.id, label: `${u.fileName ?? "file"} → ${u.ownerName}` });
                        })}
                        disabled={u.created === 0}
                        className="text-left font-semibold text-navy hover:text-accent disabled:font-normal disabled:text-muted-foreground"
                        title={u.created ? "Show these contacts" : undefined}
                      >
                        {u.fileName ?? "—"}
                      </button>
                    </td>
                    <td className="px-3 py-2">{u.ownerName}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {u.uploaderId === u.ownerId ? "Self" : u.uploaderName}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-navy">{u.created}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {u.skipped + (u.heldByOthers ?? 0)}
                      {(u.heldByOthers ?? 0) > 0 && (
                        <span className="block text-[11px]">{u.heldByOthers} held by another rep</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{u.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {showImport && (
        <ContactImportModal assignTo={reps} onClose={() => setShowImport(false)} onDone={refresh} />
      )}
      {openId && <ContactDrawer id={openId} onClose={() => setOpenId(null)} onChanged={() => void utils.repContacts.list.invalidate()} />}
    </>
  );
}

const PERMISSION_ROWS: { key: "canDeleteAssigned" | "canImportHeld"; title: string; detail: string }[] = [
  {
    key: "canDeleteAssigned",
    title: "Reps can delete contacts assigned to them",
    detail: "Off: contacts an admin or supervisor uploaded or moved to a rep can't be deleted by that rep. Contacts a rep added themselves can always be deleted.",
  },
  {
    key: "canImportHeld",
    title: "Reps can import numbers another rep already has",
    detail: "Off: when a rep imports or adds a number that is already in another rep's book, it's left out, so two reps never call the same person. Admin and supervisor uploads are not limited.",
  },
];

/** Admin switches that limit what sales reps can do with their contacts. */
function RepPermissions() {
  const utils = trpc.useUtils();
  const permsQ = trpc.repContacts.repPermissions.useQuery();
  const save = trpc.repContacts.setRepPermissions.useMutation({
    onError: (e) => toast.error(e.message),
    onSuccess: () => { toast.success("Rep permissions saved"); void utils.repContacts.repPermissions.invalidate(); },
  });

  return (
    <Section title="Rep permissions">
      <div className="space-y-3">
        {PERMISSION_ROWS.map((row) => {
          const on = !!permsQ.data?.[row.key];
          return (
            <div
              key={row.key}
              className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                on ? "border-border bg-white" : "border-dashed border-border bg-secondary/40"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-navy">{row.title}</div>
                <div className="text-xs text-muted-foreground">{row.detail}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={row.title}
                disabled={!permsQ.data || save.isPending}
                onClick={() => permsQ.data && save.mutate({ ...permsQ.data, [row.key]: !on })}
                className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
                  on ? "bg-emerald-500" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
