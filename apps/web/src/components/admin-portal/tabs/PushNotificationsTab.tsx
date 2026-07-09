"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Send, Bell, Smartphone } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { PageHead } from "./PageHead";

export function PushNotificationsTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [url, setUrl] = useState("");

  const statsQ = trpc.push.stats.useQuery();
  const broadcast = trpc.push.broadcast.useMutation({
    onSuccess: ({ sent, failed, pruned }) => {
      toast.success(`Sent to ${sent} device${sent === 1 ? "" : "s"}${failed ? ` · ${failed} failed` : ""}${pruned ? ` · ${pruned} stale removed` : ""}`);
      setTitle(""); setBody(""); setImage(""); setUrl("");
      statsQ.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const canSend = title.trim().length >= 2 && body.trim().length >= 1;

  const send = () => {
    if (!canSend) return;
    broadcast.mutate({
      title: title.trim(),
      body: body.trim(),
      image: image.trim() || undefined,
      url: url.trim() || undefined,
    });
  };

  const devices = statsQ.data?.devices ?? 0;

  return (
    <>
      <PageHead
        title="Push Notifications"
        subtitle="Broadcast a web push notification to every subscribed device."
      />

      <Section title="Compose Notification">
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 font-semibold text-navy">
            <Smartphone size={14} />
            {devices.toLocaleString("en-IN")} subscribed device{devices === 1 ? "" : "s"}
          </span>
          <span className="rounded-lg bg-secondary px-3 py-1.5 font-semibold text-navy">
            {(statsQ.data?.users ?? 0).toLocaleString("en-IN")} users
          </span>
        </div>

        <div className="grid max-w-2xl gap-4">
          <label className="block">
            <span className="text-sm font-semibold text-foreground">Title *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. New premium listings in Mumbai"
              className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-foreground">Message *</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What do you want to tell your users?"
              className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-foreground">Image URL <span className="font-normal text-muted-foreground">(optional)</span></span>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-foreground">Link <span className="font-normal text-muted-foreground">(optional — where the notification opens)</span></span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://nxtsft.com/properties"
              className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={send}
              disabled={!canSend || broadcast.isPending || devices === 0}
              className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Send size={15} />
              {broadcast.isPending ? "Sending…" : "Send Notification"}
            </button>
            {devices === 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Bell size={12} />
                No subscribed devices yet.
              </span>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
