"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TabHeader } from "./shared";

const BROADCAST_ROLES = [
  { label: "All users", value: "" },
  { label: "Home Buyers", value: "user" },
  { label: "Customers", value: "customer" },
  { label: "Admins", value: "admin" },
  { label: "Supervisors", value: "supervisor" },
  { label: "Sales Reps", value: "sales" },
  { label: "Support Admins", value: "support-admin" },
];

export function NotifyTab() {
  const [form, setForm] = useState({ title: "", content: "", targetRole: "" });

  const broadcast = trpc.superAdmin.broadcastNotification.useMutation({
    onSuccess: (res: { count: number }) => {
      toast.success(`Broadcast sent to ${res.count} user${res.count !== 1 ? "s" : ""}`);
      setForm({ title: "", content: "", targetRole: "" });
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const send = () => {
    if (form.title.trim().length < 5) return toast.error("Title must be at least 5 characters.");
    if (form.content.trim().length < 10) return toast.error("Message must be at least 10 characters.");
    broadcast.mutate({
      title: form.title.trim(),
      content: form.content.trim(),
      targetRole: form.targetRole || undefined,
    });
  };

  return (
    <>
      <TabHeader
        title="Notifications"
        subtitle="Broadcast platform-wide announcements to users."
      />
      <Section title="Compose Broadcast">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Scheduled maintenance this weekend"
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Message</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={4}
              placeholder="Write the announcement users will receive…"
              className="mt-1 w-full resize-none rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Audience</label>
              <Select
                value={form.targetRole || "__all"}
                onValueChange={(v) => setForm((f) => ({ ...f, targetRole: v === "__all" ? "" : v }))}
              >
                <SelectTrigger className="mt-1 min-w-[10rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BROADCAST_ROLES.map((r) => (
                    <SelectItem key={r.value || "__all"} value={r.value || "__all"}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={send}
              disabled={broadcast.isPending}
              className="rounded-md bg-gold px-4 py-2 text-sm font-bold text-navy-deep hover:opacity-90 disabled:opacity-50"
            >
              {broadcast.isPending ? "Sending…" : "Send Broadcast"}
            </button>
          </div>
        </div>
      </Section>
    </>
  );
}
