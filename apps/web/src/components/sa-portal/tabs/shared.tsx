"use client";
import { type ReactNode } from "react";

export function TabHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-bold text-navy">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function Toggle({ on, onToggle }: { on: boolean; onToggle?: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-block h-6 w-11 rounded-full transition focus:outline-none ${on ? "bg-accent" : "bg-secondary"}`}
      type="button"
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-5" : "left-0.5"}`}
      />
    </button>
  );
}
