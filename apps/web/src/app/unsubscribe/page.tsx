"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BellOff, CheckCircle2, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth";

type Channel = "email" | "sms_whatsapp";

const EMAIL_REASONS = [
  "Not interested anymore",
  "Don't remember signing up",
  "Getting messages too often",
  "Broken email design",
  "Irrelevant content",
  "Other",
] as const;

const SMS_REASONS = [
  "Not interested anymore",
  "Don't remember signing up",
  "Getting messages too often",
  "Irrelevant content",
  "Other",
] as const;

function ReasonList({
  title,
  reasons,
  selected,
  onToggle,
}: {
  title: string;
  reasons: readonly string[];
  selected: Set<string>;
  onToggle: (reason: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-navy">{title}</h2>
      <div className="mt-4 space-y-3">
        {reasons.map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-3 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={selected.has(r)}
              onChange={() => onToggle(r)}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            {r}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [emailReasons, setEmailReasons] = useState<Set<string>>(new Set());
  const [smsReasons, setSmsReasons] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  // Prefill once auth resolves, but never overwrite what the visitor typed.
  const effectiveEmail = email || session?.email || "";

  const unsubscribe = trpc.contact.unsubscribe.useMutation({
    onSuccess: () => setDone(true),
    onError: (err) => toast.error(err.message || "Couldn't process your request. Please try again."),
  });

  const toggle = (set: Set<string>, apply: (s: Set<string>) => void) => (reason: string) => {
    const next = new Set(set);
    if (next.has(reason)) next.delete(reason);
    else next.add(reason);
    apply(next);
  };

  const handleSubmit = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }
    const channels: Channel[] = [];
    if (emailReasons.size > 0) channels.push("email");
    if (smsReasons.size > 0) channels.push("sms_whatsapp");
    if (channels.length === 0) {
      toast.error("Select at least one reason under Email or SMS/WhatsApp.");
      return;
    }
    unsubscribe.mutate({
      email: effectiveEmail.trim(),
      channels,
      reasons: [...new Set([...emailReasons, ...smsReasons])] as (typeof EMAIL_REASONS)[number][],
    });
  };

  return (
    <main className="min-h-screen bg-[oklch(0.97_0.01_260)]">
      <section className="mx-auto max-w-2xl px-5 py-14 sm:px-6">
        <nav className="text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span className="mx-1.5">/</span>
          <span>Unsubscribe</span>
        </nav>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white">
            <BellOff size={20} />
          </div>
          <h1 className="font-display text-3xl font-bold text-navy">Unsubscribe</h1>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Please help us understand your concerns. Based on your feedback, we will improve our
          communication to be efficient and relevant.
        </p>

        {done ? (
          <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-8 py-14 text-center">
            <CheckCircle2 size={44} className="text-emerald-500" strokeWidth={1.5} />
            <h2 className="font-display text-xl font-bold text-navy">You&apos;re unsubscribed</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              We&apos;ve recorded your preference for {effectiveEmail}. It can take up to 48 hours
              for pending messages to stop.
            </p>
            <Link href="/" className="mt-1 text-sm font-semibold text-accent underline underline-offset-4">
              Back to home
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <label className="text-sm font-semibold text-navy" htmlFor="unsub-email">
                Your email address
              </label>
              <input
                id="unsub-email"
                type="email"
                value={effectiveEmail}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            </div>

            <ReasonList
              title="Do you want to unsubscribe from Email? Select reason(s)"
              reasons={EMAIL_REASONS}
              selected={emailReasons}
              onToggle={toggle(emailReasons, setEmailReasons)}
            />

            <ReasonList
              title="Do you want to unsubscribe from SMS/WhatsApp? Select reason(s)"
              reasons={SMS_REASONS}
              selected={smsReasons}
              onToggle={toggle(smsReasons, setSmsReasons)}
            />

            <button
              onClick={handleSubmit}
              disabled={unsubscribe.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              <Send size={15} />
              {unsubscribe.isPending ? "Submitting…" : "Unsubscribe"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
