"use client";

import { useState, useEffect } from "react";
import { SafeImage } from "@/components/ui/SafeImage";
import { WatermarkOverlay } from "@/components/ui/WatermarkOverlay";
import Link from "next/link";
import { Star as StarIcon, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Eyebrow } from "@/components/home/Eyebrow";
import {
  PROPERTY_TABS,
  TAB_TYPE_MAP,
  type FeaturedProp,
  fmtPrice,
} from "@/components/home/homeData";

const PAGE_SIZE = 18;

export function FeaturedProperties() {
  const [propTab, setPropTab] = useState("All");
  const [page, setPage] = useState(1);

  const featuredQ = trpc.properties.list.useQuery({
    featured: true,
    type: propTab !== "All" ? TAB_TYPE_MAP[propTab] : undefined,
    page,
    limit: PAGE_SIZE,
  });
  const displayProps = (featuredQ.data?.items ?? []) as FeaturedProp[];
  const totalPages = featuredQ.data?.totalPages ?? 1;

  // Reset to first page whenever the type tab changes.
  const selectTab = (t: string) => {
    setPropTab(t);
    setPage(1);
  };

  // Re-run scroll reveal when dynamic cards mount after data loads
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
  }, [featuredQ.data]);

  return (
    <section className="px-4 py-2 sm:px-6 sm:py-3">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-4" data-reveal>
            <Eyebrow>Hand Picked</Eyebrow>
            <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
              Trending Properties in India
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A handpicked collection of India&apos;s most in-demand verified listings.
            </p>
          </div>

          <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
            {PROPERTY_TABS.map((t) => (
              <button
                key={t}
                onClick={() => selectTab(t)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all
                  ${propTab === t ? "border-transparent bg-navy text-white" : "border-border bg-white text-muted-foreground hover:border-accent/50"}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredQ.isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse overflow-hidden rounded-xl border border-border bg-white"
                    >
                      <div className="aspect-[4/3] bg-secondary" />
                      <div className="space-y-2 p-3">
                        <div className="h-3 w-24 rounded bg-secondary" />
                        <div className="h-4 w-40 rounded bg-secondary" />
                        <div className="h-3 w-20 rounded bg-secondary" />
                      </div>
                    </div>
                  ))
                : displayProps.map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/properties/${p.slug}`}
                      data-reveal="scale"
                      className="group overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                      style={{ transitionDelay: `${i * 60}ms` }}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <SafeImage
                          src={
                            p.images[0] ??
                            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80"
                          }
                          alt={p.title}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy shadow">
                          <StarIcon size={7} className="fill-current" /> Featured
                        </span>
                        <WatermarkOverlay src={p.images[0]} />
                      </div>
                      <div className="p-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {p.location?.locality}, {p.location?.city}
                        </div>
                        <h3 className="mt-0.5 font-display text-sm font-bold leading-tight text-navy">
                          {p.title}
                        </h3>
                        <div className="mt-2 flex items-end justify-between">
                          <div>
                            <div className="font-display text-base font-black text-accent">
                              {fmtPrice(p.price)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {p.bhk ? `${p.bhk} · ` : ""}{p.area} sqft
                            </div>
                          </div>
                          <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-navy">
                            {p.type}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
            </div>

            {!featuredQ.isLoading && displayProps.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No properties found.
              </p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-navy shadow-sm transition hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-navy shadow-sm transition hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="mt-4 border-t border-border pt-4">
            <Link
              href="/properties"
              className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-all hover:gap-2"
            >
              View all properties <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
