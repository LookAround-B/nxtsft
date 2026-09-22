"use client";
import { useEffect, useRef, useState } from "react";
import { X, ArrowUp, ArrowDown, Loader2, Plus, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";

type Job = {
  id: string;
  title: string;
  location?: string;
  type?: string;
  department?: string;
  description?: string;
};

const STATUSES = ["New", "Shortlisted", "Rejected", "Hired"] as const;
type Status = (typeof STATUSES)[number];
const MAX_JOBS = 50;

export function CareersTab() {
  return (
    <div className="space-y-6">
      <JobsManager />
      <ApplicationsList />
    </div>
  );
}

// ── Job postings (admin-managed, stored in siteContent "careers.jobs") ─────────
function JobsManager() {
  const [jobs, setJobs] = useState<Job[]>([]);

  const q = trpc.careers.listJobs.useQuery();
  const saveMutation = trpc.careers.setJobs.useMutation({
    onSuccess: () => {
      toast.success("Job postings saved.");
      q.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current || q.data === undefined) return;
    setJobs(((q.data as { jobs?: Job[] } | null)?.jobs ?? []).map((j) => ({ ...j })));
    loaded.current = true;
  }, [q.data]);

  const addJob = () => {
    if (jobs.length >= MAX_JOBS) {
      toast.error(`You can list up to ${MAX_JOBS} roles.`);
      return;
    }
    setJobs((prev) => [...prev, { id: crypto.randomUUID(), title: "" }]);
  };
  const update = (id: string, patch: Partial<Job>) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  const removeAt = (id: string) => setJobs((prev) => prev.filter((j) => j.id !== id));
  const move = (i: number, dir: -1 | 1) =>
    setJobs((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  const save = () => {
    const cleaned = jobs
      .map((j) => ({
        id: j.id,
        title: j.title.trim(),
        location: j.location?.trim() || undefined,
        type: j.type?.trim() || undefined,
        department: j.department?.trim() || undefined,
        description: j.description?.trim() || undefined,
      }))
      .filter((j) => j.title);
    if (cleaned.length !== jobs.length) {
      toast.error("Every role needs a title (remove blank rows).");
      return;
    }
    saveMutation.mutate({ jobs: cleaned });
  };

  return (
    <Section title="Job Postings">
      <p className="mb-4 text-sm text-muted-foreground">
        Roles shown in the &ldquo;Open positions&rdquo; section of the public careers page. With no
        postings, that section shows a friendly &ldquo;no open roles&rdquo; message.
      </p>

      {jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <div key={job.id} className="rounded-xl border border-border bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    type="text"
                    value={job.title}
                    onChange={(e) => update(job.id, { title: e.target.value })}
                    placeholder="Role title, e.g. Senior Full-Stack Engineer *"
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold"
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      type="text"
                      value={job.department ?? ""}
                      onChange={(e) => update(job.id, { department: e.target.value })}
                      placeholder="Department"
                      className="rounded-lg border border-border px-3 py-1.5 text-sm"
                    />
                    <input
                      type="text"
                      value={job.location ?? ""}
                      onChange={(e) => update(job.id, { location: e.target.value })}
                      placeholder="Location"
                      className="rounded-lg border border-border px-3 py-1.5 text-sm"
                    />
                    <input
                      type="text"
                      value={job.type ?? ""}
                      onChange={(e) => update(job.id, { type: e.target.value })}
                      placeholder="Type, e.g. Full-time"
                      className="rounded-lg border border-border px-3 py-1.5 text-sm"
                    />
                  </div>
                  <textarea
                    value={job.description ?? ""}
                    onChange={(e) => update(job.id, { description: e.target.value })}
                    placeholder="Short description (optional)"
                    rows={2}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    aria-label="Move up"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="grid h-7 w-7 place-items-center rounded-full border border-border text-navy disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    onClick={() => move(i, 1)}
                    disabled={i === jobs.length - 1}
                    className="grid h-7 w-7 place-items-center rounded-full border border-border text-navy disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => removeAt(job.id)}
                    className="grid h-7 w-7 place-items-center rounded-full border border-border text-rose-500 hover:bg-rose-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addJob}
        disabled={jobs.length >= MAX_JOBS}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm font-semibold text-navy transition hover:border-accent/40 hover:text-accent disabled:opacity-50"
      >
        <Plus size={15} /> Add role ({jobs.length}/{MAX_JOBS})
      </button>

      <div className="mt-5">
        <button
          type="button"
          onClick={save}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
        >
          {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
          Save Postings
        </button>
      </div>
    </Section>
  );
}

// ── Applications (review + status) ─────────────────────────────────────────────
function ApplicationsList() {
  const [filter, setFilter] = useState<Status | "All">("All");
  const q = trpc.careers.listApplications.useQuery(
    filter === "All" ? undefined : { status: filter },
  );
  const setStatus = trpc.careers.setApplicationStatus.useMutation({
    onSuccess: () => q.refetch(),
    onError: (e) => toast.error(e.message),
  });

  const apps = q.data ?? [];

  return (
    <Section title="Applications">
      <div className="mb-4 flex flex-wrap gap-2">
        {(["All", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              filter === s
                ? "border-accent bg-accent text-white"
                : "border-border bg-white text-navy hover:border-accent/40"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : apps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No applications yet.</p>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm font-bold text-navy">{a.name}</span>
                  <span className="text-xs text-muted-foreground">· {a.jobTitle}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <a href={`mailto:${a.email}`} className="hover:text-accent">
                    {a.email}
                  </a>
                  {a.phone && <span>{a.phone}</span>}
                  <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
                {a.message && (
                  <p className="mt-1.5 text-xs leading-relaxed text-foreground/70">{a.message}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-3">
                  {a.resumeUrl && (
                    <a
                      href={a.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                    >
                      <FileText size={13} /> Résumé (PDF)
                    </a>
                  )}
                  {a.resumeLink && (
                    <a
                      href={a.resumeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                    >
                      <ExternalLink size={13} /> Résumé link
                    </a>
                  )}
                </div>
              </div>
              <select
                value={a.status}
                onChange={(e) => setStatus.mutate({ id: a.id, status: e.target.value as Status })}
                className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-navy"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
