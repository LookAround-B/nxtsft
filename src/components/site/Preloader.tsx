'use client';
import { useEffect, useState } from 'react';

export function Preloader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1800);
    const t2 = setTimeout(() => setVisible(false), 2350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
      style={{ transition: 'opacity 0.55s ease', opacity: fading ? 0 : 1, pointerEvents: fading ? 'none' : 'auto' }}
    >
      <img src="/logo.png" alt="Nestiqo" className="h-28 w-auto" style={{ animation: 'preloader-pulse 1s ease-in-out infinite alternate' }} />
      <div className="mt-6 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" style={{ animation: 'preloader-dot 0.9s ease-in-out infinite', animationDelay: '0ms' }} />
        <span className="h-2.5 w-2.5 rounded-full bg-accent" style={{ animation: 'preloader-dot 0.9s ease-in-out infinite', animationDelay: '180ms' }} />
        <span className="h-2.5 w-2.5 rounded-full bg-accent" style={{ animation: 'preloader-dot 0.9s ease-in-out infinite', animationDelay: '360ms' }} />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Loading…</p>
    </div>
  );
}
