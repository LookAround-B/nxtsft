"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Radio } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { ListSkeleton } from "@/components/ui/skeleton";
import { PageHead } from "./PageHead";

const inputCls =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent";

export function ChannelCodesTab() {
  const utils = trpc.useUtils();
  const reportQ = trpc.channelCodes.report.useQuery();

  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");

  const invalidate = () => {
    utils.channelCodes.report.invalidate();
    utils.channelCodes.list.invalidate();
  };

  const create = trpc.channelCodes.create.useMutation({
    onSuccess: () => {
      toast.success("Channel code created");
      setCode("");
      setLabel("");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const setActive = trpc.channelCodes.setActive.useMutation({
    onSuccess: ({ active }) => {
      toast.success(active ? "Code activated" : "Code deactivated");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.channelCodes.remove.useMutation({
    onSuccess: (r) => {
      toast.success(r.deleted ? "Code deleted" : "Code is in use — deactivated instead");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    if (!code.trim()) return toast.error("Enter a code");
    if (!label.trim()) return toast.error("Enter a channel name");
    create.mutate({ code: code.trim(), label: label.trim() });
  };

  const rows = reportQ.data ?? [];

  return (
    <>
      <PageHead
        title="Channel Codes"
        subtitle="Register the codes you use in ads and campaigns (FB10, INSTA20, SALES_RAJU). Sellers type one on the list form, and this report shows how many listings each channel produced."
      />

      <Section title="Add a channel code">
        <div className="grid gap-3 rounded-2xl border border-border bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Code</label>
            <input
              className={inputCls}
              placeholder="FB10"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={32}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Channel name</label>
            <input
              className={inputCls}
              placeholder="Facebook Ads"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending}
              className="w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
            >
              {create.isPending ? "Adding…" : "Add code"}
            </button>
          </div>
        </div>
      </Section>

      <Section title="Channels & listings">
        {reportQ.isLoading && <ListSkeleton rows={4} />}

        {!reportQ.isLoading && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No channel codes yet. Add one above, then use it in your ad links.
          </div>
        )}

        {!reportQ.isLoading && rows.length > 0 && (
          <div className="grid gap-3">
            {rows.map((c) => (
              <div
                key={c.id}
                className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 transition ${
                  c.active ? "border-border bg-white" : "border-dashed border-border bg-secondary/40 opacity-70"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Radio size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-navy">{c.code}</span>
                    <span className="text-sm text-muted-foreground">{c.label}</span>
                    {!c.active && <span className="text-xs text-muted-foreground">· Inactive</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-navy">{c.listings.toLocaleString("en-IN")}</span> listing
                    {c.listings === 1 ? "" : "s"} · {c.live.toLocaleString("en-IN")} live
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={c.active}
                  disabled={setActive.isPending}
                  onClick={() => setActive.mutate({ id: c.id, active: !c.active })}
                  title={c.active ? "Deactivate" : "Activate"}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
                    c.active ? "bg-emerald-500" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      c.active ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete channel code ${c.code}? (kept & deactivated if listings used it)`)) {
                      remove.mutate({ id: c.id });
                    }
                  }}
                  disabled={remove.isPending}
                  title="Delete"
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
