"use client";
import { toast } from "sonner";
import { Section, Badge } from "@/components/portal/PortalShell";
import { TabHeader, Toggle } from "./shared";

export function ConfigTab() {
  const flags: Array<[string, boolean, string]> = [
    ["AI Property Match v3", true, "Production"],
    ["WhatsApp Lead Capture", true, "Production"],
    ["Bulk Listing Import", false, "Beta"],
    ["Mortgage Calculator v2", true, "Production"],
    ["Builder Co-marketing", false, "Internal"],
    ["End-user Chat Widget", true, "Production"],
  ];
  const integrations: Array<[string, string]> = [
    ["Twilio SMS", "Connected"],
    ["SendGrid Email", "Connected"],
    ["Razorpay Payments", "Connected"],
    ["Google Maps", "Connected"],
    ["MagicBricks Sync", "Disconnected"],
    ["99acres Sync", "Connected"],
  ];
  return (
    <>
      <TabHeader
        title="Platform Configuration"
        subtitle="Feature flags, regions, and integration toggles."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Feature Flags">
          {flags.map(([name, on, env]) => (
            <div
              key={name}
              className="flex items-center justify-between border-b border-border py-3 last:border-0"
            >
              <div>
                <div className="text-sm font-semibold text-navy">{name}</div>
                <div className="text-xs text-muted-foreground">{env}</div>
              </div>
              <Toggle on={on} onToggle={() => toast(`Toggled: ${name}`)} />
            </div>
          ))}
        </Section>
        <Section title="Integrations">
          {integrations.map(([n, s]) => (
            <div
              key={n}
              className="flex items-center justify-between border-b border-border py-3 last:border-0"
            >
              <span className="text-sm font-semibold text-navy">{n}</span>
              <Badge tone={s === "Connected" ? "success" : "warm"}>{s}</Badge>
            </div>
          ))}
        </Section>
      </div>
    </>
  );
}
