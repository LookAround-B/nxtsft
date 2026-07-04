"use client";
import { useState } from "react";
import { AlertOctagon, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Reason = "wrong_info" | "not_reachable" | "closed" | "spam" | "more_info";

const REASONS: { reason: Reason; label: string }[] = [
  { reason: "wrong_info", label: "Wrong Info" },
  { reason: "not_reachable", label: "Not Reachable" },
  { reason: "closed", label: "Business Closed" },
  { reason: "spam", label: "Spam / Fake" },
  { reason: "more_info", label: "Request More Info" },
];

/**
 * Report a decor-store listing. Mirrors DesignerReport — flag reasons submit
 * anonymously; "Request More Info" collects optional contact. All go to
 * staff as Enquiry rows via decorStores.reportIssue.
 */
export function DecorStoreReport({ storeId, className }: { storeId: string; className?: string }) {
  const [done, setDone] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const report = trpc.decorStores.reportIssue.useMutation({
    onSuccess: () => {
      setDone(true);
      setShowForm(false);
      toast.success("Thanks — we'll review this listing.");
    },
    onError: (e) => toast.error(e.message || "Could not submit. Please try again."),
  });

  function onClick(reason: Reason) {
    if (reason === "more_info") {
      setShowForm((s) => !s);
      return;
    }
    report.mutate({ id: storeId, reason });
  }

  function submitMoreInfo() {
    if (!phone.trim() && !name.trim()) {
      toast.error("Add your name or phone so we can reach you.");
      return;
    }
    report.mutate({ id: storeId, reason: "more_info", name: name.trim() || undefined, phone: phone.trim() || undefined });
  }

  if (done) {
    return (
      <div className={cn("rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6", className)}>
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <Check size={16} /> Thanks for letting us know. Our team will review this listing.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6", className)}>
      <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-navy">
        <AlertOctagon size={18} className="text-emerald-600" />
        Report a problem with this listing
      </h3>

      <div className="flex flex-wrap gap-2.5">
        {REASONS.map(({ reason, label }) => (
          <button
            key={reason}
            type="button"
            onClick={() => onClick(reason)}
            disabled={report.isPending}
            className={cn(
              "rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50",
              reason === "more_info" && showForm && "border-emerald-500 bg-emerald-50",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="mt-4 space-y-2.5 border-t border-border pt-4">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              inputMode="tel"
              className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={submitMoreInfo}
            disabled={report.isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {report.isPending ? "Sending…" : "Send request"}
          </button>
        </div>
      )}
    </div>
  );
}
