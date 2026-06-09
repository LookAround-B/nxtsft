'use client';
import { useEffect, useState } from 'react';

export function Preloader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2000);
    const t2 = setTimeout(() => setVisible(false), 2560);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
      style={{ transition: 'opacity 0.55s ease', opacity: fading ? 0 : 1, pointerEvents: fading ? 'none' : 'auto' }}
    >
      {/* outer glow ring */}
      <div className="preloader-ring absolute h-64 w-64 rounded-full sm:h-72 sm:w-72"
        style={{ background: 'radial-gradient(circle, oklch(0.72 0.12 186 / 0.18) 0%, transparent 70%)' }}
      />
      {/* spinning ring */}
      <div className="absolute h-52 w-52 animate-spin-slow rounded-full border border-accent/20 sm:h-60 sm:w-60" />
      <div className="absolute h-44 w-44 animate-spin-slow-r rounded-full border border-gold/15 sm:h-52 sm:w-52" />

      {/* logo */}
      <img
        src="/logo.png"
        alt="NxtSft.com"
        className="relative h-36 w-auto object-contain sm:h-44"
        style={{ animation: 'preloader-pulse 1.1s ease-in-out infinite alternate' }}
      />

      {/* progress bar */}
      <div className="absolute bottom-0 left-0 h-[3px] w-full overflow-hidden bg-border">
        <div className="preloader-progress h-full rounded-full bg-accent" />
      </div>
    </div>
  );
}
