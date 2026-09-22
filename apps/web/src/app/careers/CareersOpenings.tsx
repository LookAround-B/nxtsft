"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Briefcase, MapPin, Loader2, X, Upload, ArrowRight, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Job = {
  id: string;
  title: string;
  location?: string;
  type?: string;
  department?: string;
  description?: string;
};

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Open Positions on the careers page: admin-managed jobs (careers.listJobs) with
// an Apply modal that uploads a PDF résumé (or takes a link) and files an
// application. Renders a friendly empty state when there are no open roles.
export function CareersOpenings() {
  const q = trpc.careers.listJobs.useQuery();
  const jobs = ((q.data as { jobs?: Job[] } | null)?.jobs ?? []).filter((j) => j.title);
  const [applyFor, setApplyFor] = useState<Job | null>(null);

  return (
    <section id="openings" className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <div className="mb-8 text-center">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-gradient-accent">
          Open roles
        </div>
        <h2 className="font-display text-3xl font-black text-navy sm:text-4xl">Current openings</h2>
      </div>

      {q.isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-secondary/40" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-10 text-center">
          <p className="text-muted-foreground">
            No open roles right now — but we&apos;re always keen to meet great people.
          </p>
          <a
            href="mailto:jobs@nxtsft.com"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-display text-sm font-bold text-white shadow-lg shadow-accent/40 transition hover:opacity-90"
          >
            Send us your CV
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-accent/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold text-navy">{job.title}</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground">
                  {job.department && (
                    <span className="inline-flex items-center gap-1">
                      <Briefcase size={12} /> {job.department}
                    </span>
                  )}
                  {job.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} /> {job.location}
                    </span>
                  )}
                  {job.type && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent">{job.type}</span>
                  )}
                </div>
                {job.description && (
                  <p className="mt-2 text-sm leading-relaxed text-foreground/70">{job.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setApplyFor(job)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-display text-sm font-bold text-white shadow transition hover:opacity-90"
              >
                Apply <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {applyFor && <ApplyModal job={applyFor} onClose={() => setApplyFor(null)} />}
    </section>
  );
}

function ApplyModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const uploadResume = trpc.media.uploadResume.useMutation();
  const submitApplication = trpc.careers.submitApplication.useMutation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please enter your name and email.");
      return;
    }
    if (!file && !link.trim()) {
      toast.error("Attach a résumé PDF or paste a link to it.");
      return;
    }
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Résumé must be a PDF file.");
        return;
      }
      if (file.size > MAX_RESUME_BYTES) {
        toast.error("Résumé exceeds the 5 MB limit.");
        return;
      }
    }

    setBusy(true);
    try {
      let resumeUrl: string | undefined;
      if (file) {
        const data = await fileToBase64(file);
        const res = await uploadResume.mutateAsync({ data });
        resumeUrl = res.url;
      }
      await submitApplication.mutateAsync({
        jobId: job.id,
        jobTitle: job.title,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        message: message.trim() || undefined,
        resumeUrl,
        resumeLink: link.trim() || undefined,
      });
      toast.success("Application submitted — thank you! We'll be in touch.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit your application. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-gradient-accent">Apply</div>
            <h3 className="font-display text-xl font-black text-navy">{job.title}</h3>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name *"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email *"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              required
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          {/* Résumé: PDF upload OR a link */}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-3 text-sm transition hover:border-accent/40">
            {file ? <FileText size={18} className="text-accent" /> : <Upload size={18} className="text-accent" />}
            <span className="min-w-0 flex-1 truncate text-navy">
              {file ? file.name : "Upload résumé (PDF, up to 5 MB)"}
            </span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="…or paste a résumé link (Drive / LinkedIn)"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="A short note (optional)"
            rows={3}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-display text-sm font-bold text-white shadow transition hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {busy ? "Submitting…" : "Submit application"}
          </button>
        </form>
      </div>
    </div>
  );
}
