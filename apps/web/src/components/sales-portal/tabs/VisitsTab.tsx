"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { Head, type OutcomeTone } from "./shared";

type VisitStatus = "Confirmed" | "Pending" | "Cancelled";

const visitStatusTone: Record<VisitStatus, OutcomeTone> = {
  Confirmed: "success",
  Pending: "warm",
  Cancelled: "cold",
};

export function VisitsTab() {
  const initialSlots: Array<{
    day: string;
    time: string;
    lead: string;
    prop: string;
    addr: string;
    status: VisitStatus;
  }> = [
    {
      day: "Today",
      time: "4:30 PM",
      lead: "Rohan Mehta",
      prop: "Skyline Residences",
      addr: "Bandra West, Mumbai",
      status: "Confirmed",
    },
    {
      day: "Tomorrow",
      time: "11:00 AM",
      lead: "Aisha Khan",
      prop: "Green Acres Villa",
      addr: "Whitefield, Bengaluru",
      status: "Pending",
    },
    {
      day: "Sat",
      time: "2:00 PM",
      lead: "Suresh Iyer",
      prop: "Heritage Bungalow",
      addr: "Greater Kailash, Delhi",
      status: "Confirmed",
    },
  ];

  const [slots, setSlots] = useState(initialSlots);

  function cancelVisit(i: number) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "Cancelled" as const } : s)));
    toast.success("Visit cancelled");
  }

  function rescheduleVisit(lead: string) {
    toast.success(`Reschedule request sent for ${lead}`);
  }

  return (
    <>
      <Head t="Site Visits" s="Your scheduled tours." />
      <Section title="Upcoming">
        {slots.map((v, i) => (
          <div key={i} className="border-b border-border py-4 last:border-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-navy">
                    {v.prop} — {v.lead}
                  </span>
                  <Badge tone={visitStatusTone[v.status]}>{v.status}</Badge>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin size={10} /> {v.addr}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-right">
                  <div className="font-display text-sm font-bold text-accent">{v.day}</div>
                  <div className="text-xs text-muted-foreground">{v.time}</div>
                </div>
                <button
                  onClick={() => toast.success(`Map link opened for ${v.prop}`)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
                >
                  <MapPin size={11} /> Map
                </button>
                <button
                  onClick={() => rescheduleVisit(v.lead)}
                  disabled={v.status === "Cancelled"}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => cancelVisit(i)}
                  disabled={v.status === "Cancelled"}
                  className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}
