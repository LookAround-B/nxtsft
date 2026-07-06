"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Dependency-free month-grid date picker: chevron month stepping plus
 * month/year dropdown selects, adjacent-month days rendered muted (6-week
 * grid). Days before `minDate` (default today) are disabled.
 */

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date | null, b: Date) =>
  !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const SELECT =
  "rounded-lg border border-border bg-secondary/40 px-2 py-1 text-xs font-semibold text-navy outline-none focus:border-accent";

export function Calendar({
  selected,
  onSelect,
  minDate,
  yearsAhead = 2,
  className = "",
}: {
  selected: Date | null;
  onSelect: (date: Date) => void;
  minDate?: Date;
  /** How many years past the min year the year dropdown offers. */
  yearsAhead?: number;
  className?: string;
}) {
  const min = startOfDay(minDate ?? new Date());
  const [view, setView] = useState(() => {
    const base = selected ?? min;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // Follow an externally-changed selection (e.g. parent resets the value).
  useEffect(() => {
    if (selected) setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [selected?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  const year = view.getFullYear();
  const month = view.getMonth();
  const today = startOfDay(new Date());
  const canGoPrev = new Date(year, month, 1) > new Date(min.getFullYear(), min.getMonth(), 1);
  const years = Array.from({ length: yearsAhead + 1 }, (_, i) => min.getFullYear() + i);

  // 6-week grid starting on the Sunday at/before the 1st of the month.
  const gridStart = new Date(year, month, 1 - new Date(year, month, 1).getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    return { date, inMonth: date.getMonth() === month, disabled: date < min };
  });

  return (
    <div className={`select-none rounded-xl border border-border bg-white p-3 ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => canGoPrev && setView(new Date(year, month - 1, 1))}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary disabled:opacity-30"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="flex items-center gap-1.5">
          <select
            value={month}
            onChange={(e) => setView(new Date(year, Number(e.target.value), 1))}
            aria-label="Month"
            className={SELECT}
          >
            {MONTHS.map((m, i) => (
              <option
                key={m}
                value={i}
                disabled={year === min.getFullYear() && i < min.getMonth()}
              >
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => {
              const y = Number(e.target.value);
              const m = y === min.getFullYear() && month < min.getMonth() ? min.getMonth() : month;
              setView(new Date(y, m, 1));
            }}
            aria-label="Year"
            className={SELECT}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setView(new Date(year, month + 1, 1))}
          aria-label="Next month"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1 text-[10px] font-semibold uppercase text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map(({ date, inMonth, disabled }) => {
          const isSelected = sameDay(selected, date);
          const isToday = sameDay(today, date);
          return (
            <button
              key={date.getTime()}
              type="button"
              onClick={() => !disabled && onSelect(date)}
              disabled={disabled}
              className={`mx-auto grid h-8 w-8 place-items-center rounded-lg text-sm transition ${
                isSelected
                  ? "bg-accent font-bold text-accent-foreground"
                  : disabled
                    ? "text-muted-foreground/30"
                    : !inMonth
                      ? "text-muted-foreground/50 hover:bg-secondary"
                      : `text-navy hover:bg-secondary ${isToday ? "font-bold text-accent" : ""}`
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
