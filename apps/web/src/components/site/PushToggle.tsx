"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  pushSupported,
  pushConfigured,
  subscribeToPush,
  unsubscribeFromPush,
  currentPushEndpoint,
} from "@/lib/push-client";

// Lets a signed-in user opt in/out of browser push notifications (LA-332).
// Renders nothing when the browser can't do push or push isn't configured.
export function PushToggle() {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const subscribe = trpc.push.subscribe.useMutation();
  const unsubscribe = trpc.push.unsubscribe.useMutation();

  useEffect(() => {
    if (!pushSupported() || !pushConfigured()) return;
    setReady(true);
    currentPushEndpoint().then((ep) => setEnabled(!!ep && Notification.permission === "granted"));
  }, []);

  if (!ready) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (enabled) {
        const endpoint = await unsubscribeFromPush();
        if (endpoint) await unsubscribe.mutateAsync({ endpoint });
        setEnabled(false);
        toast.success("Browser notifications turned off");
      } else {
        const payload = await subscribeToPush();
        if (!payload) {
          toast.error("Notifications blocked. Enable them in your browser settings.");
          return;
        }
        await subscribe.mutateAsync(payload);
        setEnabled(true);
        toast.success("Browser notifications turned on");
      }
    } catch {
      toast.error("Could not update notification settings.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-border bg-white text-navy hover:border-accent hover:text-accent"
      }`}
    >
      {enabled ? <Bell size={15} /> : <BellOff size={15} />}
      {busy ? "Saving…" : enabled ? "Notifications on" : "Enable notifications"}
    </button>
  );
}
