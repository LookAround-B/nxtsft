"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, X, ArrowLeft, ArrowRight, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/portal/PortalShell";
import { PageHead } from "./PageHead";
import { trpc } from "@/lib/trpc";
import { validateImageFile } from "@/lib/file-validation";
import { HomeBannersManager } from "./HomeBannersManager";

const HERO_KEY = "home.hero";
const MAX_HERO = 6;

type ContentType = "image/jpeg" | "image/png" | "image/webp";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SiteContentTab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const heroQ = trpc.siteContent.get.useQuery({ key: HERO_KEY });
  const uploadMutation = trpc.media.uploadImage.useMutation();
  const saveMutation = trpc.siteContent.set.useMutation({
    onSuccess: () => {
      toast.success("Hero images saved.");
      heroQ.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // Seed local state once from the server value.
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current || heroQ.data === undefined) return;
    const imgs = (heroQ.data as { images?: string[] } | null)?.images ?? [];
    setImages(imgs);
    loaded.current = true;
  }, [heroQ.data]);

  const addFiles = async (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const room = MAX_HERO - images.length;
    if (room <= 0) {
      toast.error(`You can have up to ${MAX_HERO} hero images.`);
      return;
    }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of incoming.slice(0, room)) {
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
        urls.push(url);
      }
      if (urls.length) setImages((prev) => [...prev, ...urls]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    setImages((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  };

  return (
    <>
      <PageHead
        title="Home Page Content"
        subtitle="Manage the hero banner images shown at the top of the public home page."
      />

      <Section title="Hero Images">
        <p className="mb-4 text-sm text-muted-foreground">
          Up to {MAX_HERO} images. The first image leads the rotating carousel.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || images.length >= MAX_HERO}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-8 text-center transition hover:border-accent/40 hover:bg-accent/5 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={22} className="animate-spin text-accent" />
          ) : (
            <ImagePlus size={22} className="text-accent" />
          )}
          <span className="text-sm font-semibold text-navy">
            {uploading ? "Uploading…" : "Click to upload hero images"}
          </span>
          <span className="text-xs text-muted-foreground">
            JPEG, PNG or WebP · up to 5MB each · {images.length}/{MAX_HERO}
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

        {images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((src, i) => (
              <div
                key={src}
                className="group relative aspect-video overflow-hidden rounded-xl border border-border bg-white shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Hero ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white shadow">
                    <Star size={10} fill="currentColor" /> First
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-navy/60 px-2 py-1 opacity-0 transition group-hover:opacity-100">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Move left"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-navy disabled:opacity-30"
                    >
                      <ArrowLeft size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label="Move right"
                      onClick={() => move(i, 1)}
                      disabled={i === images.length - 1}
                      className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-navy disabled:opacity-30"
                    >
                      <ArrowRight size={13} />
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => removeAt(i)}
                    className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-rose-500 hover:bg-rose-500 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => saveMutation.mutate({ key: HERO_KEY, value: { images } })}
            disabled={saveMutation.isPending || uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Save Changes
          </button>
          <p className="text-xs text-muted-foreground">
            Leave empty to fall back to the built-in default images.
          </p>
        </div>
      </Section>

      <HomeBannersManager />
    </>
  );
}
