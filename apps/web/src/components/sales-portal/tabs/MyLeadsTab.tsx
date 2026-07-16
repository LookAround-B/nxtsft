"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Phone, Calendar, Download, MessageSquare } from "lucide-react";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { downloadCSV } from "@/lib/download-csv";
import { Head, latestNote, type DbLead, type OutcomeTone, daysSince, fmtRelative } from "./shared";

const sourceTone: Record<string, OutcomeTone> = {
  WhatsApp: "hot",
  Portal: "new",
  Referral: "warm",
  Direct: "cold",
};

// Indian numbers are stored as 10 digits; wa.me needs the country code and no
// punctuation. tel: is happy with the raw value.
function waHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const withCc = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCc}`;
}

export function MyLeadsTab() {
  const [filter, setFilter] = useState<"All" | "Hot" | "Warm" | "Cold">("All");
  // Which lead has its Note / Schedule / Payment / Call panel open, and the
  // in-progress input.
  const [openAction, setOpenAction] = useState<{ id: string; kind: "note" | "schedule" | "payment" | "call" } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [visitAt, setVisitAt] = useState("");
  const [planDraft, setPlanDraft] = useState("");
  const [amountDraft, setAmountDraft] = useState("");
  const [callRemark, setCallRemark] = useState("");

  const utils = trpc.useUtils();
  const leadsQ = trpc.leads.list.useQuery({
    status: filter !== "All" ? (filter as "Hot" | "Warm" | "Cold") : undefined,
    limit: 50,
  });
  const items = (leadsQ.data?.items ?? []) as DbLead[];

  const addNote = trpc.leads.addNote.useMutation({
    onSuccess: () => {
      utils.leads.list.invalidate();
      toast.success("Note saved");
      setOpenAction(null);
      setNoteDraft("");
    },
    onError: (e) => toast.error(e.message),
  });

  const scheduleVisit = trpc.leads.scheduleVisit.useMutation({
    onSuccess: () => {
      utils.leads.list.invalidate();
      toast.success("Visit scheduled");
      setOpenAction(null);
      setVisitAt("");
    },
    onError: (e) => toast.error(e.message),
  });

  const createLink = trpc.leads.createPaymentLink.useMutation({
    onSuccess: (lead) => {
      utils.leads.list.invalidate();
      if (lead.paymentLink) {
        navigator.clipboard?.writeText(lead.paymentLink).catch(() => null);
        toast.success("Payment link created and copied — send it on WhatsApp.");
      } else {
        toast.success("Payment link created.");
      }
      setOpenAction(null);
      setPlanDraft("");
      setAmountDraft("");
    },
    onError: (e) => toast.error(e.message),
  });

  const recordCall = trpc.leads.recordCall.useMutation({
    onSuccess: () => {
      utils.leads.list.invalidate();
      toast.success("Call logged");
      setOpenAction(null);
      setCallRemark("");
    },
    onError: (e) => toast.error(e.message),
  });

  function toggle(id: string, kind: "note" | "schedule" | "payment" | "call") {
    setOpenAction((prev) => (prev?.id === id && prev.kind === kind ? null : { id, kind }));
    setNoteDraft("");
    setVisitAt("");
    setPlanDraft("");
    setAmountDraft("");
    setCallRemark("");
  }

  const hotCount = items.filter((l) => l.status === "Hot").length;

  function handleExport() {
    const headers = ["ID", "Name", "Phone", "City", "Interest", "Status", "Source", "Days In Pipeline", "Last Activity", "Latest Comment"];
    const rows = items.map((l) => [
      l.id, l.name, l.phone, l.city ?? "", l.interest ?? l.property?.title ?? "",
      l.status, l.source, String(daysSince(l.createdAt)), fmtRelative(l.updatedAt),
      latestNote(l.notes) ?? "",
    ]);
    downloadCSV("my-leads.csv", headers, rows);
    toast.success("CSV downloaded");
  }

  return (
    <>
      <Head t="My Leads" s="Your active queue — call, WhatsApp or annotate." />

      {/* LA-342 commission rule banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
        Note: ₹500 commission applicable only on a customer&apos;s 1st payment of ₹4,999 or more.
        No commission on renewals, boosts or smaller plans.
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="My Open Leads" value={String(items.length)} sub="assigned to you" />
        <StatCard label="Hot Leads" value={String(hotCount)} sub="needs action" accent="text-accent" />
        <StatCard label="Closed MTD" value="—" sub="in progress" />
        <StatCard label="Visits This Wk" value="—" sub="scheduled" />
        <StatCard label="Commission MTD" value="—" sub="pending" accent="text-accent" />
        <StatCard label="Avg Deal Size" value="—" sub="MTD average" />
      </div>

      <Section
        title="Assigned to you"
        action={
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
              {(["All", "Hot", "Warm", "Cold"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 transition-colors ${filter === f ? "bg-accent text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              <Download size={12} /> Export
            </button>
          </div>
        }
      >
        {leadsQ.isLoading ? (
          <div className="space-y-4 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2 border-b border-border pb-4">
                <div className="h-4 w-48 rounded bg-secondary" />
                <div className="h-3 w-64 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No leads match this filter.</p>
        ) : (
          items.map((l) => (
            <div key={l.id} className="border-b border-border py-4 last:border-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-navy">{l.name}</span>
                    <Badge tone={l.status.toLowerCase() as "hot" | "warm" | "cold" | "new"}>
                      {l.status}
                    </Badge>
                    <Badge tone={sourceTone[l.source] ?? "new"}>{l.source}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {l.interest ?? l.property?.title ?? "Property enquiry"} · {l.city ?? "—"}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground flex items-center gap-2">
                    <span>{l.id.slice(0, 8)}… · {fmtRelative(l.updatedAt)}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                      {daysSince(l.createdAt)}d in pipeline
                    </span>
                  </div>
                  {latestNote(l.notes) && (
                    <div className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MessageSquare size={12} className="mt-0.5 shrink-0 text-muted-foreground/50" />
                      <p className="line-clamp-2 leading-relaxed">{latestNote(l.notes)}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`tel:${l.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                  >
                    <Phone size={12} /> {l.phone}
                  </a>
                  <a
                    href={waHref(l.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-mid-blue px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    WhatsApp
                  </a>
                  <button
                    onClick={() => toggle(l.id, "note")}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                      openAction?.id === l.id && openAction.kind === "note"
                        ? "border-accent text-accent"
                        : "border-border"
                    }`}
                  >
                    + Note
                  </button>
                  <button
                    onClick={() => toggle(l.id, "schedule")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    <Calendar size={12} /> Schedule Visit
                  </button>
                  <button
                    onClick={() => toggle(l.id, "call")}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    Log Call
                  </button>
                  {l.paymentStatus !== "Paid" && (
                    <button
                      onClick={() => toggle(l.id, "payment")}
                      className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    >
                      ₹ Payment Link
                    </button>
                  )}
                </div>
              </div>

              {/* Payment pipeline state */}
              {l.paymentStatus === "Paid" ? (
                <div className="mt-2 text-[11px] font-semibold text-emerald-600">
                  ✓ Paid{l.plan ? ` — ${l.plan}` : ""}{l.amount ? ` (₹${l.amount.toLocaleString("en-IN")})` : ""} · listing live
                </div>
              ) : l.paymentLink ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-amber-600">Payment pending</span>
                  <a href={l.paymentLink} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                    {l.paymentLink}
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(l.paymentLink!).then(() => toast.success("Link copied"));
                    }}
                    className="rounded border border-border px-2 py-0.5 font-semibold hover:bg-muted"
                  >
                    Copy
                  </button>
                </div>
              ) : null}

              {openAction?.id === l.id && openAction.kind === "note" && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Add a note…"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && noteDraft.trim()) addNote.mutate({ id: l.id, note: noteDraft.trim() });
                    }}
                    className="min-w-0 flex-1 rounded-md border border-border bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    onClick={() => addNote.mutate({ id: l.id, note: noteDraft.trim() })}
                    disabled={!noteDraft.trim() || addNote.isPending}
                    className="shrink-0 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              )}

              {openAction?.id === l.id && openAction.kind === "payment" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Plan name (e.g. Silver ₹4,999)"
                    value={planDraft}
                    onChange={(e) => setPlanDraft(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-border bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Amount ₹"
                    value={amountDraft}
                    onChange={(e) => setAmountDraft(e.target.value)}
                    className="w-28 rounded-md border border-border bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    onClick={() =>
                      createLink.mutate({ leadId: l.id, plan: planDraft.trim(), amount: Number(amountDraft) })
                    }
                    disabled={!planDraft.trim() || !amountDraft || Number(amountDraft) <= 0 || createLink.isPending}
                    className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {createLink.isPending ? "Creating…" : "Create & send link"}
                  </button>
                </div>
              )}

              {openAction?.id === l.id && openAction.kind === "call" && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Call outcome — e.g. interested, call back tomorrow"
                    value={callRemark}
                    onChange={(e) => setCallRemark(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && callRemark.trim())
                        recordCall.mutate({ id: l.id, remark: callRemark.trim() });
                    }}
                    className="min-w-0 flex-1 rounded-md border border-border bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    onClick={() => recordCall.mutate({ id: l.id, remark: callRemark.trim() })}
                    disabled={!callRemark.trim() || recordCall.isPending}
                    className="shrink-0 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              )}

              {openAction?.id === l.id && openAction.kind === "schedule" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="datetime-local"
                    autoFocus
                    value={visitAt}
                    onChange={(e) => setVisitAt(e.target.value)}
                    className="rounded-md border border-border bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    onClick={() =>
                      scheduleVisit.mutate({ leadId: l.id, scheduledAt: new Date(visitAt).toISOString() })
                    }
                    disabled={!visitAt || scheduleVisit.isPending}
                    className="shrink-0 rounded-md bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Confirm visit
                  </button>
                  {!l.property && (
                    <span className="text-[11px] text-muted-foreground">
                      Link this lead to a property first to schedule.
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </Section>
    </>
  );
}
