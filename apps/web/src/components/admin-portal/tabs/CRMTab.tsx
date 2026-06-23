"use client";
import { useState, useEffect, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { X, Phone, Mail, MapPin, Building2, Tag, FileText, Calendar, ExternalLink } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { PageHead } from "./PageHead";

const CRM_STAGES = ["New", "Hot", "Warm", "Cold", "Converted", "Lost"] as const;
type CrmStage = (typeof CRM_STAGES)[number];

const stageAccent: Record<CrmStage, string> = {
  New: "border-t-sky-400",
  Hot: "border-t-red-500",
  Warm: "border-t-amber-500",
  Cold: "border-t-blue-400",
  Converted: "border-t-emerald-500",
  Lost: "border-t-zinc-400",
};

const stageBadge: Record<CrmStage, "new" | "hot" | "warm" | "cold" | "success" | "default"> = {
  New: "new", Hot: "hot", Warm: "warm", Cold: "cold", Converted: "success", Lost: "default",
};

type CrmLead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  status: string;
  value: number | null;
  interest: string | null;
  notes: string | null;
  source: string | null;
  createdAt: string;
  property: { id: string; title: string; slug: string } | null;
};

function fmtValue(v: number | null) {
  if (v == null) return "—";
  return v >= 1e7 ? `₹${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(1)}L` : `₹${v.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Lead Detail Panel ───────────────────────────────────────────────────────

function LeadPanel({
  lead,
  onClose,
  onStatusChange,
}: {
  lead: CrmLead;
  onClose: () => void;
  onStatusChange: (id: string, status: CrmStage) => void;
}) {
  const updateStatus = trpc.leads.updateStatus.useMutation({
    onSuccess: (updated) => {
      toast.success(`Status changed to ${updated.status}`);
      onStatusChange(lead.id, updated.status as CrmStage);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div>
            <h2 className="text-base font-bold text-navy">{lead.name}</h2>
            <p className="text-xs text-muted-foreground">Lead enquiry</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Contact details */}
          <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Details</h3>

            <a
              href={`tel:${lead.phone}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5 transition hover:border-accent hover:bg-accent/5"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <Phone size={15} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Phone</div>
                <div className="text-sm font-bold text-navy">{lead.phone}</div>
              </div>
              <span className="ml-auto text-xs font-semibold text-emerald-600">Call</span>
            </a>

            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5 transition hover:border-accent hover:bg-accent/5"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-600">
                  <Mail size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="truncate text-sm font-bold text-navy">{lead.email}</div>
                </div>
                <span className="ml-auto text-xs font-semibold text-blue-600">Mail</span>
              </a>
            )}

            {lead.city && (
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
                  <MapPin size={15} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">City</div>
                  <div className="text-sm font-semibold text-navy">{lead.city}</div>
                </div>
              </div>
            )}
          </div>

          {/* Property */}
          {lead.property && (
            <div className="rounded-xl border border-border p-4 space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Property Enquired</h3>
              <div className="flex items-start gap-2">
                <Building2 size={15} className="mt-0.5 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-navy">{lead.property.title}</div>
                  {lead.value != null && (
                    <div className="mt-0.5 text-sm font-bold text-accent">{fmtValue(lead.value)}</div>
                  )}
                </div>
                <a
                  href={`/properties/${lead.property.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-accent transition hover:opacity-70"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}

          {/* Lead meta */}
          <div className="rounded-xl border border-border p-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lead Info</h3>

            <div className="flex items-center gap-2 text-sm">
              <Tag size={13} className="shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Status:</span>
              <Badge tone={stageBadge[lead.status as CrmStage] ?? "default"}>{lead.status}</Badge>
            </div>

            {lead.source && (
              <div className="flex items-center gap-2 text-sm">
                <Tag size={13} className="shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Source:</span>
                <span className="font-semibold text-navy">{lead.source}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Calendar size={13} className="shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Received:</span>
              <span className="font-semibold text-navy">{fmtDate(lead.createdAt)}</span>
            </div>

            {lead.interest && (
              <div className="flex items-start gap-2 text-sm">
                <FileText size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Interest:</span>
                <span className="font-semibold text-navy">{lead.interest}</span>
              </div>
            )}

            {lead.notes && (
              <div className="mt-1 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                {lead.notes}
              </div>
            )}
          </div>

          {/* Change status */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Move to Stage</h3>
            <div className="grid grid-cols-3 gap-2">
              {CRM_STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus.mutate({ id: lead.id, status: s })}
                  disabled={s === lead.status || updateStatus.isPending}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                    s === lead.status
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-white text-navy hover:border-accent hover:text-accent disabled:opacity-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main CRM Tab ─────────────────────────────────────────────────────────────

export function CRMTab() {
  const leadsQ = trpc.admin.leads.list.useQuery({ limit: 100 });
  const updateStatus = trpc.leads.updateStatus.useMutation({
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);

  const serverLeads = useMemo(
    () => (leadsQ.data?.items ?? []) as unknown as CrmLead[],
    [leadsQ.data],
  );
  const [leads, setLeads] = useState<CrmLead[]>([]);
  useEffect(() => { setLeads(serverLeads); }, [serverLeads]);

  const handleDragEnd = (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStage = destination.droppableId as CrmStage;
    const lead = leads.find((l) => l.id === draggableId);
    if (!lead || lead.status === newStage) return;

    setLeads((prev) => prev.map((l) => l.id === draggableId ? { ...l, status: newStage } : l));

    updateStatus.mutate(
      { id: draggableId, status: newStage },
      {
        onSuccess: () => toast.success(`Moved to ${newStage}`),
        onError: () => setLeads((prev) => prev.map((l) => l.id === draggableId ? { ...l, status: lead.status } : l)),
      },
    );
  };

  const handleStatusChange = (id: string, status: CrmStage) => {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    if (selectedLead?.id === id) {
      setSelectedLead((prev) => prev ? { ...prev, status } : prev);
    }
  };

  return (
    <>
      <PageHead title="CRM Pipeline" subtitle="Drag a lead card between columns to move it through the funnel. Click a card to view contact details." />
      <Section title="Pipeline — All Teams" action={<Badge tone="new">{leads.length} leads</Badge>}>
        {leadsQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading pipeline…</p>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {CRM_STAGES.map((stage) => {
                const items = leads.filter((l) => l.status === stage);
                return (
                  <div key={stage} className={`rounded-lg border-t-4 bg-secondary/60 p-3 ${stageAccent[stage]}`}>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-navy">{stage}</span>
                      <span className="rounded-full bg-white px-1.5 text-[10px] font-bold text-mid-blue">{items.length}</span>
                    </div>
                    <Droppable droppableId={stage}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[60px] space-y-2 rounded-md transition-colors ${snapshot.isDraggingOver ? "bg-accent/8" : ""}`}
                        >
                          {items.map((l, idx) => (
                            <Draggable key={l.id} draggableId={l.id} index={idx}>
                              {(drag, dragSnapshot) => (
                                <div
                                  ref={drag.innerRef}
                                  {...drag.draggableProps}
                                  style={drag.draggableProps.style as React.CSSProperties}
                                  {...drag.dragHandleProps}
                                  onClick={() => !dragSnapshot.isDragging && setSelectedLead(l)}
                                  className={`cursor-pointer select-none rounded-md bg-white p-2.5 text-xs shadow-sm transition-shadow active:cursor-grabbing hover:shadow-md ${dragSnapshot.isDragging ? "rotate-1 opacity-95 shadow-lg" : ""}`}
                                >
                                  <div className="font-semibold leading-tight text-navy">{l.name}</div>
                                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                                    <Phone size={9} />
                                    {l.phone}
                                  </div>
                                  <div className="mt-0.5 flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">{l.city ?? "—"}</span>
                                    <span className="font-mono text-[10px] font-bold text-accent">{fmtValue(l.value)}</span>
                                  </div>
                                  {l.property && (
                                    <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{l.property.title}</div>
                                  )}
                                  <div className="mt-1.5">
                                    <Badge tone={stageBadge[stage]}>{stage}</Badge>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {items.length === 0 && (
                            <p className="py-3 text-center text-[10px] text-muted-foreground">Drop here</p>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </Section>

      {selectedLead && (
        <LeadPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}
