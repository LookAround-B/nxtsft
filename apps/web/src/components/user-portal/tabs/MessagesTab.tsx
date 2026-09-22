"use client";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Send, Loader2, ArrowLeft, MessageSquare } from "lucide-react";
import { Head } from "./shared";

type Selected = { otherUserId: string; propertyId: string | null };

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function MessagesTab() {
  const [selected, setSelected] = useState<Selected | null>(null);
  const threadsQ = trpc.messages.threads.useQuery();
  const threads = threadsQ.data ?? [];

  return (
    <div>
      <Head t="Messages" s="Chat with buyers and sellers — your email address stays private." />

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        {/* Thread list */}
        <div className={selected ? "hidden md:block" : ""}>
          {threadsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center">
              <MessageSquare size={22} className="text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No conversations yet. Message a seller from any listing to start one.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map((t) => {
                const active =
                  selected?.otherUserId === t.otherUserId && selected?.propertyId === t.propertyId;
                return (
                  <button
                    key={`${t.otherUserId}:${t.propertyId ?? ""}`}
                    type="button"
                    onClick={() => setSelected({ otherUserId: t.otherUserId, propertyId: t.propertyId })}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                      active ? "border-accent bg-accent/5" : "border-border bg-white hover:border-accent/40"
                    }`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy/10 text-xs font-bold text-navy">
                      {initials(t.otherName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-navy">{t.otherName}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{timeLabel(t.lastAt)}</span>
                      </div>
                      {t.propertyTitle && (
                        <p className="truncate text-[11px] font-medium text-accent">{t.propertyTitle}</p>
                      )}
                      <p className="truncate text-xs text-muted-foreground">{t.lastMessage}</p>
                    </div>
                    {t.unread > 0 && (
                      <span className="ml-1 grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                        {t.unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Conversation */}
        <div className={selected ? "" : "hidden md:block"}>
          {selected ? (
            <Conversation
              key={`${selected.otherUserId}:${selected.propertyId ?? ""}`}
              selected={selected}
              onBack={() => setSelected(null)}
              onChanged={() => threadsQ.refetch()}
            />
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/30 text-sm text-muted-foreground">
              Select a conversation to read and reply.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Conversation({
  selected,
  onBack,
  onChanged,
}: {
  selected: Selected;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [text, setText] = useState("");
  const utils = trpc.useUtils();
  const q = trpc.messages.thread.useQuery({
    otherUserId: selected.otherUserId,
    propertyId: selected.propertyId ?? undefined,
  });
  const send = trpc.messages.send.useMutation();

  // Opening a thread marks it read server-side — refresh the unread badge + list.
  useEffect(() => {
    if (q.data) {
      void utils.messages.unreadCount.invalidate();
      onChanged();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    try {
      await send.mutateAsync({
        recipientId: selected.otherUserId,
        propertyId: selected.propertyId ?? undefined,
        content,
      });
      setText("");
      await q.refetch();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send. Try again.");
    }
  };

  const other = q.data?.otherUser;
  const property = q.data?.property;

  return (
    <div className="flex h-[70vh] max-h-[600px] flex-col rounded-2xl border border-border bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border p-3">
        <button
          type="button"
          onClick={onBack}
          className="grid h-8 w-8 place-items-center rounded-full text-navy hover:bg-secondary md:hidden"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-navy">{other?.name ?? "…"}</p>
          {property && <p className="truncate text-[11px] font-medium text-accent">{property.title}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (q.data?.messages.length ?? 0) === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No messages yet — say hello.</p>
        ) : (
          q.data!.messages.map((m) => (
            <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.fromMe ? "bg-accent text-white" : "bg-secondary text-navy"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className={`mt-1 text-[10px] ${m.fromMe ? "text-white/70" : "text-muted-foreground"}`}>
                  {timeLabel(m.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-border px-4 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={send.isPending || !text.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white transition hover:opacity-90 disabled:opacity-50"
          aria-label="Send"
        >
          {send.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
