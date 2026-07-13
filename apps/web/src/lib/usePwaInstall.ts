"use client";
import { useCallback, useEffect, useState } from "react";

// `beforeinstallprompt` fires once, so it's captured at module scope and shared
// with every consumer (header button + top banner). Without this, whichever
// component mounts after the event fired would miss it.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isInstalled = false;
let listenersReady = false;
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach((fn) => fn());

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" &&
      (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints !== undefined &&
      (navigator as unknown as { maxTouchPoints: number }).maxTouchPoints > 1);
  return iOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua); // A2HS only works in Safari on iOS
}

function ensureListeners() {
  if (listenersReady || typeof window === "undefined") return;
  listenersReady = true;
  if (detectStandalone()) isInstalled = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    isInstalled = true;
    deferredPrompt = null;
    notify();
  });
}

/** Shared PWA-install state + a function to trigger the native install prompt. */
export function usePwaInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    ensureListeners();
    const rerender = () => force((n) => n + 1);
    subscribers.add(rerender);
    return () => {
      subscribers.delete(rerender);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => null);
    deferredPrompt = null;
    if (choice?.outcome === "accepted") isInstalled = true;
    notify();
    return choice?.outcome ?? "dismissed";
  }, []);

  const ios = detectIosSafari() && !isInstalled;
  return {
    installed: isInstalled,
    canInstall: !!deferredPrompt && !isInstalled,
    ios,
    promptInstall,
  };
}
