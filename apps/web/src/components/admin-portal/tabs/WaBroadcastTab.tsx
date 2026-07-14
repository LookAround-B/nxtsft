"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Send } from "lucide-react";
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

export function WaBroadcastTab() {
  // Audience
  const [role, setRole] = useState("__any");
  const [city, setCity] = useState("");
  const [phoneVerified, setPhoneVerified] = useState<PhoneVerified>("any");
  const [optInOnly, setOptInOnly] = useState(true);

  // Message
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [params, setParams] = useState<string[]>([]);

  const audience = {
    role: role === "__any" ? undefined : (role as "user" | "home-seller" | "agent"),
    city: city.trim() || undefined,
    phoneVerified: phoneVerified === "any" ? undefined : phoneVerified === "yes",
    waOptIn: optInOnly ? true : undefined,
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
        </p>
      </div>

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
              <input type="checkbox" checked={optInOnly} onChange={(e) => setOptInOnly(e.target.checked)} />
              WhatsApp opt-in only <span className="text-xs text-muted-foreground">(required for marketing)</span>
            </label>

            <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
              <div className="text-2xl font-black text-accent">
                {previewQ.isLoading ? "…" : count.toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-muted-foreground">recipients match (with a phone)</div>
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
