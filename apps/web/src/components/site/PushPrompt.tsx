"use client";
import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  pushSupported,
  pushConfigured,
  subscribeToPush,
  currentPushEndpoint,
} from "@/lib/push-client";

const DISMISS_KEY = "nxtsft_push_prompt_dismissed";
// Re-ask this long after a soft dismissal ("Not now") so we don't nag, but also
// don't lose people who weren't ready the first time.
const DISMISS_DAYS = 14;
// Small delay before showing so it doesn't fight the page load / hero.
const SHOW_DELAY_MS = 4000;

// Site-wide opt-in for new-property push notifications, shown on public pages to
// both anonymous visitors and signed-in users (push.subscribe is public and
// attaches the user id when present). This is what gives the new-listing push
// real reach beyond the buried Profile toggle. Renders nothing unless the
// browser supports push, push is configured, the user hasn't decided yet, and
// they haven't recently dismissed it.
export function PushPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const subscribe = trpc.push.subscribe.useMutation();

  useEffect(() => {
    if (!pushSupported() || !pushConfigured()) return;
    if (Notification.permission !== "default") return; // already granted or denied
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    // Don't prompt a device that's already subscribed.
    currentPushEndpoint().then((ep) => {
      if (cancelled || ep) return;
      timer = setTimeout(() => setShow(true), SHOW_DELAY_MS);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const remember = () => localStorage.setItem(DISMISS_KEY, String(Date.now()));

  const dismiss = () => {
    remember();
    setShow(false);
  };

  const enable = async () => {
    setBusy(true);
    try {
      const payload = await subscribeToPush();
      // Null = unsupported or the user blocked the browser prompt. Either way,
      // stop asking for the dismissal window.
      if (!payload) {
        remember();
        setShow(false);
        return;
      }
      await subscribe.mutateAsync(payload);
      remember();
      setShow(false);
      toast.success("You'll get alerts on new properties 🔔");
    } catch {
      toast.error("Couldn't enable notifications. Please try again later.");
    } finally {
      setBusy(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-sm rounded-2xl border border-border bg-white p-4 shadow-xl sm:inset-x-auto sm:left-4 sm:bottom-4">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary"
      >
        <X size={15} />
      </button>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <Bell size={18} />
        </span>
        <div className="min-w-0 pr-4">
          <p className="font-display text-sm font-bold text-navy">Get new-property alerts</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Be first to know when fresh listings go live in your city.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={enable}
              disabled={busy}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Enabling…" : "Enable"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-secondary"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
