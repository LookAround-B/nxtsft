"use client";

import { useState, useEffect, useRef } from "react";
import { KPI_BAND } from "@/components/home/homeData";
import { CitySkySVG } from "@/components/home/CitySkySVG";

function KpiBandStat({
  num,
  prefix,
  suffix,
  decimals,
  l,
  delay,
}: {
  num: number;
  prefix: string;
  suffix: string;
  decimals: number;
  l: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setActive(true);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1500, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(eased * num);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, num]);

  const display = value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div
      ref={ref}
      data-reveal="fade"
      data-visible=""
      className="flex flex-col items-center text-center lg:px-6"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="font-display text-2xl font-black text-gradient-gold sm:text-3xl">
        {prefix}
        {display}
        {suffix}
      </span>
      <span className="mt-1 text-xs font-medium text-white/60">{l}</span>
    </div>
  );
}

export function KPIBand() {
  return (
    <section className="relative overflow-hidden bg-navy px-4 py-8 sm:px-6">
      <CitySkySVG />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-0 lg:divide-x lg:divide-white/10">
          {KPI_BAND.map((s, i) => (
            <KpiBandStat key={s.l} {...s} delay={i * 80} />
          ))}
        </div>
      </div>
    </section>
  );
}
