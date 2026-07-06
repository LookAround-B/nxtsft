"use client";
import { useState } from "react";
import { Sofa, PlusCircle, X, CheckCircle, XCircle, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { StatCard, Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { ListSkeleton } from "@/components/ui/skeleton";
import { PageHead } from "./PageHead";

type DesignerRow = {
  id: string; companyName: string; city: string; state: string | null;
  phone: string; email: string | null; status: string; verified: boolean;
  projectsCompleted: number; yearsExperience: number | null;
  designStyles: string[]; createdAt: string;
};

function splitList(s: string): string[] {
  return s.split(",").map((v) => v.trim()).filter(Boolean);
}

// ─── Create Designer Panel ────────────────────────────────────────────────────
function CreateDesignerPanel({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    companyName: "", city: "", state: "", phone: "", email: "",
    description: "", website: "", workingHours: "",
    yearsExperience: "", projectsCompleted: "", startingBudget: "",
    designStyles: "", servicesOffered: "", areasServed: "", portfolioImages: "",
    portfolioVideos: "", virtualTourUrl: "", walkthroughVideoUrl: "",
  });

  const createMutation = trpc.admin.interiorDesigners.create.useMutation({
    onSuccess: () => { toast.success("Designer listing created — pending review."); onCreated(); onClose(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (form.companyName.trim().length < 2) return toast.error("Company name is required.");
    if (!form.city.trim()) return toast.error("City is required.");
    if (!form.phone.trim()) return toast.error("Phone is required.");
    createMutation.mutate({
      companyName: form.companyName.trim(),
      city: form.city.trim(),
      state: form.state.trim() || undefined,
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      description: form.description.trim() || undefined,
      website: form.website.trim() || undefined,
      workingHours: form.workingHours.trim() || undefined,
      yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
      projectsCompleted: form.projectsCompleted ? Number(form.projectsCompleted) : undefined,
      startingBudget: form.startingBudget ? Number(form.startingBudget) : undefined,
      designStyles: splitList(form.designStyles),
      servicesOffered: splitList(form.servicesOffered),
      areasServed: splitList(form.areasServed),
      portfolioImages: splitList(form.portfolioImages),
      portfolioVideos: splitList(form.portfolioVideos),
      virtualTourUrl: form.virtualTourUrl.trim() || undefined,
      walkthroughVideoUrl: form.walkthroughVideoUrl.trim() || undefined,
    });
  };

  return (
    <div className="mb-4 rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-navy">Add Interior Design Company</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input value={form.companyName} onChange={set("companyName")} placeholder="Company name *" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.city} onChange={set("city")} placeholder="City *" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.state} onChange={set("state")} placeholder="State" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.phone} onChange={set("phone")} placeholder="Phone *" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.email} onChange={set("email")} placeholder="Email" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.website} onChange={set("website")} placeholder="Website" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.workingHours} onChange={set("workingHours")} placeholder="Working hours (e.g. Mon–Sat 10am–7pm)" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.yearsExperience} onChange={set("yearsExperience")} type="number" placeholder="Years of experience" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.projectsCompleted} onChange={set("projectsCompleted")} type="number" placeholder="Projects completed" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.startingBudget} onChange={set("startingBudget")} type="number" placeholder="Starting budget (₹)" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
      </div>

      <textarea value={form.description} onChange={set("description")} placeholder="Company description" rows={2} className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />

      <div className="grid gap-2 sm:grid-cols-2">
        <input value={form.designStyles} onChange={set("designStyles")} placeholder="Design styles (comma-separated: Modern, Minimal)" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.servicesOffered} onChange={set("servicesOffered")} placeholder="Services offered (comma-separated)" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.areasServed} onChange={set("areasServed")} placeholder="Areas served (comma-separated)" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.portfolioImages} onChange={set("portfolioImages")} placeholder="Portfolio image URLs (comma-separated)" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.portfolioVideos} onChange={set("portfolioVideos")} placeholder="Project video embed URLs (comma-separated)" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.virtualTourUrl} onChange={set("virtualTourUrl")} placeholder="360° virtual tour embed URL" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <input value={form.walkthroughVideoUrl} onChange={set("walkthroughVideoUrl")} placeholder="Walkthrough video embed URL" className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
      </div>

      <button
        onClick={submit}
        disabled={createMutation.isPending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {createMutation.isPending ? "Creating…" : "Create Listing"}
      </button>
    </div>
  );
}

