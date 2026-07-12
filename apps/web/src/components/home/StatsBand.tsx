"use client";

import { useState, useEffect, useRef } from "react";
import { TOP_STATS_DATA } from "@/components/home/homeData";

function useCountUp(target: number, duration = 1600, active = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return value;
}

function AnimatedStatCard({
  num,
  suffix,
  l,
  delay,
}: {
  num: number;
  suffix: string;
  l: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const count = useCountUp(num, 1500, active);

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

  return (
    <div
      ref={ref}
      data-reveal="scale"
      data-visible=""
      className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-3 text-center shadow-sm sm:p-5"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="font-display text-lg font-black text-navy sm:text-2xl lg:text-3xl">
        {active ? count : 0}
        {suffix}
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
        {l}
      </div>
    </div>
  );
}

export function StatsBand() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TOP_STATS_DATA.map((s, i) => (
          <AnimatedStatCard key={s.l} {...s} delay={i * 70} />
        ))}
      </div>
    </div>
  );
}
