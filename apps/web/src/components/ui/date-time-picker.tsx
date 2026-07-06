"use client";
import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

/**
 * Date & time picker: two trigger fields ("Jul 6, 2026" / "07:45 PM") that
 * open dropdown popovers — a month-grid calendar for the date, and HR / MIN /
 * AM-PM scroll columns with a Confirm button for the time. Dependency-free.
 */

const HOURS = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i)); // 12, 1 … 11
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 00, 05 … 55
const pad = (n: number) => String(n).padStart(2, "0");

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
const fmtTime = (d: Date) =>
  d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();

function timeParts(d: Date) {
  const h24 = d.getHours();
  return {
    hour12: h24 % 12 === 0 ? 12 : h24 % 12,
    minute: d.getMinutes(),
    pm: h24 >= 12,
  };
}

function withTime(date: Date, hour12: number, minute: number, pm: boolean): Date {
  const h24 = (hour12 % 12) + (pm ? 12 : 0);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h24, minute);
}

function TimeColumn<T extends number | boolean>({
  header,
  options,
  render,
  value,
  onPick,
}: {
  header: string;
  options: T[];
  render: (v: T) => string;
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="flex flex-col">
      <span className="pb-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {header}
      </span>
      <div className="flex max-h-44 flex-col gap-1 overflow-y-auto px-0.5">
        {options.map((opt) => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onPick(opt)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              opt === value
                ? "bg-accent font-bold text-accent-foreground"
                : "text-navy hover:bg-secondary"
            }`}
          >
            {render(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DateTimePicker({
  value,
  onChange,
  minDate,
}: {
  value: Date;
  onChange: (d: Date) => void;
  minDate?: Date;
}) {
  const [open, setOpen] = useState<"date" | "time" | null>(null);
  // Draft time parts, applied on Confirm.
  const [draft, setDraft] = useState(() => timeParts(value));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const FIELD =
    "flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm font-semibold text-navy outline-none transition hover:border-accent/50 focus:border-accent";

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(open === "date" ? null : "date")}
          className={`${FIELD} flex-1 ${open === "date" ? "border-accent" : ""}`}
        >
          <CalendarIcon size={15} className="shrink-0 text-accent" />
          {fmtDate(value)}
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(timeParts(value));
            setOpen(open === "time" ? null : "time");
          }}
          className={`${FIELD} ${open === "time" ? "border-accent" : ""}`}
        >
          <Clock size={15} className="shrink-0 text-accent" />
          {fmtTime(value)}
        </button>
      </div>

      {open === "date" && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full min-w-64 shadow-xl">
          <Calendar
            selected={value}
            minDate={minDate}
            onSelect={(d) => {
              const t = timeParts(value);
              onChange(withTime(d, t.hour12, t.minute, t.pm));
              setOpen(null);
            }}
          />
        </div>
      )}

      {open === "time" && (
        <div className="absolute right-0 top-full z-30 mt-2 rounded-xl border border-border bg-white p-3 shadow-xl">
          <div className="flex gap-2">
            <TimeColumn
              header="Hr"
              options={HOURS}
              render={(h) => pad(h)}
              value={draft.hour12}
              onPick={(hour12) => setDraft((d) => ({ ...d, hour12 }))}
            />
            <TimeColumn
              header="Min"
              options={MINUTES}
              render={(m) => pad(m)}
              value={draft.minute}
              onPick={(minute) => setDraft((d) => ({ ...d, minute }))}
            />
            <TimeColumn
              header="—"
              options={[false, true]}
              render={(pm) => (pm ? "PM" : "AM")}
              value={draft.pm}
              onPick={(pm) => setDraft((d) => ({ ...d, pm }))}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(withTime(value, draft.hour12, draft.minute, draft.pm));
              setOpen(null);
            }}
            className="mt-3 w-full rounded-lg bg-accent py-2 text-xs font-bold uppercase tracking-wide text-accent-foreground transition hover:opacity-90"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}
