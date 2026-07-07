"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  content: string | null;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationBell() {
  const { session } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const enabled = !!session;
  const countQ = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled,
    refetchInterval: 30_000,
  });
  const listQ = trpc.notifications.list.useQuery(
    { limit: 10 },
    { enabled: enabled && open, staleTime: 0 },
  );

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => { listQ.refetch(); countQ.refetch(); },
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { listQ.refetch(); countQ.refetch(); },
  });

  // Always fetch fresh data when the bell opens
  useEffect(() => {
    if (open) {
      listQ.refetch();
      countQ.refetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!enabled) return null;

  const unread = countQ.data?.count ?? 0;
  const items = (listQ.data?.items ?? []) as unknown as NotificationItem[];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-full text-foreground/70 transition hover:bg-secondary hover:text-accent"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-4 right-4 top-16 z-50 mt-2 mx-auto max-w-80 overflow-hidden rounded-xl border border-border bg-white shadow-xl md:absolute md:left-auto md:right-0 md:top-auto md:w-80 md:max-w-none md:mx-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-bold text-navy">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto md:max-h-96">
            {listQ.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markRead.mutate({ id: n.id });
                    if (n.actionUrl) {
                      setOpen(false);
                      router.push(n.actionUrl);
                    }
                  }}
                  className={`block w-full border-b border-border px-4 py-3 text-left transition last:border-0 hover:bg-secondary/50 ${n.read ? "" : "bg-accent/5"}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                    <div className={n.read ? "pl-4" : ""}>
                      <div className="text-sm font-semibold text-navy">{n.title}</div>
                      {n.content && <div className="mt-0.5 text-xs text-muted-foreground">{n.content}</div>}
                      <div className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
