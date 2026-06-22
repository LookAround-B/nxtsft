"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Section, Badge, StatCard } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { PageHead } from "./PageHead";

const STATUSES = ["New", "In Progress", "Resolved", "Closed"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_TONE: Record<Status, "new" | "warm" | "success" | "cold"> = {
  New: "new",
  "In Progress": "warm",
  Resolved: "success",
  Closed: "cold",
};

export function EnquiriesTab() {
  const [filter, setFilter] = useState<"All" | Status>("All");
  const utils = trpc.useUtils();

  const statsQ = trpc.contact.stats.useQuery();
  const listQ = trpc.contact.list.useQuery({
    limit: 50,
    status: filter === "All" ? undefined : filter,
  });
  const items = listQ.data?.items ?? [];

  const updateStatus = trpc.contact.updateStatus.useMutation({
    onSuccess: () => {
      utils.contact.list.invalidate();
      utils.contact.stats.invalidate();
      toast.success("Status updated");
    },
    onError: (err) => toast.error(err.message || "Couldn't update status"),
  });

  const stats = statsQ.data;

  return (
    <>
      <PageHead title="Contact Enquiries" subtitle="Messages submitted from the public contact form." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total" value={String(stats?.total ?? "—")} />
        <StatCard label="New" value={String(stats?.new ?? "—")} accent="text-mid-blue" />
        <StatCard label="In Progress" value={String(stats?.inProgress ?? "—")} accent="text-amber-600" />
        <StatCard label="Resolved" value={String(stats?.resolved ?? "—")} />
        <StatCard label="Closed" value={String(stats?.closed ?? "—")} accent="text-muted-foreground" />
      </div>

      <Section title="Filter by status">
        <div className="flex flex-wrap gap-2">
          {(["All", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === s ? "border-accent bg-accent text-accent-foreground" : "border-border bg-white"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {listQ.isLoading && <div className="mt-4 text-sm text-muted-foreground">Loading enquiries…</div>}

        {!listQ.isLoading && items.length === 0 && (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-secondary/30 py-12 text-center text-sm text-muted-foreground">
            No enquiries yet.
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="py-2">Received</th>
                  <th>From</th>
                  <th>Contact</th>
                  <th>City</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Set status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })}
                    </td>
                    <td>
                      <div className="font-semibold text-navy">{e.name}</div>
                      <div className="text-xs text-muted-foreground">{e.email}</div>
                    </td>
                    <td className="text-xs">{e.phone ?? "—"}</td>
                    <td className="text-xs">{e.city ?? "—"}</td>
                    <td className="max-w-xs text-xs text-muted-foreground">
                      <span className="line-clamp-2" title={e.message}>{e.message}</span>
                    </td>
                    <td>
                      <Badge tone={STATUS_TONE[e.status as Status] ?? "new"}>{e.status}</Badge>
                    </td>
                    <td>
                      <select
                        value={e.status}
                        disabled={updateStatus.isPending}
                        onChange={(ev) =>
                          updateStatus.mutate({ id: e.id, status: ev.target.value as Status })
                        }
                        className="rounded-lg border border-border bg-white px-2 py-1 text-xs font-medium outline-none focus:border-accent"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
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
