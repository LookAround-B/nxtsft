"use client";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { TabHeader } from "./shared";
import { trpc } from "@/lib/trpc";

export function AITab() {
  const modelsQ = trpc.superAdmin.modelVersions.useQuery();
  const deploy = trpc.superAdmin.deployModel.useMutation({
    onSuccess: (m) => { modelsQ.refetch(); toast.success(`${m.name} deployed to live`); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const rollback = trpc.superAdmin.rollbackModel.useMutation({
    onSuccess: (m) => { modelsQ.refetch(); toast.success(`${m.name} rolled back`); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const models = modelsQ.data ?? [];
  const liveCount = models.filter((m) => m.status === "live").length;
  const canaryCount = models.filter((m) => m.status === "canary").length;
  const avgAccuracy = models.length
    ? models.reduce((s, m) => s + m.accuracy, 0) / models.length
    : 0;

  return (
    <>
      <TabHeader title="AI Model Control" subtitle="Production model versions, drift and rollout." />
      {modelsQ.isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading models…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Models Live" value={String(liveCount)} sub={`${canaryCount} in canary`} />
            <StatCard label="Total Models" value={String(models.length)} sub="in registry" />
            <StatCard label="Avg Accuracy" value={models.length ? `${avgAccuracy.toFixed(1)}%` : "—"} sub="across all models" />
          </div>

          <Section title="Model Registry">
            <div className="overflow-x-auto">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th className="py-2">Model</th>
                    <th>Purpose</th>
                    <th>Drift</th>
                    <th>Accuracy</th>
                    <th>Status</th>
                    <th>Deployed</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.id}>
                      <td className="font-mono text-xs">{m.name}</td>
                      <td className="text-sm font-semibold text-navy">{m.purpose}</td>
                      <td className={`font-mono text-xs ${m.drift > 1.5 ? "text-amber-600" : "text-emerald-600"}`}>
                        {m.drift.toFixed(1)}%
                      </td>
                      <td className="font-mono text-xs">{m.accuracy.toFixed(1)}%</td>
                      <td>
                        <Badge tone={m.status === "live" ? "success" : m.status === "canary" ? "warm" : "default"}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {m.deployedAt ? new Date(m.deployedAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="space-x-3 text-right">
                        {m.status !== "live" && (
                          <button onClick={() => deploy.mutate({ id: m.id })} disabled={deploy.isPending}
                            className="text-xs font-semibold text-accent hover:underline disabled:opacity-40">
                            Deploy
                          </button>
                        )}
                        {m.status === "live" && (
                          <button onClick={() => rollback.mutate({ id: m.id })} disabled={rollback.isPending}
                            className="text-xs font-semibold text-rose-500 hover:underline disabled:opacity-40">
                            Rollback
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </>
  );
}