// ─── Leads Panel ───────────────────────────────────────────────────────────────
function LeadsPanel() {
  const leadsQ = trpc.admin.interiorDesigners.leads.useQuery({ limit: 50 });
  const leads = leadsQ.data ?? [];

  return (
    <Section title={`Recent Contact Unlocks ${leads.length > 0 ? `(${leads.length})` : ""}`}>
      {leadsQ.isLoading ? (
        <ListSkeleton rows={4} />
      ) : leads.length === 0 ? (
        <div className="py-10 text-center">
          <Users size={26} className="mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No leads yet — leads appear here when a user unlocks a designer's contact.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {leads.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0">
              <div className="min-w-0">
                <span className="font-semibold text-navy">{l.lead?.name ?? "Unknown user"}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  unlocked {l.designer?.companyName ?? "a designer"} ({l.designer?.city})
                </span>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                {new Date(l.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Main Interiors Tab ────────────────────────────────────────────────────────
export function InteriorsTab() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "active" | "inactive" | undefined>("pending");
  const [showCreate, setShowCreate] = useState(false);

  // limitSchema caps list inputs at 100 — anything higher fails validation with a 400.
  const listQ = trpc.admin.interiorDesigners.list.useQuery({ limit: 100, status: statusFilter });
  const allQ = trpc.admin.interiorDesigners.list.useQuery({ limit: 100 });
  const items = ((listQ.data as { items?: DesignerRow[] } | undefined)?.items ?? []);
  const allItems = ((allQ.data as { items?: DesignerRow[] } | undefined)?.items ?? []);

  const refetchAll = () => { void listQ.refetch(); void allQ.refetch(); };

  const setStatusMutation = trpc.admin.interiorDesigners.setStatus.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.status === "active" ? "Designer approved — now live." : `Marked ${vars.status}.`);
      refetchAll();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const deleteMutation = trpc.admin.interiorDesigners.delete.useMutation({
    onSuccess: () => { toast.success("Listing deleted."); refetchAll(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const pendingCount = allItems.filter((d) => d.status === "pending").length;
  const activeCount = allItems.filter((d) => d.status === "active").length;

  return (
    <>
      <PageHead
        title="Home Interiors"
        subtitle="Verify and publish interior design company listings, and review contact-unlock leads."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Pending Review" value={String(pendingCount)} sub="Needs your action" accent={pendingCount > 0 ? "text-amber-600" : undefined} />
        <StatCard label="Live Listings" value={String(activeCount)} sub="Visible on /interiors" />
        <StatCard label="Total Listings" value={String(allItems.length)} sub="All statuses" />
        <StatCard label="Inactive" value={String(allItems.filter((d) => d.status === "inactive").length)} sub="Unpublished" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-1">
        <span className="text-xs font-semibold text-muted-foreground">Status:</span>
        {([undefined, "pending", "active", "inactive"] as const).map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${statusFilter === s ? "bg-navy text-white" : "border border-border hover:bg-secondary"}`}
          >
            {s ?? "All"}{s === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
        >
          <PlusCircle size={13} />
          Add Designer
        </button>
      </div>

      {showCreate && <CreateDesignerPanel onClose={() => setShowCreate(false)} onCreated={refetchAll} />}

      <Section title={`${statusFilter ?? "All"} Listings ${items.length > 0 ? `(${items.length})` : ""}`}>
        {listQ.isLoading ? (
          <ListSkeleton rows={5} />
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <Sofa size={28} className="mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {statusFilter === "pending" ? "No pending listings — all caught up!" : "No listings found."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((d) => {
              const statusColor =
                d.status === "active" ? "bg-emerald-100 text-emerald-700"
                : d.status === "inactive" ? "bg-rose-100 text-rose-700"
                : "bg-amber-100 text-amber-700";
              return (
                <div key={d.id} className="flex items-center gap-4 py-4 first:pt-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-accent text-xs font-black text-white">
                    {d.companyName.split(" ").map((s) => s[0] ?? "").join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-navy">{d.companyName}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>{d.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[d.city, d.state].filter(Boolean).join(", ")} · {d.phone} · {d.projectsCompleted} projects
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {d.status !== "active" && (
                      <button
                        onClick={() => setStatusMutation.mutate({ id: d.id, status: "active" })}
                        disabled={setStatusMutation.isPending}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-emerald-200 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-40"
                        title="Approve & publish"
                      >
                        <CheckCircle size={13} />
                      </button>
                    )}
                    {d.status !== "inactive" && (
                      <button
                        onClick={() => setStatusMutation.mutate({ id: d.id, status: "inactive" })}
                        disabled={setStatusMutation.isPending}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-rose-200 text-rose-500 transition hover:bg-rose-50 disabled:opacity-40"
                        title="Deactivate"
                      >
                        <XCircle size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm("Delete this listing?")) deleteMutation.mutate({ id: d.id }); }}
                      disabled={deleteMutation.isPending}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-accent hover:text-accent disabled:opacity-40"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <LeadsPanel />
    </>
  );
}
