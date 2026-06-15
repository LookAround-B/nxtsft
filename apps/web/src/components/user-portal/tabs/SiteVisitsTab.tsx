"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import { Badge, Section } from "@/components/portal/PortalShell";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Head } from "./shared";

type VisitItem = {
  id: string;
  status: string;
  scheduledAt: string;
  notes: string | null;
  property: {
    id: string;
    slug: string;
    title: string;
    images: string[];
    location: { city: string; locality: string } | null;
  } | null;
};

const visitWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function UpcomingVisitCard({ v, onChanged }: { v: VisitItem; onChanged: () => void }) {
  const reschedule = trpc.siteVisits.reschedule.useMutation({
    onSuccess: () => { onChanged(); toast.success("Visit rescheduled"); setEditing(false); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const cancel = trpc.siteVisits.cancel.useMutation({
    onSuccess: () => { onChanged(); toast.success("Visit cancelled"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const [editing, setEditing] = useState(false);
  const [when, setWhen] = useState("");

  const submitReschedule = () => {
    if (!when) return toast.error("Pick a new date and time.");
    reschedule.mutate({ id: v.id, scheduledAt: new Date(when).toISOString() });
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-4">
      <div className="flex items-center gap-3">
        <Image
          src={v.property?.images?.[0] ?? "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&q=70"}
          alt={v.property?.title ?? "Property"}
          width={64}
          height={48}
          className="flex-shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm font-bold text-navy">{v.property?.title ?? "Property visit"}</div>
          <div className="text-xs text-muted-foreground">
            {v.property?.location?.city ? `${v.property.location.city} · ` : ""}{visitWhen(v.scheduledAt)}
          </div>
        </div>
        <Badge tone={v.status === "Rescheduled" ? "warm" : "new"}>{v.status}</Badge>
      </div>

      {editing ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="rounded-md border border-border bg-white px-2 py-1 text-xs outline-none focus:border-accent"
          />
          <button
            onClick={submitReschedule}
            disabled={reschedule.isPending}
            className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground disabled:opacity-50"
          >
            {reschedule.isPending ? "Saving…" : "Confirm"}
          </button>
          <button onClick={() => setEditing(false)} className="rounded-md border border-border px-3 py-1 text-xs font-semibold">
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md bg-mid-blue px-3 py-1 text-xs font-semibold text-white"
          >
            Reschedule
          </button>
          <button
            onClick={() => cancel.mutate({ id: v.id })}
            disabled={cancel.isPending}
            className="rounded-md border border-border px-3 py-1 text-xs font-semibold disabled:opacity-50"
          >
            Cancel visit
          </button>
        </div>
      )}
    </div>
  );
}

export function SiteVisitsTab() {
  const { session } = useAuth();
  const visitsQ = trpc.users.siteVisits.useQuery(undefined, { enabled: !!session });
  const visits = (visitsQ.data ?? []) as unknown as VisitItem[];
  const upcoming = visits.filter((v) => v.status === "Scheduled" || v.status === "Rescheduled");
  const past = visits.filter((v) => v.status === "Completed" || v.status === "Cancelled");

  return (
    <>
      <Head t="Site Visits" s="Tours you've booked." />
      {visitsQ.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-white" />
          ))}
        </div>
      ) : visits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 py-16 text-center">
          <Calendar size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-muted-foreground">No site visits booked yet.</p>
          <Link href="/properties" className="mt-2 inline-block text-xs text-accent hover:underline">
            Browse properties →
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <Section title="Upcoming">
              <div className="space-y-3">
                {upcoming.map((v) => (
                  <UpcomingVisitCard key={v.id} v={v} onChanged={() => visitsQ.refetch()} />
                ))}
              </div>
            </Section>
          )}
          {past.length > 0 && (
            <Section title="Past Visits">
              <div className="space-y-3">
                {past.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 opacity-75">
                    <Image
                      src={v.property?.images?.[0] ?? "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&q=70"}
                      alt={v.property?.title ?? "Property"}
                      width={64}
                      height={48}
                      className="flex-shrink-0 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm font-bold text-navy">{v.property?.title ?? "Property visit"}</div>
                      <div className="text-xs text-muted-foreground">
                        {v.property?.location?.city ? `${v.property.location.city} · ` : ""}{visitWhen(v.scheduledAt)}
                      </div>
                    </div>
                    <Badge tone={v.status === "Completed" ? "success" : "default"}>{v.status}</Badge>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </>
  );
}
