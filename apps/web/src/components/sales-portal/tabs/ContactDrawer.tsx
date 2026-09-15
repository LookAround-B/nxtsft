"use client";
import { useState } from "react";
import { toast } from "sonner";
import { X, Phone, MessageSquare, ArrowRightCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  Field, telHref, waHref, fmtRelative,
  CONTACT_STATUSES, CONTACT_STATUS_STYLE, OUTCOME_LABEL, type ContactStatus,
} from "./shared";
import { LogCallForm } from "./LogCallForm";

/**
 * Slide-over for one contact: details, status tagging, call history, notes and
 * the Convert-to-Lead action.
 */
export function ContactDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const utils = trpc.useUtils();
  const q = trpc.repContacts.get.useQuery({ id });

  const refresh = async () => {
    await utils.repContacts.get.invalidate({ id });
    onChanged();
  };

  const setStatus = trpc.repContacts.setStatus.useMutation({
    onError: (e) => toast.error(e.message),
    onSuccess: () => { toast.success("Status updated"); void refresh(); },
  });

  const addNote = trpc.repContacts.addNote.useMutation({
    onError: (e) => toast.error(e.message),
    onSuccess: () => { setNote(""); toast.success("Note added"); void refresh(); },
  });

  const convert = trpc.repContacts.convertToLead.useMutation({
    onError: (e) => toast.error(e.message),
    onSuccess: () => { toast.success("Converted — the lead is now in My Leads"); void refresh(); },
  });

  const c = q.data?.contact;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true">
      <aside className="h-full w-full max-w-lg overflow-auto bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold text-navy">{c?.name ?? "Loading…"}</h3>
            {c && <p className="text-sm text-muted-foreground">{c.phone}{c.city ? ` · ${c.city}` : ""}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted-foreground hover:bg-secondary">
            <X size={18} />
          </button>
        </div>

        {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {c && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <a href={telHref(c.phone)} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white">
                <Phone size={14} /> Call
              </a>
              <a href={waHref(c.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-400">
                <MessageSquare size={14} /> WhatsApp
              </a>
              {!c.leadId && (
                <button
                  onClick={() => convert.mutate({ id: c.id })}
                  disabled={convert.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-navy hover:border-accent disabled:opacity-60"
                >
                  <ArrowRightCircle size={14} /> {convert.isPending ? "Converting…" : "Convert to lead"}
                </button>
              )}
              {c.leadId && (
                <span className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                  Converted to a lead
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field k="Interest" v={c.interest ?? "—"} />
              <Field k="Value" v={c.value ? `₹${c.value.toLocaleString("en-IN")}` : "—"} />
              <Field k="Calls" v={String(c.callCount)} />
              <Field k="Source" v={c.source === "import" ? "Imported" : "Manual"} />
            </div>

            {/* Status tagging — Converted is set by the convert action only. */}
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Status</p>
              <div className="flex flex-wrap gap-2">
                {CONTACT_STATUSES.filter((s) => s !== "Converted").map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus.mutate({ id: c.id, status: s as ContactStatus })}
                    disabled={c.status === "Converted"}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                      c.status === s ? CONTACT_STATUS_STYLE[s] : "border-border text-muted-foreground hover:border-accent"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Log a call</p>
              <LogCallForm contactId={c.id} onLogged={() => void refresh()} />
            </div>

            <div>
              <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Notes</p>
              <div className="flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note…"
                  className="flex-1 rounded-xl border border-border px-3 py-2 text-sm"
                />
                <button
                  onClick={() => note.trim() && addNote.mutate({ id: c.id, text: note.trim() })}
                  disabled={addNote.isPending || !note.trim()}
                  className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  Save
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {(q.data?.notes ?? []).map((n) => (
                  <li key={n.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="text-navy">{n.text}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {n.authorName} · {fmtRelative(String(n.createdAt))}
                    </p>
                  </li>
                ))}
                {(q.data?.notes ?? []).length === 0 && (
                  <li className="text-sm text-muted-foreground">No notes yet.</li>
                )}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Call history</p>
              <ul className="space-y-2">
                {(q.data?.calls ?? []).map((call) => (
                  <li key={call.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="font-semibold text-navy">{OUTCOME_LABEL[call.outcome] ?? call.outcome}</span>
                    <span className="text-xs text-muted-foreground">
                      {call.remark ? `${call.remark} · ` : ""}{fmtRelative(String(call.createdAt))}
                    </span>
                  </li>
                ))}
                {(q.data?.calls ?? []).length === 0 && (
                  <li className="text-sm text-muted-foreground">No calls logged yet.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
