"use client";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { downloadCSV } from "@/lib/download-csv";
import { TabHeader } from "./shared";

type AuditRow = {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  ipAddress: string | null;
  createdAt: string;
};

export function AuditTab() {
  const auditQ = trpc.admin.auditLog.useQuery({ limit: 100 });
  const rows = (auditQ.data?.items ?? []) as unknown as AuditRow[];
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <TabHeader
        title="Audit Trail"
        subtitle="Every privileged action across the platform."
        action={
          <button
            onClick={() =>
              downloadCSV(
                "audit-trail.csv",
                ["Time", "Actor", "Action", "Entity", "Entity ID", "IP"],
                rows.map((r) => [fmt(r.createdAt), r.userId ?? "system", r.action, r.entity, r.entityId, r.ipAddress ?? ""]),
              )
            }
            className="text-xs font-semibold text-accent hover:underline"
          >
            Export CSV →
          </button>
        }
      />
      <Section title="Recent activity">
        {auditQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading audit trail…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No audit entries recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2">Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono text-xs">{fmt(a.createdAt)}</td>
                    <td className="font-mono text-xs text-muted-foreground">{a.userId ? a.userId.slice(0, 8) : "system"}</td>
                    <td className="text-sm font-semibold text-navy">{a.action}</td>
                    <td><Badge tone="default">{a.entity}</Badge></td>
                    <td className="font-mono text-xs text-muted-foreground">{a.entityId ? a.entityId.slice(0, 8) : "—"}</td>
                    <td className="font-mono text-xs">{a.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
