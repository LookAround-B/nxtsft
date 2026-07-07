"use client";
import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Dev: the SW serves /_next/static/ cache-first, but Turbopack dev chunk
    // URLs are stable paths (not content-hashed), so a cached chunk keeps
    // serving stale compiled code after every edit — the client then hydrates
    // against fresh SSR HTML and mismatches. Unregister any SW left over from
    // a previous session and drop its caches so the browser self-heals.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) if (key.startsWith("nxtsft-")) void caches.delete(key);
        });
      }
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {/* SW registration is best-effort */});
  }, []);

  return null;
}
