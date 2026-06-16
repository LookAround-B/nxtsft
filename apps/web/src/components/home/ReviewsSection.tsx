"use client";

import { REVIEWS } from "@/components/home/homeData";
import { Eyebrow } from "@/components/home/Eyebrow";

// Marquee glides one full set-width left, then loops. The track holds two copies
// of REVIEWS, so -50% lands exactly on the start of the second copy — seamless.
const marqueeStyle = `
  @keyframes review-marquee {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }
  .review-marquee {
    animation: review-marquee 90s linear infinite;
  }
  .review-marquee:hover {
    animation-play-state: paused;
  }
  @media (prefers-reduced-motion: reduce) {
    .review-marquee { animation: none; }
  }
`;

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-sm ${i < n ? "text-amber-400" : "text-white/20"}`}>
          ★
        </span>
      ))}
    </span>
  );
}

type Review = (typeof REVIEWS)[number];

function ReviewCard({ r }: { r: Review }) {
  return (
    <figure className="w-[320px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-md transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/12">
      <div className="mb-3 flex items-center gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-lg"
          style={{ background: r.bg }}
        >
          {r.initial}
        </div>
        <figcaption className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{r.name}</p>
          <p className="text-[11px] text-white/55">
            {r.location} · {r.age}
          </p>
        </figcaption>
      </div>
      <Stars n={r.rating} />
      <blockquote className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-white/75">
        “{r.text}”
      </blockquote>
    </figure>
  );
}

export function ReviewsSection() {
  return (
    <section className="px-4 py-12 sm:px-6">
      <style>{marqueeStyle}</style>
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div data-reveal className="mb-8 max-w-2xl">
          <Eyebrow>Customer Stories</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-black text-navy sm:text-4xl">
            What People Say About Us
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <span className="font-display text-4xl font-black text-navy">4.8</span>
            <div>
              <Stars n={5} />
              <span className="text-sm text-muted-foreground font-medium">Based on 10,000+ reviews</span>
            </div>
          </div>
        </div>

        {/* Marquee */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-navy via-navy-deep to-navy py-8">
          {/* ambient glow */}
          <div className="pointer-events-none absolute -right-40 -top-40 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-40 -bottom-40 h-80 w-80 rounded-full bg-white/5 blur-3xl" />

          {/* track: two copies of REVIEWS so the -50% loop is seamless */}
          <div className="review-marquee flex w-max gap-5 px-5">
            {[...REVIEWS, ...REVIEWS].map((r, i) => (
              <ReviewCard key={`${r.name}-${i}`} r={r} />
            ))}
          </div>

          {/* edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-navy to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-navy to-transparent" />
        </div>
      </div>
    </section>
  );
}
