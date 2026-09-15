"use client";
import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Upload, Download, Phone, MessageSquare, UserPlus, Plus, Trash2, X } from "lucide-react";
import { Section, StatCard } from "@/components/portal/PortalShell";
import { Pagination } from "@/components/ui/pagination";
import { ListSkeleton } from "@/components/ui/skeleton";
import { downloadCSV } from "@/lib/download-csv";
import { trpc } from "@/lib/trpc";
import {
  Head, telHref, waHref, fmtRelative,
  CONTACT_STATUSES, CONTACT_STATUS_STYLE, OUTCOME_LABEL, type ContactStatus,
} from "./shared";
import { ContactImportModal } from "./ContactImportModal";
import { ContactDrawer } from "./ContactDrawer";

const PAGE_SIZE = 20;

export function ContactsTab() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [callbackDue, setCallbackDue] = useState(false);
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const reset = (fn: () => void) => { fn(); setPage(1); };

  const filters = {
    status: (status || undefined) as ContactStatus | undefined,
    search: search.trim() || undefined,
    callbackDue: callbackDue || undefined,
  };

  const query = trpc.repContacts.list.useQuery(
    { ...filters, page, limit: PAGE_SIZE },
    { placeholderData: keepPreviousData },
  );
  const statsQ = trpc.repContacts.stats.useQuery();

  const del = trpc.repContacts.delete.useMutation({
    onError: (e) => toast.error(e.message),
    onSuccess: () => { toast.success("Contact removed"); void refresh(); },
  });

  async function refresh() {
    await Promise.all([
      utils.repContacts.list.invalidate(),
      utils.repContacts.stats.invalidate(),
    ]);
  }

  async function exportCsv() {
    const rows = await utils.repContacts.exportRows.fetch({ status: filters.status });
    if (!rows.length) { toast.error("Nothing to export"); return; }
    downloadCSV(
      `contacts-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Phone", "Email", "City", "Interest", "Status", "Value", "Calls", "Last call", "Last outcome", "Callback", "Owner", "Added"],
      rows.map((r) => [r.name, r.phone, r.email, r.city, r.interest, r.status, r.value, r.calls, r.lastCallAt, r.lastOutcome, r.callbackAt, r.owner, r.addedAt]),
    );
  }

  const items = query.data?.items ?? [];
  const totalPages = query.data?.totalPages ?? 1;
  const counts = statsQ.data?.counts ?? {};

  return (
    <>
      <Head t="My Contacts" s="Your telecalling book. Import a list, work it by phone, tag every number." />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <StatCard label="Contacts" value={String(statsQ.data?.total ?? 0)} />
        <StatCard label="Hot" value={String(counts.Hot ?? 0)} />
        <StatCard label="Callbacks due" value={String(statsQ.data?.callbacksDue ?? 0)} />
        <StatCard label="Calls today" value={String(statsQ.data?.callsToday ?? 0)} />
      </div>

      <Section title="Contact book">
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

          <select
            value={status}
            onChange={(e) => reset(() => setStatus(e.target.value))}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {CONTACT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}{counts[s] ? ` (${counts[s]})` : ""}</option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
            <input type="checkbox" checked={callbackDue} onChange={(e) => reset(() => setCallbackDue(e.target.checked))} />
            Callbacks due
          </label>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-navy hover:border-accent">
              <Plus size={14} /> Add
            </button>
            <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-sm font-bold text-white">
              <Upload size={14} /> Import
            </button>
            <button onClick={() => void exportCsv()} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-navy hover:border-accent">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {query.isLoading && <ListSkeleton rows={6} />}

        {!query.isLoading && items.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No contacts yet. Import a list or add one manually to start calling.
          </p>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Interest</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Last call</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-3 py-2">
                      <button onClick={() => setOpenId(c.id)} className="text-left font-semibold text-navy hover:text-accent">
                        {c.name}
                      </button>
                      <div className="text-xs text-muted-foreground">{c.phone}{c.city ? ` · ${c.city}` : ""}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{c.interest ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${CONTACT_STATUS_STYLE[c.status] ?? ""}`}>
                        {c.status}
                      </span>
                      {c.callbackAt && (
                        <div className="mt-1 text-[11px] text-amber-700">
                          Callback {new Date(c.callbackAt).toLocaleDateString("en-IN")}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {c.lastCallAt
                        ? `${fmtRelative(String(c.lastCallAt))}${c.lastOutcome ? ` · ${OUTCOME_LABEL[c.lastOutcome] ?? c.lastOutcome}` : ""}`
                        : "Never"}
                      {c.callCount > 0 && ` (${c.callCount})`}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <a href={telHref(c.phone)} aria-label={`Call ${c.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-navy hover:border-accent hover:text-accent">
                          <Phone size={14} />
                        </a>
                        <a href={waHref(c.phone)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${c.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-emerald-600 hover:border-emerald-400">
                          <MessageSquare size={14} />
                        </a>
                        <button onClick={() => setOpenId(c.id)} aria-label={`Open ${c.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-navy hover:border-accent">
                          <UserPlus size={14} />
                        </button>
                        {!c.leadId && (
                          <button
                            onClick={() => del.mutate({ id: c.id })}
                            aria-label={`Delete ${c.name}`}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-border text-rose-600 hover:border-rose-300"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          shown={items.length}
          total={query.data?.total}
          noun="contacts"
        />
      </Section>

      {showImport && <ContactImportModal onClose={() => setShowImport(false)} onDone={() => void refresh()} />}
      {showAdd && <AddContactModal onClose={() => setShowAdd(false)} onDone={() => void refresh()} />}
      {openId && <ContactDrawer id={openId} onClose={() => setOpenId(null)} onChanged={() => void refresh()} />}
    </>
  );
}

function AddContactModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "", interest: "", value: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = trpc.repContacts.create.useMutation({
    onError: (e) => toast.error(e.message),
    onSuccess: () => { toast.success("Contact added"); onDone(); onClose(); },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      city: form.city.trim() || undefined,
      interest: form.interest.trim() || undefined,
      value: form.value ? Number(form.value.replace(/[^\d]/g, "")) : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-navy">Add contact</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted-foreground hover:bg-secondary">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <input required value={form.name} onChange={set("name")} placeholder="Name *" className="w-full rounded-xl border border-border px-3 py-2 text-sm" />
          <input required value={form.phone} onChange={set("phone")} placeholder="Phone *" inputMode="tel" className="w-full rounded-xl border border-border px-3 py-2 text-sm" />
          <input value={form.email} onChange={set("email")} placeholder="Email" type="email" className="w-full rounded-xl border border-border px-3 py-2 text-sm" />
          <input value={form.city} onChange={set("city")} placeholder="City" className="w-full rounded-xl border border-border px-3 py-2 text-sm" />
          <input value={form.interest} onChange={set("interest")} placeholder="Interest — e.g. 2 BHK Gachibowli" className="w-full rounded-xl border border-border px-3 py-2 text-sm" />
          <input value={form.value} onChange={set("value")} placeholder="Expected value (₹)" inputMode="numeric" className="w-full rounded-xl border border-border px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={create.isPending} className="mt-5 w-full rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {create.isPending ? "Saving…" : "Add contact"}
        </button>
      </form>
    </div>
  );
}
