"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Download, Loader2, ImageOff, Copy, Check } from "lucide-react";
import { ImageUploader, type UploadImage } from "@/components/ui/ImageUploader";
import { usePresignUploader } from "@/lib/upload";
import { trpc } from "@/lib/trpc";

// Standalone "upload photos → get URLs" utility. Each property is a separate
// dropzone, so photos map to a property by the card they're dropped on — never
// by upload order. That clean segregation is why there's no per-property photo
// cap. Photos go to R2 under the isolated `bulk-photos/` prefix (compressed +
// watermarked like every other listing photo), and the resulting cdn URLs are
// exported as a CSV whose "Image URLs" column drops straight into the bulk
// listing template. Kept decoupled from listing creation on purpose: many
// sellers upload photos up front and attach them to listings later.
const MAX_PHOTOS_PER_PROPERTY = 10;

type Group = { id: string; label: string; images: UploadImage[] };
type ResultRow = { label: string; urls: string[] };

const newGroup = (): Group => ({ id: crypto.randomUUID(), label: "", images: [] });

// CSV cell escape — quote when the value has a comma, quote or newline.
const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function downloadCsv(rows: ResultRow[]) {
  const body = rows
    .map((r) => `${esc(r.label)},${esc(r.urls.join(","))}`)
    .join("\n");
  const csv = `Property,Image URLs\n${body}\n`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  a.download = "bulk-photo-urls.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy — select and copy manually.");
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-semibold text-navy transition hover:border-accent hover:text-accent"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy URLs"}
    </button>
  );
}

export function BulkPhotoUploader() {
  const storage = trpc.media.storageStatus.useQuery();
  const { upload } = usePresignUploader();

  const [groups, setGroups] = useState<Group[]>([newGroup()]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResultRow[] | null>(null);

  const labelFor = (g: Group, i: number) => g.label.trim() || `Property ${i + 1}`;

  const setImages = (id: string, next: UploadImage[]) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, images: next } : g)));
  const setLabel = (id: string, label: string) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, label } : g)));
  const removeGroup = (id: string) =>
    setGroups((prev) => (prev.length === 1 ? prev : prev.filter((g) => g.id !== id)));

  const totalPhotos = groups.reduce((n, g) => n + g.images.length, 0);

  const generate = async () => {
    const filled = groups.filter((g) => g.images.length > 0);
    if (!filled.length) {
      toast.error("Add photos to at least one property first.");
      return;
    }

    setBusy(true);
    setResult(null);
    try {
      // One upload call per property keeps the URL→property mapping exact —
      // upload() returns URLs in input order, so each group's URLs stay grouped.
      const rows: ResultRow[] = [];
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i]!;
        if (!g.images.length) continue;
        const urls = await upload(g.images.map((img) => img.file), "bulk-photos");
        rows.push({ label: labelFor(g, i), urls });
      }
      downloadCsv(rows);
      setResult(rows);
      toast.success(`${rows.reduce((n, r) => n + r.urls.length, 0)} photo(s) uploaded · CSV downloaded.`);
    } catch {
      toast.error("Upload failed — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (storage.data && !storage.data.configured) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        <ImageOff size={18} /> Image storage isn&apos;t configured, so photo upload is unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Add a card per property and drop its photos there — up to{" "}
          {MAX_PHOTOS_PER_PROPERTY} each. Photos are compressed and watermarked automatically.
          Click <strong>Upload &amp; download URLs</strong> to push them to storage and get a CSV.
          The CSV&apos;s <strong>Image URLs</strong> column pastes straight into the bulk listing
          template.
        </p>
      </div>

      {groups.map((g, i) => (
        <div key={g.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <input
              value={g.label}
              onChange={(e) => setLabel(g.id, e.target.value)}
              placeholder={`Property ${i + 1}`}
              className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-navy outline-none focus:border-accent"
            />
            {groups.length > 1 && (
              <button
                type="button"
                onClick={() => removeGroup(g.id)}
                aria-label={`Remove ${labelFor(g, i)}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-rose-300 hover:text-rose-500"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
          <ImageUploader
            images={g.images}
            onChange={(next) => setImages(g.id, next)}
            max={MAX_PHOTOS_PER_PROPERTY}
          />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setGroups((prev) => [...prev, newGroup()])}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy transition hover:border-accent hover:text-accent disabled:opacity-60"
        >
          <Plus size={15} /> Add property
        </button>
        <button
          type="button"
          onClick={generate}
          disabled={busy || totalPhotos === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {busy ? "Uploading…" : `Upload & download URLs${totalPhotos ? ` (${totalPhotos})` : ""}`}
        </button>
      </div>

      {result && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-display text-base font-bold text-navy">
            Uploaded — CSV downloaded
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Copy any property&apos;s URLs into the <strong>Image URLs</strong> cell of your bulk
            listing file, or use the downloaded CSV.
          </p>
          <div className="space-y-3">
            {result.map((r, i) => (
              <div key={i} className="rounded-lg border border-border bg-secondary/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-navy">{r.label}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{r.urls.length} photo(s)</span>
                    <CopyButton text={r.urls.join(",")} />
                  </div>
                </div>
                <textarea
                  readOnly
                  value={r.urls.join("\n")}
                  rows={Math.min(r.urls.length, 4)}
                  className="w-full resize-none rounded-md border border-border bg-white px-2.5 py-2 font-mono text-[11px] text-foreground/80 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
