"use client";
import type { ReactNode } from "react";

// ─── PageHead ─────────────────────────────────────────────────────────────────
export function PageHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-bold text-navy">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type TicketStatus = "Open" | "Resolved" | "Escalated";

export type DbTicket = {
  id: string;
  subject: string;
  category: string; // payment | property | agent | technical | other
  priority: string; // low | medium | high | urgent
  status: string; // open | in_progress | resolved | closed
  assignedTo: string | null;
  createdAt: string;
  resolvedAt: string | null;
  user: { id: string; name: string; email: string } | null;
};

// ─── Shared lookups ───────────────────────────────────────────────────────────
export const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const isEscalated = (priority: string) =>
  priority === "high" || priority === "urgent";

export const ticketTone = (t: DbTicket): "success" | "hot" | "warm" | "default" => {
  if (t.status === "resolved" || t.status === "closed") return "success";
  if (isEscalated(t.priority)) return "hot";
  return "warm";
};

export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export const fmtTicketDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
