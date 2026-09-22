"use client";

import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toEmbedUrl } from "@/lib/youtube";
import { Eyebrow } from "@/components/home/Eyebrow";

export type HomeVideo = { id: string; url: string; title?: string };
type HomeVideosConfig = { heading?: string; subheading?: string; videos?: HomeVideo[] };

// Admin-managed promotional / testimonial videos on the home page. Content lives
// in the SiteSetting row keyed "home.videos" (edited in admin-portal#site-content
// via HomeVideosManager). Renders nothing until an admin configures at least one
// embeddable video, so the section stays hidden by default.
export function VideoSection() {
  const q = trpc.siteContent.get.useQuery({ key: "home.videos" });
  const cfg = (q.data as HomeVideosConfig | null) ?? null;

  // Keep only videos whose pasted URL normalizes to an embeddable iframe src —
  // a raw youtube.com/watch link won't render in an <iframe> otherwise.
  const videos = (cfg?.videos ?? [])
    .map((v) => ({ ...v, embed: toEmbedUrl(v.url) }))
    .filter((v): v is HomeVideo & { embed: string } => Boolean(v.embed));

  // The section mounts after the tRPC query resolves — after the home page's
  // mount-time reveal observer already ran — so its [data-reveal] nodes would
  // stay at opacity 0. Re-run an observer once loaded (mirrors BannerSection).
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-visible])");
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).setAttribute("data-visible", "");
            obs.unobserve(e.target);
          }
        }),
      { threshold: 0.08, rootMargin: "0px 0px -52px 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [q.data]);

  if (videos.length === 0) return null;

  const heading = cfg?.heading?.trim() || "Watch NxtSft in action";
  const cols =
    videos.length === 1
      ? "mx-auto max-w-3xl grid-cols-1"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center" data-reveal>
          <Eyebrow>Videos</Eyebrow>
          <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">{heading}</h2>
          {cfg?.subheading?.trim() && (
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {cfg.subheading}
            </p>
          )}
        </div>

        <div className={`grid gap-5 sm:gap-6 ${cols}`}>
          {videos.map((v) => (
            <figure
              key={v.id}
              data-reveal="scale"
              className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
            >
              <div className="relative aspect-video w-full bg-navy/5">
                <iframe
                  src={v.embed}
                  title={v.title || "NxtSft video"}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
              {v.title?.trim() && (
                <figcaption className="px-4 py-3 text-sm font-semibold text-navy">
                  {v.title}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
