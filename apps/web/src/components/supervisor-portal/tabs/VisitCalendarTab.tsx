"use client";
import { Section, Badge } from "@/components/portal/PortalShell";
import { PageHead } from "./shared";

type VisitStatus = "Confirmed" | "Pending" | "Cancelled";

const visits: {
  day: string;
  dayShort: string;
  time: string;
  hour: number;
  rep: string;
  prop: string;
  status: VisitStatus;
}[] = [
  { day: "Monday", dayShort: "Mon", time: "10:00 AM", hour: 10, rep: "Priya S.", prop: "Skyline Residences", status: "Confirmed" },
  { day: "Monday", dayShort: "Mon", time: "4:30 PM", hour: 16, rep: "Karan J.", prop: "Green Acres Villa", status: "Confirmed" },
  { day: "Tuesday", dayShort: "Tue", time: "11:00 AM", hour: 11, rep: "Priya S.", prop: "Marina Heights", status: "Pending" },
  { day: "Wednesday", dayShort: "Wed", time: "2:00 PM", hour: 14, rep: "Anita R.", prop: "Heritage Bungalow", status: "Confirmed" },
  { day: "Thursday", dayShort: "Thu", time: "3:30 PM", hour: 15, rep: "Karan J.", prop: "Urban Studio", status: "Cancelled" },
  { day: "Friday", dayShort: "Fri", time: "10:00 AM", hour: 10, rep: "Devansh P.", prop: "Tech Park Office", status: "Pending" },
  { day: "Saturday", dayShort: "Sat", time: "12:00 PM", hour: 12, rep: "Priya S.", prop: "Skyline Residences", status: "Confirmed" },
  { day: "Saturday", dayShort: "Sat", time: "4:00 PM", hour: 16, rep: "Anita R.", prop: "Green Acres Villa", status: "Pending" },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const statusVisitStyle: Record<VisitStatus, string> = {
  Confirmed: "bg-emerald-100 border-emerald-300 text-emerald-800",
  Pending: "bg-amber-100 border-amber-300 text-amber-800",
  Cancelled: "bg-red-100 border-red-300 text-red-700 line-through opacity-60",
};

const statusDot: Record<VisitStatus, string> = {
  Confirmed: "bg-emerald-500",
  Pending: "bg-amber-400",
  Cancelled: "bg-red-400",
};

export function VisitCalendarTab() {
  return (
    <>
      <PageHead title="Visit Calendar" sub="Site visits scheduled across the team — week view." />

      {/* Week grid */}
      <Section title="Week Grid — Mon to Sat · 9AM–7PM">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header row */}
            <div className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-border pb-2 mb-1">
              <div />
              {days.map((d) => (
                <div
                  key={d}
                  className="text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Time rows */}
            {hours.map((h) => (
              <div
                key={h}
                className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-border/50 min-h-[44px]"
              >
                <div className="flex items-start pt-1 pr-2 text-right">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`}
                  </span>
                </div>
                {days.map((d) => {
                  const cell = visits.find((v) => v.dayShort === d && v.hour === h);
                  return (
                    <div key={d} className="border-l border-border/30 p-0.5">
                      {cell && (
                        <div
                          className={`rounded border px-1.5 py-1 text-[10px] leading-tight ${statusVisitStyle[cell.status]}`}
                        >
                          <div className="font-bold truncate">{cell.prop.split(" ")[0]}</div>
                          <div className="opacity-80">{cell.rep}</div>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDot[cell.status]}`} />
                            <span className="opacity-70">{cell.status}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* List view */}
      <Section title="All Scheduled Visits">
        {visits.map((v, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-border py-3 last:border-0"
          >
            <div>
              <div className="font-semibold text-navy">{v.prop}</div>
              <div className="text-xs text-muted-foreground">
                {v.rep} · {v.day}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-display text-sm font-bold text-accent">{v.day}</div>
                <div className="text-xs text-muted-foreground">{v.time}</div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${statusVisitStyle[v.status]}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot[v.status]}`} />
                {v.status}
              </span>
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}
