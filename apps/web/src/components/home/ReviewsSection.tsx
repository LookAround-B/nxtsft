"use client";

import { useRef } from "react";
import { ChevronRight } from "lucide-react";
import { REVIEWS } from "@/components/home/homeData";
import { Eyebrow } from "@/components/home/Eyebrow";

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-sm ${i < n ? "text-amber-400" : "text-border"}`}>
          ★
        </span>
      ))}
    </span>
  );
}

export function ReviewsSection() {
  const reviewRef = useRef<HTMLDivElement>(null);

  return (
    <section className="px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div data-reveal>
              <Eyebrow>Customer Stories</Eyebrow>
              <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
                What People Say About Us
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-display text-3xl font-black text-navy">4.8</span>
                <div>
                  <Stars n={5} />
                  <span className="text-xs text-muted-foreground">Based on 10,000+ reviews</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => reviewRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-transparent hover:bg-navy hover:text-white"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
              <button
                onClick={() => reviewRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-white transition hover:bg-navy/90"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={reviewRef} className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
            {REVIEWS.map((r, i) => (
              <div
                key={r.name}
                data-reveal="scale"
                className="w-[285px] shrink-0 rounded-xl border border-border bg-secondary/30 p-4"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                    style={{ background: r.bg }}
                  >
                    {r.initial}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.location} · {r.age}
                    </p>
                  </div>
                </div>
                <Stars n={r.rating} />
                <p className="mt-2.5 line-clamp-4 text-[13px] leading-relaxed text-muted-foreground">
                  {r.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
