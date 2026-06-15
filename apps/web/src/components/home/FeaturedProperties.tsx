"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star as StarIcon, ChevronRight, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Eyebrow } from "@/components/home/Eyebrow";
import {
  PROPERTY_TABS,
  TAB_TYPE_MAP,
  type FeaturedProp,
  fmtPrice,
} from "@/components/home/homeData";

export function FeaturedProperties() {
  const [propTab, setPropTab] = useState("All");
  const carouselRef = useRef<HTMLDivElement>(null);

  const featuredQ = trpc.properties.list.useQuery({
    featured: true,
    type: propTab !== "All" ? TAB_TYPE_MAP[propTab] : undefined,
    limit: 12,
  });
  const displayProps = (featuredQ.data?.items ?? []) as FeaturedProp[];

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
                onClick={() => setPropTab(t)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all
                  ${propTab === t ? "border-transparent bg-navy text-white" : "border-border bg-white text-muted-foreground hover:border-accent/50"}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative">
            <div ref={carouselRef} className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
              {featuredQ.isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[255px] shrink-0 animate-pulse overflow-hidden rounded-xl border border-border bg-white"
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
                      className="group w-[255px] shrink-0 overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                      style={{ transitionDelay: `${i * 60}ms` }}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <Image
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

            <button
              onClick={() => carouselRef.current?.scrollBy({ left: 280, behavior: "smooth" })}
              className="absolute -right-3 top-[40%] -translate-y-1/2 hidden h-9 w-9 items-center justify-center rounded-full bg-navy text-white shadow-lg transition hover:bg-navy/90 sm:flex"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

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
