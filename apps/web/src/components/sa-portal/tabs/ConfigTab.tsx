"use client";
import { useMemo } from "react";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { TabHeader, Toggle } from "./shared";

// Canonical definitions live on the frontend; the backend persists only the
// on/off state keyed by `key` (see superAdmin.getPlatformConfig).
const FLAGS: Array<{ key: string; name: string; env: string; default: boolean }> = [
  { key: "ai_match_v3", name: "AI Property Match v3", env: "Production", default: true },
  { key: "whatsapp_capture", name: "WhatsApp Lead Capture", env: "Production", default: true },
  { key: "bulk_import", name: "Bulk Listing Import", env: "Beta", default: false },
  { key: "mortgage_calc_v2", name: "Mortgage Calculator v2", env: "Production", default: true },
  { key: "builder_comarketing", name: "Builder Co-marketing", env: "Internal", default: false },
  { key: "chat_widget", name: "End-user Chat Widget", env: "Production", default: true },
];

const INTEGRATIONS: Array<{ key: string; name: string; default: boolean }> = [
  { key: "twilio", name: "Twilio SMS", default: true },
  { key: "sendgrid", name: "SendGrid Email", default: true },
  { key: "razorpay", name: "Razorpay Payments", default: true },
  { key: "google_maps", name: "Google Maps", default: true },
];

export function ConfigTab() {
  const configQ = trpc.superAdmin.getPlatformConfig.useQuery();
  const update = trpc.superAdmin.updatePlatformConfig.useMutation({
    onError: (e: { message: string }) => {
      toast.error(e.message);
      configQ.refetch();
    },
  });

  const gatewayQ = trpc.superAdmin.getActiveGateway.useQuery();
  const setGateway = trpc.superAdmin.setActiveGateway.useMutation({
    onSuccess: (data) => {
      gatewayQ.refetch();
      toast.success(`Payment gateway switched to ${data.gateway === "razorpay" ? "Razorpay" : "PayU"}`);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // Resolved on/off state: saved value falls back to each item's default.
  const flagState = useMemo(() => {
    const saved = configQ.data?.config?.flags ?? {};
    return Object.fromEntries(FLAGS.map((f) => [f.key, saved[f.key] ?? f.default]));
  }, [configQ.data]);

  const integrationState = useMemo(() => {
    const saved = configQ.data?.config?.integrations ?? {};
    return Object.fromEntries(INTEGRATIONS.map((i) => [i.key, saved[i.key] ?? i.default]));
  }, [configQ.data]);

  function persist(flags: Record<string, boolean>, integrations: Record<string, boolean>) {
    update.mutate(
      { config: { flags, integrations } },
      { onSuccess: () => configQ.refetch() },
    );
  }

  function toggleFlag(key: string, name: string) {
    const next = { ...flagState, [key]: !flagState[key] };
    persist(next, integrationState);
    toast(`${next[key] ? "Enabled" : "Disabled"}: ${name}`);
  }

  function toggleIntegration(key: string, name: string) {
    const next = { ...integrationState, [key]: !integrationState[key] };
    persist(flagState, next);
    toast(`${name} ${next[key] ? "connected" : "disconnected"}`);
  }

  return (
    <>
      <TabHeader
        title="Platform Configuration"
        subtitle="Feature flags, regions, and integration toggles."
      />
      {/* ── Payment Gateway Switcher ─────────────────────────────────────── */}
      <Section title="Payment Gateway">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-3">
            <CreditCard size={18} className="mt-0.5 text-accent shrink-0" />
            <div>
              <div className="text-sm font-semibold text-navy">Active Checkout Gateway</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Controls which payment gateway is used at checkout for all users.
                Razorpay = card/UPI popup. PayU = redirect flow.
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border p-1">
            {(["razorpay", "payu"] as const).map((gw) => {
              const active = (gatewayQ.data?.gateway ?? "razorpay") === gw;
              return (
                <button
                  key={gw}
                  disabled={setGateway.isPending || gatewayQ.isLoading}
                  onClick={() => !active && setGateway.mutate({ gateway: gw })}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-accent text-white shadow-sm"
                      : "text-muted-foreground hover:text-navy"
                  } disabled:opacity-60`}
                >
                  {gw === "razorpay" ? "Razorpay" : "PayU"}
                </button>
              );
            })}
          </div>
        </div>
        {gatewayQ.data && (
          <div className="mt-3 text-xs text-muted-foreground">
            Currently active:{" "}
            <span className="font-semibold text-navy">
              {gatewayQ.data.gateway === "razorpay" ? "Razorpay (card / UPI popup)" : "PayU (redirect)"}
            </span>
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Feature Flags">
          {FLAGS.map((f) => (
            <div
              key={f.key}
              className="flex items-center justify-between border-b border-border py-3 last:border-0"
            >
              <div>
                <div className="text-sm font-semibold text-navy">{f.name}</div>
                <div className="text-xs text-muted-foreground">{f.env}</div>
              </div>
              <Toggle on={!!flagState[f.key]} onToggle={() => toggleFlag(f.key, f.name)} />
            </div>
          ))}
        </Section>
        <Section title="Integrations">
          {INTEGRATIONS.map((i) => {
            const connected = !!integrationState[i.key];
            return (
              <div
                key={i.key}
                className="flex items-center justify-between border-b border-border py-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-navy">{i.name}</span>
                  <Badge tone={connected ? "success" : "warm"}>
                    {connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <Toggle on={connected} onToggle={() => toggleIntegration(i.key, i.name)} />
              </div>
            );
          })}
        </Section>
      </div>
    </>
  );
}
