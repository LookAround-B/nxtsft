"use client";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { TabHeader } from "./shared";

export function AITab() {
  const models: Array<[string, string, string, string, boolean]> = [
    ["nxtsft-match-v3", "Property Match", "0.4%", "94.2%", true],
    ["nxtsft-price-v2", "Price Estimator", "1.1%", "88.6%", true],
    ["nxtsft-lead-score", "Lead Scoring", "0.8%", "91.0%", true],
    ["nxtsft-recommend", "Recommendations", "2.3%", "82.4%", false],
  ];
  return (
    <>
      <TabHeader
        title="AI Model Control"
        subtitle="Production model versions, drift and rollout."
        action={
          <button
            onClick={() => toast.success("Model deployment pipeline triggered")}
            className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition"
          >
            + Deploy Model
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Models Live" value="3" sub="1 in canary" />
        <StatCard label="Inference / hr" value="184k" sub="↑ +6% vs avg" />
        <StatCard label="p95 Latency" value="142ms" sub="↓ −8ms wk" />
      </div>
      <Section title="Production Models">
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">Model</th>
                <th>Purpose</th>
                <th>Drift</th>
                <th>Accuracy</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {models.map(([id, p, d, a, live]) => (
                <tr key={id}>
                  <td className="font-mono text-xs">{id}</td>
                  <td className="text-sm font-semibold text-navy">{p}</td>
                  <td className="font-mono text-xs">{d}</td>
                  <td className="font-mono text-xs">{a}</td>
                  <td>
                    <Badge tone={live ? "success" : "warm"}>{live ? "Live" : "Canary"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
