"use client";
import { useState } from "react";
import { LifeBuoy, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge, Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { Head } from "./shared";

type TicketItem = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  resolvedAt: string | null;
};

const CATEGORIES: { value: string; label: string }[] = [
  { value: "payment", label: "Payment" },
  { value: "property", label: "Property" },
  { value: "agent", label: "Agent" },
  { value: "technical", label: "Technical" },
  { value: "other", label: "Other" },
];

const STATUS_TONE: Record<string, "hot" | "warm" | "success" | "default"> = {
  open: "warm",
  in_progress: "hot",
  resolved: "success",
  closed: "default",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function NewTicketForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");

  const create = trpc.tickets.create.useMutation({
    onSuccess: () => {
      toast.success("Ticket raised — our team will get back to you.");
      onCreated();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    if (subject.trim().length < 5) return toast.error("Add a short subject (5+ characters).");
    if (description.trim().length < 10) return toast.error("Describe the issue (10+ characters).");
    create.mutate({ subject: subject.trim(), description: description.trim(), category: category as never });
  };

  return (
    <div className="mb-4 rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-navy">Raise a Support Ticket</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Describe your issue…"
        className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <button
        onClick={submit}
        disabled={create.isPending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {create.isPending ? "Submitting…" : "Submit Ticket"}
      </button>
    </div>
  );
}

export function SupportTicketsTab() {
  const [showForm, setShowForm] = useState(false);
  const ticketsQ = trpc.tickets.list.useQuery({ limit: 50 });
  const tickets = (ticketsQ.data?.items ?? []) as unknown as TicketItem[];

  return (
    <>
      <Head t="Support Tickets" s="Raise an issue and track its status here." />

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
        >
          <Plus size={13} />
          New Ticket
        </button>
      </div>

      {showForm && (
        <NewTicketForm onClose={() => setShowForm(false)} onCreated={() => ticketsQ.refetch()} />
      )}

      <Section title={`Your Tickets ${tickets.length > 0 ? `(${tickets.length})` : ""}`}>
        {ticketsQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center">
            <LifeBuoy size={28} className="mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No tickets yet — raise one if you need help.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center gap-4 py-4 first:pt-0">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-navy">{t.subject}</span>
                    <Badge tone={STATUS_TONE[t.status] ?? "default"}>{STATUS_LABEL[t.status] ?? t.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {CATEGORIES.find((c) => c.value === t.category)?.label ?? t.category} · Raised {fmt(t.createdAt)}
                    {t.resolvedAt ? ` · Resolved ${fmt(t.resolvedAt)}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
