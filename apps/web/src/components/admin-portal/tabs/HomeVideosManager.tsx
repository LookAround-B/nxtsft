"use client";
import { useEffect, useRef, useState } from "react";
import { X, ArrowUp, ArrowDown, Loader2, Plus, Video } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { toEmbedUrl } from "@/lib/youtube";

const VIDEOS_KEY = "home.videos";
const MAX_VIDEOS = 6;

type HomeVideo = { id: string; url: string; title?: string };

// Manages the promotional / testimonial videos shown on the public home page
// (VideoSection), stored in SiteSetting key "home.videos". Each video is a pasted
// YouTube/Vimeo link with an optional caption; a live preview confirms the link
// embeds before saving.
export function HomeVideosManager() {
  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState("");
  const [videos, setVideos] = useState<HomeVideo[]>([]);

  const q = trpc.siteContent.get.useQuery({ key: VIDEOS_KEY });
  const saveMutation = trpc.siteContent.set.useMutation({
    onSuccess: () => {
      toast.success("Videos saved.");
      q.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current || q.data === undefined) return;
    const cfg =
      (q.data as { heading?: string; subheading?: string; videos?: HomeVideo[] } | null) ?? null;
    setHeading(cfg?.heading ?? "");
    setSubheading(cfg?.subheading ?? "");
    setVideos(cfg?.videos ?? []);
    loaded.current = true;
  }, [q.data]);

  const addVideo = () => {
    if (videos.length >= MAX_VIDEOS) {
      toast.error(`You can add up to ${MAX_VIDEOS} videos.`);
      return;
    }
    setVideos((prev) => [...prev, { id: crypto.randomUUID(), url: "", title: "" }]);
  };
  const update = (id: string, patch: Partial<HomeVideo>) =>
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const removeAt = (id: string) => setVideos((prev) => prev.filter((v) => v.id !== id));
  const move = (i: number, dir: -1 | 1) =>
    setVideos((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  const save = () => {
    // Drop blank rows; block save on links that won't embed so a broken URL
    // never ships to the home page.
    const cleaned = videos
      .map((v) => ({ id: v.id, url: v.url.trim(), title: v.title?.trim() || undefined }))
      .filter((v) => v.url);
    const bad = cleaned.filter((v) => !toEmbedUrl(v.url));
    if (bad.length) {
      toast.error("Some links aren't valid YouTube/Vimeo URLs — fix or remove them before saving.");
      return;
    }
    saveMutation.mutate({
      key: VIDEOS_KEY,
      value: {
        heading: heading.trim() || undefined,
        subheading: subheading.trim() || undefined,
        videos: cleaned,
      },
    });
  };

  return (
    <Section title="Home Page Videos">
      <p className="mb-4 text-sm text-muted-foreground">
        Up to {MAX_VIDEOS} YouTube/Vimeo videos shown on the home page (after the reviews section) —
        great for plan promos or testimonials. Paste a normal YouTube link; it&apos;s converted to
        an embed automatically. With no videos, the section is hidden.
      </p>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          placeholder="Section heading (optional)"
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        />
        <input
          type="text"
          value={subheading}
          onChange={(e) => setSubheading(e.target.value)}
          placeholder="Sub-heading (optional)"
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        />
      </div>

      {videos.length > 0 && (
        <div className="space-y-3">
          {videos.map((v, i) => {
            const embed = toEmbedUrl(v.url);
            return (
              <div
                key={v.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 shadow-sm sm:flex-row"
              >
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-navy/5 sm:w-44">
                  {embed ? (
                    <iframe
                      src={embed}
                      title={v.title || `Video ${i + 1}`}
                      loading="lazy"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground">
                      <Video size={20} />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    type="text"
                    value={v.url}
                    onChange={(e) => update(v.id, { url: e.target.value })}
                    placeholder="YouTube link, e.g. https://youtu.be/abc123"
                    className="rounded-lg border border-border px-3 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    value={v.title ?? ""}
                    onChange={(e) => update(v.id, { title: e.target.value })}
                    placeholder="Caption (optional)"
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
                    disabled={i === videos.length - 1}
                    className="grid h-7 w-7 place-items-center rounded-full border border-border text-navy disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => removeAt(v.id)}
                    className="grid h-7 w-7 place-items-center rounded-full border border-border text-rose-500 hover:bg-rose-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={addVideo}
        disabled={videos.length >= MAX_VIDEOS}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm font-semibold text-navy transition hover:border-accent/40 hover:text-accent disabled:opacity-50"
      >
        <Plus size={15} /> Add video ({videos.length}/{MAX_VIDEOS})
      </button>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
        >
          {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
          Save Videos
        </button>
        <p className="text-xs text-muted-foreground">
          With no videos, the section is hidden on the home page.
        </p>
      </div>
    </Section>
  );
}
