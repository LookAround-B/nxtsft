"use client";
import { useState, useEffect, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
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
  city: string | null;
  status: string;
  value: number | null;
  interest: string | null;
  property: { id: string; title: string; slug: string } | null;
};

export function CRMTab() {
  const leadsQ = trpc.admin.leads.list.useQuery({ limit: 100 });
  const updateStatus = trpc.leads.updateStatus.useMutation({
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const serverLeads = useMemo(
    () => (leadsQ.data?.items ?? []) as unknown as CrmLead[],
    [leadsQ.data],
  );
  const [leads, setLeads] = useState<CrmLead[]>([]);
  useEffect(() => { setLeads(serverLeads); }, [serverLeads]);

  const fmtValue = (v: number | null) =>
    v == null ? "—" : v >= 1e7 ? `₹${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(1)}L` : `₹${v.toLocaleString("en-IN")}`;

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

  return (
    <>
      <PageHead title="CRM Pipeline" subtitle="Drag a lead card between columns to move it through the funnel." />
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
                                  className={`cursor-grab select-none rounded-md bg-white p-2.5 text-xs shadow-sm transition-shadow active:cursor-grabbing ${dragSnapshot.isDragging ? "rotate-1 opacity-95 shadow-lg" : ""}`}
                                >
                                  <div className="font-semibold leading-tight text-navy">{l.name}</div>
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
    </>
  );
}
