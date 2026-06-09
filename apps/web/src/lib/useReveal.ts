"use client";
import { useEffect, useRef, useState } from "react";

export interface UseRevealOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useReveal(options: UseRevealOptions = {}) {
  const { threshold = 0.1, rootMargin = "0px 0px -52px 0px" } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);

  return { ref, visible };
}
