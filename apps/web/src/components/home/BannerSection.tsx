"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import { trpc } from "@/lib/trpc";

export type HomeBanner = { id: string; image: string; title?: string; link?: string };

// Admin-managed promotional banners shown on the home page. Content lives in
// the SiteSetting row keyed "home.banners" (edited in admin-portal#site-content).
// Renders nothing when no banners are configured, so the section stays hidden
// until an admin adds one.
export function BannerSection() {
  const q = trpc.siteContent.get.useQuery({ key: "home.banners" });
  const banners = ((q.data as { banners?: HomeBanner[] } | null)?.banners ?? []).filter(
    (b) => b.image,
  );

  // Banners mount after the tRPC query resolves — after the home page's
  // mount-time reveal observer has already run — so their [data-reveal]
  // elements would stay opacity:0 forever. Run our own observer once they
  // load (mirrors FeaturedProperties' dynamic-card handling).
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

  if (banners.length === 0) return null;

  return (
    <section className="px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div
          className={`grid gap-3 sm:gap-4 ${banners.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}
        >
          {banners.map((b) => {
            const card = (
              <div className="group relative aspect-[21/9] overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <SafeImage
                  src={b.image}
                  alt={b.title ?? "Promotional banner"}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                {b.title && (
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-navy/70 to-transparent p-5">
                    <h3 className="font-display text-lg font-black text-white drop-shadow sm:text-xl">
                      {b.title}
                    </h3>
                  </div>
                )}
              </div>
            );
            return b.link ? (
              <Link key={b.id} href={b.link} data-reveal="scale">
                {card}
              </Link>
            ) : (
              <div key={b.id} data-reveal="scale">
                {card}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
