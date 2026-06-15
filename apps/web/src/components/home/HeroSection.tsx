"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { HERO_IMAGES, ROTATING_STATS } from "@/components/home/homeData";

function HeroBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -right-24 -top-8 h-[420px] w-[420px] animate-blob rounded-full opacity-25 blur-[90px]"
        style={{ background: "oklch(0.72 0.12 186)" }}
      />
      <div
        className="absolute -left-16 top-1/3 h-[300px] w-[300px] animate-blob-slow rounded-full opacity-20 blur-[70px]"
        style={{ background: "oklch(0.76 0.14 76)" }}
      />
      <div
        className="absolute bottom-8 right-1/3 h-[200px] w-[200px] animate-float rounded-full opacity-10 blur-[60px]"
        style={{ background: "oklch(0.72 0.12 186)" }}
      />
      <div className="absolute left-8 top-8 h-20 w-20 animate-spin-slow rounded-full border border-white/10" />
      <div className="absolute right-16 bottom-16 h-12 w-12 animate-spin-slow-r rounded-full border border-white/8" />
    </div>
  );
}

export function HeroSection() {
  const router = useRouter();

  const [tab, setTab] = useState<"Buy" | "Rent" | "Commercial" | "PG">("Buy");
  const [query, setQuery] = useState("");
  const [statIdx, setStatIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setStatIdx((i) => (i + 1) % ROTATING_STATS.length);
        setFade(true);
      }, 220);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setHeroSlide((i) => (i + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(id);
  }, []);

  const handleSearch = useCallback(() => {
    const q = query.trim();
    router.push(q ? `/properties?q=${encodeURIComponent(q)}` : "/properties");
  }, [query, router]);

  return (
    <section className="relative overflow-hidden bg-navy">
      {/* carousel images */}
      <div className="absolute inset-0">
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-[1400ms]"
            style={{ opacity: i === heroSlide ? 1 : 0 }}
          >
            <Image src={src} alt="" fill className="object-cover" aria-hidden />
          </div>
        ))}
        <div className="absolute inset-0 bg-navy/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/30 via-transparent to-navy/50" />
      </div>

      <HeroBlobs />

      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-14 pt-10 text-center sm:px-6 sm:pb-18 sm:pt-16">
        {/* trust badge */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold backdrop-blur-sm">
          <span className="text-amber-400">★</span>
          <span className="text-white">4.8</span>
          <span className="mx-0.5 text-white/30">·</span>
          <span className="text-white/85">1 Lakh+ Verified Customers</span>
        </div>

        <h1 className="font-display text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl md:text-[3.75rem]">
          Find a home
          <br />
          <span className="text-gradient-hero">that fits your life.</span>
        </h1>
        <p className="mt-4 text-sm text-white/75 sm:text-base">
          Verified properties. Trusted experts. Seamless experience.
        </p>

        {/* search widget */}
        <div className="mx-auto mt-6 max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:mt-8">
          <div className="no-scrollbar flex overflow-x-auto border-b border-border px-3 pt-3 sm:px-4">
            {(["Buy", "Rent", "Commercial", "PG"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`shrink-0 rounded-t-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition sm:px-4
                  ${tab === t ? "border-b-2 border-accent text-accent" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by locality, project or builder"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
            <button
              onClick={handleSearch}
              className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90 sm:px-6 sm:py-2.5"
            >
              Search
            </button>
          </div>
        </div>

        {/* rotating ticker */}
        <div className="mt-5 h-5 overflow-hidden">
          <p
            className="text-center text-[11px] font-medium text-white/60 transition-opacity duration-200"
            style={{ opacity: fade ? 1 : 0 }}
          >
            {ROTATING_STATS[statIdx]}
          </p>
        </div>

        {/* slide dots */}
        <div className="mt-6 flex justify-center gap-1.5">
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroSlide(i)}
              className={`rounded-full transition-all duration-300 ${i === heroSlide ? "h-1.5 w-5 bg-white" : "h-1.5 w-1.5 bg-white/35"}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
