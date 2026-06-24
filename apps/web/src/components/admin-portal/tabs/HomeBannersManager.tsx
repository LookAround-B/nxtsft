"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, X, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { validateImageFile } from "@/lib/file-validation";

const BANNERS_KEY = "home.banners";
const MAX_BANNERS = 4;

type ContentType = "image/jpeg" | "image/png" | "image/webp";
type Banner = { id: string; image: string; title?: string; link?: string };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Manages the promotional banners shown on the public home page (BannerSection),
// stored in SiteSetting key "home.banners". Each banner is an uploaded image
// with an optional title overlay and click-through link.
export function HomeBannersManager() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [uploading, setUploading] = useState(false);

  const q = trpc.siteContent.get.useQuery({ key: BANNERS_KEY });
  const uploadMutation = trpc.media.uploadImage.useMutation();
  const saveMutation = trpc.siteContent.set.useMutation({
    onSuccess: () => {
      toast.success("Banners saved.");
      q.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current || q.data === undefined) return;
    setBanners((q.data as { banners?: Banner[] } | null)?.banners ?? []);
    loaded.current = true;
  }, [q.data]);

  const addFiles = async (files: FileList | File[]) => {
    const room = MAX_BANNERS - banners.length;
    if (room <= 0) {
      toast.error(`You can have up to ${MAX_BANNERS} banners.`);
      return;
    }
    setUploading(true);
    try {
      const added: Banner[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        const err = validateImageFile(file);
        if (err) {
          toast.error(`${file.name}: ${err.message}`);
          continue;
        }
        const data = await fileToBase64(file);
        const { url } = await uploadMutation.mutateAsync({
          contentType: file.type as ContentType,
          data,
          folder: "site",
        });
        added.push({ id: crypto.randomUUID(), image: url });
      }
      if (added.length) setBanners((prev) => [...prev, ...added]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const update = (id: string, patch: Partial<Banner>) =>
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeAt = (id: string) => setBanners((prev) => prev.filter((b) => b.id !== id));
  const move = (i: number, dir: -1 | 1) =>
    setBanners((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  return (
    <Section title="Promotional Banners">
      <p className="mb-4 text-sm text-muted-foreground">
        Up to {MAX_BANNERS} banners shown near the bottom of the home page. Add an optional title
        and a link to make a banner clickable.
      </p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || banners.length >= MAX_BANNERS}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-8 text-center transition hover:border-accent/40 hover:bg-accent/5 disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 size={22} className="animate-spin text-accent" />
        ) : (
          <ImagePlus size={22} className="text-accent" />
        )}
        <span className="text-sm font-semibold text-navy">
          {uploading ? "Uploading…" : "Click to upload a banner image"}
        </span>
        <span className="text-xs text-muted-foreground">
          Wide images work best (≈21:9) · up to 5MB · {banners.length}/{MAX_BANNERS}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {banners.length > 0 && (
        <div className="mt-4 space-y-3">
          {banners.map((b, i) => (
            <div
              key={b.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 shadow-sm sm:flex-row"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.image}
                alt={b.title ?? `Banner ${i + 1}`}
                className="h-24 w-full shrink-0 rounded-lg object-cover sm:w-44"
              />
              <div className="flex flex-1 flex-col gap-2">
                <input
                  type="text"
                  value={b.title ?? ""}
                  onChange={(e) => update(b.id, { title: e.target.value })}
                  placeholder="Title (optional)"
                  className="rounded-lg border border-border px-3 py-1.5 text-sm"
                />
                <input
                  type="text"
                  value={b.link ?? ""}
                  onChange={(e) => update(b.id, { link: e.target.value })}
                  placeholder="Link, e.g. /properties?type=Villa (optional)"
                  className="rounded-lg border border-border px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex items-center gap-1 sm:flex-col">
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
                  disabled={i === banners.length - 1}
                  className="grid h-7 w-7 place-items-center rounded-full border border-border text-navy disabled:opacity-30"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => removeAt(b.id)}
                  className="grid h-7 w-7 place-items-center rounded-full border border-border text-rose-500 hover:bg-rose-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            saveMutation.mutate({
              key: BANNERS_KEY,
              value: {
                banners: banners.map((b) => ({
                  id: b.id,
                  image: b.image,
                  title: b.title?.trim() || undefined,
                  link: b.link?.trim() || undefined,
                })),
              },
            })
          }
          disabled={saveMutation.isPending || uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
        >
          {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
          Save Banners
        </button>
        <p className="text-xs text-muted-foreground">
          With no banners, the section is hidden on the home page.
        </p>
      </div>
    </Section>
  );
}
