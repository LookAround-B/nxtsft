"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { PageHead } from "./PageHead";
import { trpc } from "@/lib/trpc";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const TYPE_LABELS: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
const AUDIENCE_LABELS: Record<string, string> = { all: "All Users", user: "Buyers", sales: "Sales Reps", admin: "Admins" };

const EMPTY_FORM = { name: "", type: "email", audience: "all", subject: "", body: "", budget: "", scheduledAt: "" };

function fmtBudget(n: number | null) {
  if (!n) return "—";
  return n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;
}

function fmtCpl(budget: number | null, leads: number) {
  if (!budget || !leads) return "—";
  return `₹${Math.round(budget / leads).toLocaleString("en-IN")}`;
}

export function MarketingTab() {
  const campaignsQ = trpc.campaigns.list.useQuery();
  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      campaignsQ.refetch();
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      toast.success("Campaign created");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const updateStatus = trpc.campaigns.updateStatus.useMutation({
    onSuccess: () => campaignsQ.refetch(),
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const campaigns = campaignsQ.data ?? [];
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget ?? 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const avgCpl = totalLeads > 0 ? Math.round(totalBudget / totalLeads) : 0;

  const toggle = (id: string, current: string) => {
    const next = current === "active" ? "paused" : "active";
    updateStatus.mutate({ id, status: next }, { onSuccess: () => toast.success(`Campaign ${next}`) });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Campaign name is required"); return; }
    createMutation.mutate({
      name: form.name,
      type: form.type as "email" | "sms" | "whatsapp",
      audience: form.audience as "all" | "user" | "sales" | "admin",
      subject: form.subject || undefined,
      body: form.body || undefined,
      budget: form.budget ? parseInt(form.budget) : undefined,
      scheduledAt: form.scheduledAt || undefined,
    });
  };

  return (
    <>
      <PageHead title="Marketing" subtitle="Campaigns, attribution and creative library." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Budget" value={fmtBudget(totalBudget)} sub={`${campaigns.length} campaigns`} />
        <StatCard label="Leads Generated" value={String(totalLeads)} sub="across all campaigns" />
        <StatCard label="Avg CPL" value={avgCpl > 0 ? `₹${avgCpl.toLocaleString("en-IN")}` : "—"} sub="cost per lead" />
      </div>

      <Section
        title="Campaigns"
        action={
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-bold text-white transition hover:opacity-90">
            <Plus size={13} /> New Campaign
          </button>
        }
      >
        {campaignsQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No campaigns yet. Create your first one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2">Name</th>
                  <th>Type</th>
                  <th>Audience</th>
                  <th>Budget</th>
                  <th>Leads</th>
                  <th>CPL</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold text-navy">{c.name}</td>
                    <td className="text-xs">{TYPE_LABELS[c.type] ?? c.type}</td>
                    <td className="text-xs">{AUDIENCE_LABELS[c.audience] ?? c.audience}</td>
                    <td className="font-mono text-xs">{fmtBudget(c.budget)}</td>
                    <td>{c.leads}</td>
                    <td className="font-mono text-xs text-accent">{fmtCpl(c.budget, c.leads)}</td>
                    <td>
                      <Badge tone={c.status === "active" ? "success" : c.status === "paused" ? "cold" : "warm"}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="text-right">
                      {(c.status === "active" || c.status === "paused") && (
                        <button onClick={() => toggle(c.id, c.status)} className="text-xs font-semibold text-accent hover:underline" disabled={updateStatus.isPending}>
                          {c.status === "active" ? "Pause" : "Resume"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-navy">New Campaign</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-secondary"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy">Campaign Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Bandra Premium — Google" required
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy">Type</label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy">Audience</label>
                  <Select value={form.audience} onValueChange={(v) => setForm((f) => ({ ...f, audience: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="user">Buyers</SelectItem>
                      <SelectItem value="sales">Sales Reps</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.type === "email" && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy">Subject</label>
                  <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="Email subject line"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy">Message / Body</label>
                <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Campaign message content…" rows={3}
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy">Budget (₹)</label>
                  <input type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                    placeholder="e.g. 240000" min={0}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy">Schedule Date</label>
                  <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-navy transition hover:bg-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90 disabled:opacity-50">
                  {createMutation.isPending ? "Creating…" : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
