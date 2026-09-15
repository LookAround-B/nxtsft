"use client";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CALL_OUTCOMES, CONTACT_STATUSES, type CallOutcome, type ContactStatus } from "./shared";

/**
 * Records what happened after a tel: dial. Shared by the contact drawer and the
 * dialer queue — click-to-call has no provider callback, so the outcome is
 * always entered by the rep.
 */
export function LogCallForm({
  contactId,
  onLogged,
  compact = false,
}: {
  contactId: string;
  onLogged: () => void;
  compact?: boolean;
}) {
  const [outcome, setOutcome] = useState<CallOutcome>("connected");
  const [remark, setRemark] = useState("");
  const [callbackAt, setCallbackAt] = useState("");
  const [status, setStatus] = useState("");

  const utils = trpc.useUtils();
  const log = trpc.repContacts.logCall.useMutation({
    onError: (e) => toast.error(e.message),
    onSuccess: () => {
      toast.success("Call logged");
      setRemark("");
      setCallbackAt("");
      setStatus("");
      void utils.leads.badgeCounts.invalidate();
      onLogged();
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (outcome === "callback" && !callbackAt) {
      toast.error("Pick a callback date and time.");
      return;
    }
    log.mutate({
      id: contactId,
      outcome,
      remark: remark.trim() || undefined,
      callbackAt: outcome === "callback" ? new Date(callbackAt).toISOString() : undefined,
      status: (status || undefined) as ContactStatus | undefined,
    });
  }

  return (
    <form onSubmit={submit} className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex flex-wrap gap-1.5">
        {CALL_OUTCOMES.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setOutcome(o.value)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              outcome === o.value ? "border-navy bg-navy text-white" : "border-border text-muted-foreground hover:border-accent"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {outcome === "callback" && (
        <input
          type="datetime-local"
          value={callbackAt}
          onChange={(e) => setCallbackAt(e.target.value)}
          aria-label="Callback date and time"
          className="w-full rounded-xl border border-border px-3 py-2 text-sm"
        />
      )}

      <div className="flex gap-2">
        <input
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Remark (optional)"
          className="flex-1 rounded-xl border border-border px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Tag status"
          className="rounded-xl border border-border px-2 py-2 text-sm"
        >
          <option value="">Keep status</option>
          {CONTACT_STATUSES.filter((s) => s !== "Converted").map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={log.isPending}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {log.isPending ? "Saving…" : "Log"}
        </button>
      </div>
    </form>
  );
}
