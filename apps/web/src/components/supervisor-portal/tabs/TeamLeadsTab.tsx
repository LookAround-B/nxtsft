"use client";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { downloadCSV } from "@/lib/download-csv";
import { PageHead, daysSince, fmtRelative, type DbLead } from "./shared";

const rowBg: Record<string, string> = {
  Hot: "bg-red-50",
  Warm: "bg-amber-50",
  Cold: "bg-blue-50",
  New: "bg-white",
};

export function TeamLeadsTab() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const leadsQ = trpc.leads.list.useQuery({ limit: 100 });
  const items = (leadsQ.data?.items ?? []) as DbLead[];

  function handleExport() {
    const headers = ["ID", "Name", "Interest", "Source", "Status", "Days In Pipeline", "Last Activity"];
    const rows = items.map((l) => [
      l.id, l.name, l.interest ?? l.property?.title ?? "", l.source,
      l.status, String(daysSince(l.createdAt)), fmtRelative(l.updatedAt),
    ]);
    downloadCSV("team-leads.csv", headers, rows);
    toast.success("Team Leads CSV downloaded");
  }

  return (
    <>
      <PageHead title="Team Leads" sub="Every lead across the team — comment or reassign." />
      <Section
        title="All Leads"
        action={
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary transition"
          >
            <Download size={12} /> Export CSV
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="portal-table w-full text-sm">
            <thead>
              <tr>
                <th className="py-2 text-left">Lead</th>
                <th className="text-left">Interest</th>
                <th className="text-left">Source</th>
                <th className="text-left">Status</th>
                <th className="text-left">Pipeline</th>
                <th className="text-left">Last Activity</th>
                <th className="text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {leadsQ.isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Loading leads…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No leads found.
                  </td>
                </tr>
              ) : items.map((l) => (
                <Fragment key={l.id}>
                  <tr className={`${rowBg[l.status] ?? "bg-white"} transition-colors`}>
                    <td className="py-3">
                      <div className="font-semibold text-navy">{l.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{l.id.slice(0, 8)}…</div>
                    </td>
                    <td className="text-xs">{l.interest ?? l.property?.title ?? "—"}</td>
                    <td className="text-xs">{l.source}</td>
                    <td>
                      <Badge tone={l.status.toLowerCase() as "hot" | "warm" | "cold" | "new"}>
                        {l.status}
                      </Badge>
                    </td>
                    <td className="text-xs font-mono text-muted-foreground">
                      {daysSince(l.createdAt)}d
                    </td>
                    <td className="text-xs font-mono text-muted-foreground">
                      {fmtRelative(l.updatedAt)}
                    </td>
                    <td className="space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setExpandedRow(expandedRow === l.id ? null : l.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary transition"
                      >
                        + Add Note{" "}
                        {expandedRow === l.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                      <button
                        onClick={() => toast.success(`${l.id} reassigned`)}
                        className="rounded-md bg-mid-blue px-3 py-1 text-xs font-semibold text-white hover:opacity-90 transition"
                      >
                        Reassign
                      </button>
                    </td>
                  </tr>
                  {expandedRow === l.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={8} className="px-4 pb-4 pt-2">
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={notes[l.id] ?? ""}
                            onChange={(e) =>
                              setNotes((prev) => ({ ...prev, [l.id]: e.target.value }))
                            }
                            placeholder={`Add a note for ${l.name}…`}
                            rows={3}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                toast.success(`Note saved for ${l.name}`);
                                setExpandedRow(null);
                              }}
                              className="rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
                            >
                              Save Note
                            </button>
                            <button
                              onClick={() => setExpandedRow(null)}
                              className="rounded-md border border-border px-4 py-1.5 text-xs font-semibold hover:bg-secondary transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
