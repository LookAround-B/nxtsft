"use client";
import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { Phone, MessageSquare, Flame, Thermometer, Snowflake, Clock, Sparkles } from "lucide-react";
import { Section, StatCard } from "@/components/portal/PortalShell";
import { ListSkeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  Head, telHref, waHref, fmtRelative, OUTCOME_LABEL, CONTACT_STATUS_STYLE, type ContactStatus,
} from "./shared";
import { LogCallForm } from "./LogCallForm";

// Queue filters. "Callbacks" is its own bucket because a promised callback
// outranks any temperature.
const QUEUES = [
  { key: "callback", label: "Callbacks", Icon: Clock,     active: "bg-amber-600 text-white border-amber-600" },
  { key: "Hot",      label: "Hot",       Icon: Flame,      active: "bg-accent text-white border-accent" },
  { key: "Warm",     label: "Warm",      Icon: Thermometer,active: "bg-amber-500 text-white border-amber-500" },
  { key: "Cold",     label: "Cold",      Icon: Snowflake,  active: "bg-blue-500 text-white border-blue-500" },
  { key: "New",      label: "New",       Icon: Sparkles,   active: "bg-navy text-white border-navy" },
] as const;

type QueueKey = (typeof QUEUES)[number]["key"];

export function DialerTab() {
  const [queue, setQueue] = useState<QueueKey>("callback");
  const [openId, setOpenId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const listQ = trpc.repContacts.list.useQuery(
    {
      status: queue === "callback" ? undefined : (queue as ContactStatus),
      callbackDue: queue === "callback" || undefined,
      page: 1,
      limit: 25,
    },
    { placeholderData: keepPreviousData },
  );
  const statsQ = trpc.repContacts.stats.useQuery();

  const refresh = () =>
    void Promise.all([utils.repContacts.list.invalidate(), utils.repContacts.stats.invalidate()]);

  const items = listQ.data?.items ?? [];

  return (
    <>
      <Head t="Click-to-Call" s="Tap to dial from your phone, then record what happened. Every call is saved." />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Calls today" value={String(statsQ.data?.callsToday ?? 0)} />
        <StatCard label="Callbacks due" value={String(statsQ.data?.callbacksDue ?? 0)} />
        <StatCard label="Hot contacts" value={String(statsQ.data?.counts?.Hot ?? 0)} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {QUEUES.map((q) => (
          <button
            key={q.key}
            onClick={() => setQueue(q.key)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold transition ${
              queue === q.key ? q.active : "border-border text-muted-foreground hover:border-accent"
            }`}
          >
            <q.Icon size={14} />
            {q.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {listQ.isLoading ? "Loading…" : `${items.length} in queue`}
        </span>
      </div>

      <Section title="Dial queue">
        {listQ.isLoading && <ListSkeleton rows={5} />}

        {!listQ.isLoading && items.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nothing in this queue. Import contacts or pick another bucket.
          </p>
        )}

        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.phone}{c.city ? ` · ${c.city}` : ""}{c.interest ? ` · ${c.interest}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className={`mr-2 rounded-full border px-2 py-0.5 font-semibold ${CONTACT_STATUS_STYLE[c.status] ?? ""}`}>
                      {c.status}
                    </span>
                    {c.lastCallAt
                      ? `Last call ${fmtRelative(String(c.lastCallAt))}${c.lastOutcome ? ` · ${OUTCOME_LABEL[c.lastOutcome] ?? c.lastOutcome}` : ""}`
                      : "Never called"}
                    {c.callbackAt && ` · callback ${new Date(c.callbackAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={telHref(c.phone)}
                    onClick={() => setOpenId(c.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white"
                  >
                    <Phone size={14} /> Dial
                  </a>
                  <a
                    href={waHref(c.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`WhatsApp ${c.name}`}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-border text-emerald-600 hover:border-emerald-400"
                  >
                    <MessageSquare size={14} />
                  </a>
                  <button
                    onClick={() => setOpenId(openId === c.id ? null : c.id)}
                    className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-navy hover:border-accent"
                  >
                    {openId === c.id ? "Hide" : "Log call"}
                  </button>
                </div>
              </div>

              {openId === c.id && (
                <div className="mt-4 border-t border-border pt-4">
                  <LogCallForm contactId={c.id} compact onLogged={refresh} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
