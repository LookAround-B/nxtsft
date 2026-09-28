"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Send, Trash2, Pencil } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

type PhoneVerified = "any" | "yes" | "no";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "__any", label: "Any role" },
  { value: "user", label: "Home Buyers" },
  { value: "home-seller", label: "Home Sellers" },
  { value: "agent", label: "Agents / Partners" },
];

type TemplateCategory = "Utility" | "Marketing" | "Authentication";
const CATEGORIES: TemplateCategory[] = ["Utility", "Marketing", "Authentication"];
const CATEGORY_NOTE: Record<TemplateCategory, string> = {
  Utility: "Updates about a user's account, listing or payment",
  Marketing: "Offers & promotions: opted-in users only",
  Authentication: "OTP / login codes",
};
type Template = { name: string; category: TemplateCategory; language: string; body: string; variables: number };

/** Approved BhashSMS templates, copied once into our dashboard, by category. */
function TemplateLibrary({ onUse }: { onUse: (t: Template) => void }) {
  const utils = trpc.useUtils();
  const listQ = trpc.campaigns.waTemplates.useQuery();
  const [cat, setCat] = useState<TemplateCategory>("Utility");
  const empty = { name: "", category: cat, language: "en", body: "", variables: 0 } as Template;
  const [draft, setDraft] = useState<Template | null>(null);
  const save = trpc.campaigns.saveWaTemplate.useMutation({
    onSuccess: () => { toast.success("Template saved"); setDraft(null); void utils.campaigns.waTemplates.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.campaigns.deleteWaTemplate.useMutation({
    onSuccess: () => { toast.success("Template removed"); void utils.campaigns.waTemplates.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const all = (listQ.data ?? []) as Template[];
  const shown = all.filter((t) => t.category === cat);
  const inputCls = "w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent";

  return (
    <Section
      title="Template library"
      action={
        <button onClick={() => setDraft({ ...empty, category: cat })} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
          <Plus size={12} /> Add template
        </button>
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">
        Copy each approved template from the BhashSMS dashboard once (exact name + text). Then pick it here to send.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${cat === c ? "border-accent bg-accent text-accent-foreground" : "border-border bg-white"}`}
          >
            {c === "Authentication" ? "OTP / Authentication" : c} ({all.filter((t) => t.category === c).length})
          </button>
        ))}
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">{CATEGORY_NOTE[cat]}</p>

      {draft && (
        <div className="mb-4 space-y-2 rounded-xl border border-accent/30 bg-accent/5 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value.trim() })} placeholder="template_name (exact)" className={inputCls} />
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as TemplateCategory })} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" min={0} max={10} value={draft.variables} onChange={(e) => setDraft({ ...draft, variables: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })} placeholder="No. of {{variables}}" className={inputCls} />
          </div>
          <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={3} placeholder="Template text as approved, e.g. Hi {{1}}, your listing is live…" className={inputCls} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setDraft(null)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">Cancel</button>
            <button disabled={save.isPending} onClick={() => save.mutate(draft)} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No {cat.toLowerCase()} templates yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border">
          {shown.map((t) => (
            <div key={t.name} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm font-bold text-navy">{t.name}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.body}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{t.variables} variable{t.variables === 1 ? "" : "s"}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => onUse(t)} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white">Use</button>
                <button onClick={() => setDraft(t)} aria-label="Edit template" className="text-muted-foreground hover:text-accent"><Pencil size={14} /></button>
                <button onClick={() => confirm(`Remove ${t.name} from the library?`) && del.mutate({ name: t.name })} aria-label="Delete template" className="text-muted-foreground hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

export function WaBroadcastTab() {
  // Audience
  const [role, setRole] = useState("__any");
  const [city, setCity] = useState("");
  const [phoneVerified, setPhoneVerified] = useState<PhoneVerified>("any");
  const [optInOnly, setOptInOnly] = useState(true);

  // Message
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const libraryQ = trpc.campaigns.waTemplates.useQuery();
  const chosen = ((libraryQ.data ?? []) as Template[]).find((t) => t.name === templateName.trim());
  // Rule: Marketing (or a template not in the library) → opted-in users only.
  const forcedOptIn = !chosen || chosen.category === "Marketing";
  const [params, setParams] = useState<string[]>([]);

  const audience = {
    role: role === "__any" ? undefined : (role as "user" | "home-seller" | "agent"),
    city: city.trim() || undefined,
    phoneVerified: phoneVerified === "any" ? undefined : phoneVerified === "yes",
    waOptIn: optInOnly || forcedOptIn ? true : undefined,
  };

  const previewQ = trpc.campaigns.audiencePreview.useQuery(audience);
  const broadcastsQ = trpc.campaigns.broadcasts.useQuery(undefined, { refetchInterval: 10_000 });

  const launch = trpc.campaigns.launchWhatsApp.useMutation({
    onSuccess: () => {
      toast.success("Broadcast queued — it will send in the background.");
      setName("");
      setTemplateName("");
      setParams([]);
      broadcastsQ.refetch();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const cancel = trpc.campaigns.cancelBroadcast.useMutation({
    onSuccess: () => { toast.success("Broadcast cancelled"); broadcastsQ.refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const count = previewQ.data?.count ?? 0;

  const submit = () => {
    if (name.trim().length < 3) { toast.error("Give the broadcast a name (min 3 chars)."); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(templateName.trim())) { toast.error("Enter the approved template name."); return; }
    if (count === 0) { toast.error("No recipients match this audience."); return; }
    if (!confirm(`Send "${templateName.trim()}" to ${count.toLocaleString("en-IN")} recipients?`)) return;
    launch.mutate({
      name: name.trim(),
      templateName: templateName.trim(),
      params: params.map((p) => p.trim()).filter(Boolean),
      audience,
    });
  };

  return (
    <>
      <div className="mb-5">
        <h2 className="font-display text-xl font-black text-navy">WhatsApp Broadcast</h2>
        <p className="text-sm text-muted-foreground">
          Send an approved WhatsApp template to an audience segment. Sends throttle in the background.
          Only real users receive it: staff, seed, test and dummy accounts are always excluded.
        </p>
      </div>

      <TemplateLibrary
        onUse={(t) => {
          setTemplateName(t.name);
          setParams((prev) => Array.from({ length: t.variables }, (_, i) => prev[i] ?? (i === 0 ? "{firstName}" : "")));
          setOptInOnly(t.category === "Marketing");
          toast.success(`Using ${t.name}. Fill in the variables and send.`);
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Audience */}
        <Section title="1. Audience">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy">Role</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy">City (contains)</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Hyderabad — leave blank for all"
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy">Phone verified</label>
              <Select value={phoneVerified} onValueChange={(v) => setPhoneVerified(v as PhoneVerified)}>
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="yes">Verified only</SelectItem>
                  <SelectItem value="no">Unverified only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={optInOnly || forcedOptIn}
                disabled={forcedOptIn}
                onChange={(e) => setOptInOnly(e.target.checked)}
              />
              WhatsApp opt-in only{" "}
              <span className="text-xs text-muted-foreground">
                {forcedOptIn
                  ? chosen
                    ? "(always on for Marketing templates)"
                    : "(on until you pick a Utility template from the library)"
                  : "(optional for Utility templates)"}
              </span>
            </label>

            <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
              <div className="text-2xl font-black text-accent">
                {previewQ.isLoading ? "…" : count.toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-muted-foreground">real users match (with a phone)</div>
              {previewQ.data && previewQ.data.sample.length > 0 && (
                <div className="mt-1 truncate text-[11px] text-muted-foreground">
                  e.g. {previewQ.data.sample.map((s) => s.name).join(", ")}
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* 2. Message */}
        <Section title="2. Message">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy">Broadcast name (internal)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hyderabad new homes — July"
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy">Approved template name</label>
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. welcome_offer (exact BhashSMS name)"
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Must be an approved template. Variables below fill {"{{1}}, {{2}}…"} in order.
              </p>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-navy">Variables (in order)</label>
                <button
                  type="button"
                  onClick={() => setParams((p) => [...p, ""])}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              {params.length === 0 && (
                <p className="text-[11px] text-muted-foreground">No variables — add one if your template uses {"{{1}}"} etc.</p>
              )}
              <div className="space-y-2">
                {params.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">{`{{${i + 1}}}`}</span>
                    <input
                      value={p}
                      onChange={(e) => setParams((arr) => arr.map((v, j) => (j === i ? e.target.value : v)))}
                      placeholder="text or {firstName} / {name} / {city}"
                      className="flex-1 rounded-md border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent"
                    />
                    <button type="button" onClick={() => setParams((arr) => arr.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tokens <code>{"{firstName}"}</code>, <code>{"{name}"}</code>, <code>{"{city}"}</code> are personalised per recipient.
              </p>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={launch.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              <Send size={15} />
              {launch.isPending ? "Queuing…" : `Send to ${count.toLocaleString("en-IN")}`}
            </button>
          </div>
        </Section>
      </div>

      <Section title="Broadcasts">
        {broadcastsQ.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (broadcastsQ.data?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No broadcasts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2">Name</th>
                  <th>Template</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {broadcastsQ.data!.map((b) => {
                  const tone =
                    b.status === "completed" ? "success" : b.status === "cancelled" ? "warm" : "new";
                  return (
                    <tr key={b.id}>
                      <td className="font-semibold text-navy">{b.name}</td>
                      <td className="text-xs">{b.templateName}</td>
                      <td><Badge tone={tone as "success" | "warm" | "new"}>{b.status}</Badge></td>
                      <td className="text-xs">
                        {b.sent}/{b.total} sent{b.failed > 0 ? ` · ${b.failed} failed` : ""}
                      </td>
                      <td className="text-right">
                        {b.status === "queued" || b.status === "sending" ? (
                          <button
                            onClick={() => cancel.mutate({ id: b.id })}
                            disabled={cancel.isPending}
                            className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
