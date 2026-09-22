"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MessageSquare, X, Loader2, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";

// Masked "Message owner" action on a listing (#10). Opens an in-app compose;
// the message lands in the owner's dashboard (+ an email alert that never
// exposes anyone's address). Hidden on your own listing.
export function MessageOwnerButton({
  propertyId,
  ownerId,
  ownerName,
  propertyTitle,
  propertySlug,
  isLoggedIn,
  isOwnListing,
}: {
  propertyId: string;
  ownerId: string;
  ownerName: string;
  propertyTitle: string;
  propertySlug: string;
  isLoggedIn: boolean;
  isOwnListing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const send = trpc.messages.send.useMutation();

  if (isOwnListing) return null;

  if (!isLoggedIn) {
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(`/properties/${propertySlug}`)}`}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-navy/15 py-3 font-display text-sm font-bold text-navy transition hover:bg-secondary"
      >
        <MessageSquare size={16} /> Sign in to message owner
      </Link>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    try {
      await send.mutateAsync({ recipientId: ownerId, propertyId, content });
      setSent(true);
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send your message. Try again.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSent(false);
          setOpen(true);
        }}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-navy/15 py-3 font-display text-sm font-bold text-navy transition hover:bg-secondary"
      >
        <MessageSquare size={16} /> Message owner
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="font-display text-lg font-black text-navy">Message {ownerName}</h4>
                <p className="truncate text-xs text-muted-foreground">About: {propertyTitle}</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary"
              >
                <X size={16} />
              </button>
            </div>

            {sent ? (
              <div className="py-6 text-center">
                <p className="text-sm font-semibold text-emerald-600">Message sent ✅</p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                  Replies appear in your dashboard under Messages. Your email address is never shared.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Link
                    href="/user-portal#messages"
                    className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                  >
                    Go to Messages
                  </Link>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-navy transition hover:bg-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit}>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  placeholder={`Hi, I'm interested in ${propertyTitle}. Is it still available?`}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Your email address is never shared — replies happen in your dashboard.
                </p>
                <button
                  type="submit"
                  disabled={send.isPending || !text.trim()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {send.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Send message
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
