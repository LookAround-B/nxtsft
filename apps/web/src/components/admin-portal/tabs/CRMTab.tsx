"use client";
import { toast } from "sonner";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
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
    onSuccess: () => leadsQ.refetch(),
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const leads = (leadsQ.data?.items ?? []) as unknown as CrmLead[];

  const fmtValue = (v: number | null) =>
    v == null ? "—" : v >= 1e7 ? `₹${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(1)}L` : `₹${v.toLocaleString("en-IN")}`;

  const move = (id: string, status: CrmStage) =>
    updateStatus.mutate({ id, status }, { onSuccess: () => toast.success(`Moved to ${status}`) });

  return (
    <>
      <PageHead title="CRM Pipeline" subtitle="Lead funnel across all teams — move a lead to update its stage." />
      <Section title="Pipeline — All Teams" action={<Badge tone="new">{leads.length} leads</Badge>}>
        {leadsQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading pipeline…</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {CRM_STAGES.map((stage) => {
              const items = leads.filter((l) => l.status === stage);
              return (
                <div key={stage} className={`rounded-lg border-t-4 bg-secondary/60 p-3 ${stageAccent[stage]}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-navy">{stage}</span>
                    <span className="rounded-full bg-white px-1.5 text-[10px] font-bold text-mid-blue">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((l) => (
                      <div key={l.id} className="rounded-md bg-white p-2.5 text-xs shadow-sm">
                        <div className="font-semibold leading-tight text-navy">{l.name}</div>
                        <div className="mt-0.5 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">{l.city ?? "—"}</span>
                          <span className="font-mono text-[10px] font-bold text-accent">{fmtValue(l.value)}</span>
                        </div>
                        {l.property && (
                          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{l.property.title}</div>
                        )}
                        <Select value={l.status} onValueChange={(v) => move(l.id, v as CrmStage)} disabled={updateStatus.isPending}>
                          <SelectTrigger size="sm" className="mt-2 w-full px-1.5 py-1 text-[10px] font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CRM_STAGES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="py-2 text-center text-[10px] text-muted-foreground">Empty</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
