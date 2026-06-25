"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

function isSameDay(d1: Date | null, d2: Date | null) {
  if (!d1 || !d2) return false;
  return d1.toDateString() === d2.toDateString();
}

function isBetweenDates(date: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  return date > start && date < end;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [displayMonth, setDisplayMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth()));
  const [isOpen, setIsOpen] = useState(false);

  const daysInMonth = getDaysInMonth(displayMonth);
  const firstDay = getFirstDayOfMonth(displayMonth);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(displayMonth.getFullYear(), displayMonth.getMonth(), i));
  }

  const handleDayClick = (day: Date) => {
    if (!startDate) {
      onChange(day, null);
    } else if (!endDate) {
      if (day < startDate) {
        onChange(day, startDate);
      } else {
        onChange(startDate, day);
      }
      setIsOpen(false);
    } else {
      onChange(day, null);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 border border-border rounded-lg bg-white cursor-pointer hover:bg-secondary/20 transition-colors"
      >
        <div className="flex-1 text-sm">
          <div className="text-xs text-muted-foreground">FROM</div>
          <div className="font-medium text-navy">{formatDate(startDate) || "Select date"}</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex-1 text-sm">
          <div className="text-xs text-muted-foreground">TO</div>
          <div className="font-medium text-navy">{formatDate(endDate) || "Select date"}</div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 bg-white border border-border rounded-lg shadow-lg p-4 z-50 w-80">
          {/* Month/Year header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1))}
              className="p-1 hover:bg-secondary rounded"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-navy">
              {MONTHS[displayMonth.getMonth()]} {displayMonth.getFullYear()}
            </span>
            <button
              onClick={() => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1))}
              className="p-1 hover:bg-secondary rounded"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-xs font-bold text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const isSelectable = day !== null;
              const isStart = isSameDay(day, startDate);
              const isEnd = isSameDay(day, endDate);
              const isBetween = isSelectable && isBetweenDates(day, startDate, endDate);
              const isDisabled = isSelectable && startDate && !endDate && day ? day < startDate : false;

              return (
                <button
                  key={idx}
                  onClick={() => isSelectable && !isDisabled && handleDayClick(day!)}
                  disabled={Boolean(!isSelectable || isDisabled)}
                  className={`
                    h-8 text-sm font-medium rounded transition-colors
                    ${!isSelectable ? "text-transparent" : ""}
                    ${isStart || isEnd ? "bg-accent text-white font-bold" : ""}
                    ${isBetween ? "bg-accent/20 text-navy" : ""}
                    ${isSelectable && !isStart && !isEnd && !isBetween ? "hover:bg-secondary cursor-pointer text-navy" : ""}
                    ${isDisabled ? "text-muted-foreground cursor-not-allowed opacity-50" : ""}
                  `}
                >
                  {day ? day.getDate() : ""}
                </button>
              );
            })}
          </div>

          {/* Clear button */}
          {(startDate || endDate) && (
            <button
              onClick={() => {
                onChange(null, null);
                setIsOpen(false);
              }}
              className="mt-4 w-full py-2 text-xs font-semibold text-accent hover:bg-secondary/20 rounded transition-colors"
            >
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  );
}
