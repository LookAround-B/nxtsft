"use client";
import { useState } from "react";
import { Plus, X, Download, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { PageHead } from "./PageHead";
import { trpc } from "@/lib/trpc";
import { TableSkeleton, ListSkeleton } from "@/components/ui/skeleton";
import { SITE_URL } from "@/lib/site";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const TYPE_LABELS: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
const AUDIENCE_LABELS: Record<string, string> = { all: "All Users", user: "Buyers", sales: "Sales Reps", admin: "Admins" };

const EMPTY_FORM = { name: "", type: "email", audience: "all", subject: "", body: "", budget: "", scheduledAt: "" };

// WhatsApp marketing carousels max out at 10 cards per message.
const MAX_CAROUSEL_CARDS = 10;

const DEFAULT_INTRO =
  "Looking for your dream home? 🏡 Explore top properties on NxtSft.com — sign up today and get FREE credits to unlock owner contacts! 🎁";

type CarouselProperty = {
  id: string;
  slug: string;
  title: string;
  price: number;
  purpose: string;
  images: string[];
  location: { city: string; locality: string };
};

function fmtPrice(price: number): string {
  if (price >= 1_00_00_000) return `₹${(price / 1_00_00_000).toFixed(2)} Cr`;
  if (price >= 1_00_000) return `₹${(price / 1_00_000).toFixed(1)} L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

function fmtBudget(n: number | null) {
  if (!n) return "—";
  return n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;
}

function fmtCpl(budget: number | null, leads: number) {
  if (!budget || !leads) return "—";
  return `₹${Math.round(budget / leads).toLocaleString("en-IN")}`;
}

// LA-301: builds a Housing.com-style WhatsApp property carousel for bulk
// marketing. There is no WhatsApp Business API integration yet, so this
// produces the vendor-ready assets (CSV / JSON payload with card image, title,
// price and a UTM-tagged link per property) that ops upload to the bulk-send
// vendor, and records the blast as a "whatsapp" campaign for attribution.
function CarouselBuilder({ onSaved }: { onSaved: () => void }) {
  const propsQ = trpc.properties.list.useQuery({ page: 1, limit: 30 });
  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      toast.success("Saved as WhatsApp campaign");
      onSaved();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [name, setName] = useState("");
  const [intro, setIntro] = useState(DEFAULT_INTRO);
  const [selected, setSelected] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const all = (propsQ.data?.items ?? []) as CarouselProperty[];
  const chosen = all.filter((p) => selected.includes(p.id));

  const toggle = (id: string) => {
    setSelected((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      if (ids.length >= MAX_CAROUSEL_CARDS) {
        toast.error(`WhatsApp carousels support at most ${MAX_CAROUSEL_CARDS} cards.`);
        return ids;
      }
      return [...ids, id];
    });
  };

  const campaignSlug = (name.trim() || "whatsapp-carousel")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const cards = chosen.map((p) => ({
    title: p.title,
    image: new URL(p.images[0] ?? "/categories/apartment.png", SITE_URL).toString(),
    price: `${fmtPrice(p.price)}${p.purpose === "Rent" ? "/mo" : ""}`,
    location: `${p.location.locality}, ${p.location.city}`,
    link: `${SITE_URL}/properties/${p.slug}?utm_source=whatsapp&utm_medium=carousel&utm_campaign=${campaignSlug}`,
  }));

  const downloadCsv = () => {
    const rows = [
      ["title", "image_url", "price", "location", "button_text", "button_url"],
      ...cards.map((c) => [c.title, c.image, c.price, c.location, "View Property", c.link]),
    ];
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaignSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJson = async () => {
    const payload = { campaign: name.trim() || "WhatsApp carousel", intro, cards };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Carousel JSON copied");
  };

  const saveCampaign = () => {
    if (!name.trim()) { toast.error("Campaign name is required"); return; }
    if (cards.length === 0) { toast.error("Select at least one property"); return; }
    const body = [intro, "", ...cards.map((c) => `${c.title} — ${c.price} — ${c.link}`)]
      .join("\n")
      .slice(0, 5000);
    createMutation.mutate({ name: name.trim(), type: "whatsapp", audience: "all", body });
  };

  return (
    <Section title="WhatsApp Property Carousel">
      <p className="mb-4 text-xs text-muted-foreground">
        Pick up to {MAX_CAROUSEL_CARDS} properties, then export the card deck for the bulk-WhatsApp
        vendor. Links are UTM-tagged so signups attribute back to this campaign.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-navy">Campaign Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hyderabad Featured — July"
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-navy">Intro Message</label>
          <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={2}
            className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-navy">
          Properties <span className="font-normal text-muted-foreground">({selected.length}/{MAX_CAROUSEL_CARDS} selected)</span>
        </p>
        {propsQ.isLoading ? (
          <ListSkeleton rows={4} />
        ) : (
          <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {all.map((p) => {
              const active = selected.includes(p.id);
              return (
                <button key={p.id} type="button" onClick={() => toggle(p.id)}
                  className={`flex items-center gap-3 rounded-xl border p-2 text-left transition ${active ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images[0] ?? "/categories/apartment.png"} alt=""
                    className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-navy">{p.title}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {fmtPrice(p.price)}{p.purpose === "Rent" ? "/mo" : ""} · {p.location.city}
                    </span>
                  </span>
                  {active && <Check size={14} className="ml-auto shrink-0 text-accent" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {cards.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-navy">Preview</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {cards.map((c) => (
              <div key={c.link} className="w-44 shrink-0 overflow-hidden rounded-xl border border-border bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt="" className="h-24 w-full object-cover" />
                <div className="p-2">
                  <p className="truncate text-[11px] font-semibold text-navy">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground">{c.location}</p>
                  <p className="mt-1 text-xs font-bold text-accent">{c.price}</p>
                  <p className="mt-1.5 rounded-md bg-secondary py-1 text-center text-[10px] font-semibold text-navy">View Property</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={downloadCsv} disabled={cards.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-navy transition hover:bg-secondary disabled:opacity-50">
          <Download size={13} /> Vendor CSV
        </button>
        <button type="button" onClick={copyJson} disabled={cards.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-navy transition hover:bg-secondary disabled:opacity-50">
          {copied ? <Check size={13} /> : <Copy size={13} />} Copy JSON
        </button>
        <button type="button" onClick={saveCampaign} disabled={createMutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50">
          {createMutation.isPending ? "Saving…" : "Save as Campaign"}
        </button>
      </div>
    </Section>
  );
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
          <TableSkeleton rows={4} cols={7} />
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

      <CarouselBuilder onSaved={() => campaignsQ.refetch()} />

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
