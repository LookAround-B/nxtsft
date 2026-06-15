"use client";
import { useState } from "react";
import { Bell, Plus, Pause, Play, X } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/portal/PortalShell";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Head, fmtDate } from "./shared";

type AlertFilters = { city?: string; bhk?: string; budget?: string };
type AlertItem = {
  id: string;
  name: string | null;
  filters: AlertFilters | null;
  active: boolean;
  frequency: string;
  lastTriggered: string | null;
};

const ALERT_BHK = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "4+ BHK"];
const ALERT_FREQ = ["instant", "daily", "weekly"] as const;

const emptyAlertForm = { name: "", city: "", bhk: "", budget: "", frequency: "daily" as string };

export function SearchAlertsTab() {
  const { session } = useAuth();
  const alertsQ = trpc.searchAlerts.list.useQuery(undefined, { enabled: !!session });
  const refetch = () => alertsQ.refetch();

  const createAlert = trpc.searchAlerts.create.useMutation({
    onSuccess: () => refetch(),
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const toggleAlert = trpc.searchAlerts.toggle.useMutation({ onSuccess: () => refetch() });
  const deleteAlert = trpc.searchAlerts.delete.useMutation({ onSuccess: () => refetch() });

  const alerts = (alertsQ.data ?? []) as unknown as AlertItem[];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyAlertForm);

  const submit = async () => {
    if (!form.city.trim() && !form.bhk && !form.budget.trim()) {
      toast.error("Add at least one criterion (city, BHK, or budget).");
      return;
    }
    const name = form.name.trim() || [form.bhk, form.city].filter(Boolean).join(" in ") || "New alert";
    const filters: AlertFilters = {};
    if (form.city.trim()) filters.city = form.city.trim();
    if (form.bhk) filters.bhk = form.bhk;
    if (form.budget.trim()) filters.budget = form.budget.trim();
    await createAlert.mutateAsync({
      name,
      filters,
      frequency: form.frequency as "daily" | "weekly" | "instant",
    });
    toast.success("Search alert created");
    setForm(emptyAlertForm);
    setShowForm(false);
  };

  return (
    <>
      <Head t="Search Alerts" s="Get notified when new properties match your saved searches." />

      <Section
        title="Your Saved Searches"
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
          >
            <Plus size={12} /> New Alert
          </button>
        }
      >
        {showForm && (
          <div className="mb-4 rounded-xl border border-border bg-secondary/20 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Alert name (optional)"
                className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="City / locality"
                className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <Select value={form.bhk || "__any"} onValueChange={(v) => setForm((f) => ({ ...f, bhk: v === "__any" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any">Any BHK</SelectItem>
                  {ALERT_BHK.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <input
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                placeholder="Budget (e.g. Up to ₹4 Cr)"
                className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_FREQ.map((fq) => <SelectItem key={fq} value={fq}>{fq[0].toUpperCase() + fq.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={submit}
                disabled={createAlert.isPending}
                className="rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-50"
              >
                {createAlert.isPending ? "Saving…" : "Create alert"}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm(emptyAlertForm); }}
                className="rounded-md border border-border px-4 py-1.5 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {alertsQ.isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-border p-4">
                <div className="h-4 w-48 rounded bg-secondary" />
                <div className="mt-2 h-3 w-32 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/20 py-14 text-center">
            <Bell size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No search alerts yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => {
              const tags = [a.filters?.city, a.filters?.bhk, a.filters?.budget].filter(Boolean) as string[];
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border p-4 transition-colors ${a.active ? "border-border bg-white" : "border-border bg-secondary/20"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-navy">{a.name ?? "Untitled alert"}</span>
                        {!a.active && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            Paused
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {tags.length ? tags.map((t, i) => (
                          <span key={i} className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {t}
                          </span>
                        )) : (
                          <span className="text-[10px] text-muted-foreground">No criteria set</span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="capitalize">{a.frequency}</span> alerts · Last checked: {fmtDate(a.lastTriggered)}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <button
                        onClick={() => toggleAlert.mutate({ id: a.id, active: !a.active })}
                        disabled={toggleAlert.isPending}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                          a.active
                            ? "border border-border text-muted-foreground hover:border-accent hover:text-accent"
                            : "bg-accent text-accent-foreground"
                        }`}
                      >
                        {a.active ? (<><Pause size={12} /> Pause</>) : (<><Play size={12} /> Resume</>)}
                      </button>
                      <button
                        onClick={() => deleteAlert.mutate({ id: a.id })}
                        disabled={deleteAlert.isPending}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-accent transition-colors disabled:opacity-50"
                      >
                        <X size={14} />
                      </button>
                    </div>
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
