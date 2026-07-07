"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, X, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { Section, Badge, StatCard } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { TableSkeleton } from "@/components/ui/skeleton";
import { PageHead } from "./PageHead";

const STATUSES = ["New", "In Progress", "Resolved", "Closed"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_TONE: Record<Status, "new" | "warm" | "success" | "cold"> = {
  New: "new",
  "In Progress": "warm",
  Resolved: "success",
  Closed: "cold",
};

type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  message: string;
  status: string;
  source: string;
  createdAt: string | Date;
};

function fmtDateTime(d: string | Date): string {
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EnquiryModal({
  enquiry,
  onClose,
  onStatusChange,
  updating,
}: {
  enquiry: Enquiry;
  onClose: () => void;
  onStatusChange: (status: Status) => void;
  updating: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-navy">{enquiry.name}</h2>
            <p className="text-xs text-muted-foreground">{enquiry.source}</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-5 space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <a
              href={`mailto:${enquiry.email}`}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition hover:border-accent hover:bg-accent/5"
            >
              <Mail size={14} className="shrink-0 text-blue-500" />
              <span className="truncate text-navy">{enquiry.email}</span>
            </a>
            {enquiry.phone && (
              <a
                href={`tel:${enquiry.phone}`}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition hover:border-accent hover:bg-accent/5"
              >
                <Phone size={14} className="shrink-0 text-emerald-500" />
                <span className="text-navy">{enquiry.phone}</span>
              </a>
            )}
            {enquiry.city && (
              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <MapPin size={14} className="shrink-0 text-muted-foreground" />
                <span className="text-navy">{enquiry.city}</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <Calendar size={14} className="shrink-0 text-muted-foreground" />
              <span className="text-navy">{fmtDateTime(enquiry.createdAt)}</span>
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Message</h3>
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-navy whitespace-pre-wrap break-words">
              {enquiry.message}
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</h3>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(s)}
                  disabled={s === enquiry.status || updating}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    s === enquiry.status
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-white text-navy hover:border-accent hover:text-accent disabled:opacity-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EnquiriesTab() {
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const utils = trpc.useUtils();

  const statsQ = trpc.contact.stats.useQuery();
  const listQ = trpc.contact.list.useQuery({
    limit: 50,
    status: filter === "All" ? undefined : filter,
  });
  const items = listQ.data?.items ?? [];

  const updateStatus = trpc.contact.updateStatus.useMutation({
    onSuccess: (_data, vars) => {
      utils.contact.list.invalidate();
      utils.contact.stats.invalidate();
      setSelected((prev) => (prev && prev.id === vars.id ? { ...prev, status: vars.status } : prev));
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

        {listQ.isLoading && <div className="mt-4"><TableSkeleton rows={5} cols={5} /></div>}

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
                  <th>Source</th>
                  <th>Contact</th>
                  <th>City</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Set status</th>
                  <th>View</th>
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
                    <td>
                      <Badge tone={e.source === "PG Media Package" ? "hot" : "default"}>{e.source}</Badge>
                    </td>
                    <td className="text-xs">{e.phone ?? "—"}</td>
                    <td className="text-xs">{e.city ?? "—"}</td>
                    <td className="max-w-xs text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => setSelected(e as Enquiry)}
                        className="line-clamp-2 text-left hover:text-accent hover:underline"
                        title="Click to view full message"
                      >
                        {e.message}
                      </button>
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
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelected(e as Enquiry)}
                        aria-label="View enquiry"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-accent hover:text-accent"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {selected && (
        <EnquiryModal
          enquiry={selected}
          onClose={() => setSelected(null)}
          updating={updateStatus.isPending}
          onStatusChange={(status) => updateStatus.mutate({ id: selected.id, status })}
        />
      )}
    </>
  );
}
