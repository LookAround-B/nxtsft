"use client";
import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, Clock, XCircle, Building2, LayoutGrid } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { properties } from "@/data/static";
import { Head } from "./shared";

/* ── Approval status per listing (demo; wire to DB when ready) ── */
type ApprovalStatus = "Approved" | "Awaiting Approval" | "Rejected";

const APPROVAL_MAP: Record<string, ApprovalStatus> = {
  p1: "Approved",
  p2: "Approved",
  p3: "Awaiting Approval",
  p4: "Approved",
  p5: "Rejected",
  p6: "Awaiting Approval",
};

/* ── Filter config ────────────────────────────────────────────── */
type FilterKey = "All" | ApprovalStatus;

const FILTERS: {
  key: FilterKey;
  label: string;
  Icon: React.ElementType;
  active: string;
  inactive: string;
  badge: string;
}[] = [
  {
    key: "All",
    label: "All",
    Icon: LayoutGrid,
    active:   "bg-navy text-white border-navy shadow-sm",
    inactive: "border-border text-navy bg-white hover:bg-secondary",
    badge:    "bg-navy/10 text-navy",
  },
  {
    key: "Approved",
    label: "Approved",
    Icon: CheckCircle2,
    active:   "bg-emerald-500 text-white border-emerald-500 shadow-sm",
    inactive: "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
    badge:    "bg-emerald-100 text-emerald-700",
  },
  {
    key: "Awaiting Approval",
    label: "Awaiting",
    Icon: Clock,
    active:   "bg-amber-500 text-white border-amber-500 shadow-sm",
    inactive: "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100",
    badge:    "bg-amber-100 text-amber-700",
  },
  {
    key: "Rejected",
    label: "Rejected",
    Icon: XCircle,
    active:   "bg-accent text-white border-accent shadow-sm",
    inactive: "border-accent/20 text-accent bg-accent/5 hover:bg-accent/10",
    badge:    "bg-red-100 text-accent",
  },
];

/* ── Status badge config ────────────────────────────────────────── */
const STATUS_STYLE: Record<ApprovalStatus, { icon: React.ReactNode; cls: string }> = {
  "Approved":          { icon: <CheckCircle2 size={11} />, cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "Awaiting Approval": { icon: <Clock size={11} />,        cls: "bg-amber-100 text-amber-700 border-amber-200"       },
  "Rejected":          { icon: <XCircle size={11} />,      cls: "bg-red-100 text-accent border-accent/20"            },
};

const HINT: Record<ApprovalStatus, string> = {
  "Approved":          "Live on platform",
  "Awaiting Approval": "Under admin review",
  "Rejected":          "Contact admin to re-submit",
};

/* ── Listings to show (only p1–p6 assigned to this rep) ─────── */
const assignedListings = properties.filter((p) => APPROVAL_MAP[p.id]);

export function ListingsTab() {
  const [filter, setFilter] = useState<FilterKey>("All");

  const visible =
    filter === "All"
      ? assignedListings
      : assignedListings.filter((p) => APPROVAL_MAP[p.id] === filter);

  const counts = Object.fromEntries(
    FILTERS.map((f) => [
      f.key,
      f.key === "All"
        ? assignedListings.length
        : assignedListings.filter((p) => APPROVAL_MAP[p.id] === f.key).length,
    ]),
  ) as Record<FilterKey, number>;

  return (
    <>
      <Head t="Assigned Listings" s="Properties tagged to you." />

      {/* ── Filter buttons ─────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-bold transition-all duration-150 ${
              filter === f.key ? f.active : f.inactive
            }`}
          >
            <f.Icon size={14} />
            {f.label}
            <span
              className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                filter === f.key ? "bg-white/20 text-white" : f.badge
              }`}
            >
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Inventory grid ──────────────────────────────────────── */}
      <Section title={`Inventory${filter !== "All" ? ` — ${filter}` : ""}`}>
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <Building2 size={28} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-navy">No {filter} listings</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Switch category or check with your admin.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => {
              const status = APPROVAL_MAP[p.id] ?? "Awaiting Approval";
              const style  = STATUS_STYLE[status];
              const hint   = HINT[status];

              return (
                <div
                  key={p.id}
                  className={`overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-md ${
                    status === "Approved"
                      ? "border-emerald-200"
                      : status === "Awaiting Approval"
                      ? "border-amber-200"
                      : "border-accent/20"
                  }`}
                >
                  {/* Image with status badge overlay */}
                  <div className="relative">
                    <Image
                      src={p.image}
                      alt=""
                      width={640}
                      height={128}
                      className="h-36 w-full object-cover"
                    />
                    {/* Approval status badge — top-right overlay */}
                    <div className="absolute right-2 top-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm ${style.cls}`}
                      >
                        {style.icon}
                        {status}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-3">
                    <div className="text-xs text-muted-foreground">{p.locality}</div>
                    <div className="mt-0.5 font-semibold text-navy leading-snug">{p.title}</div>
                    <div className="mt-1 font-display text-base font-bold text-accent">
                      {p.priceLabel}
                    </div>
                    {/* Hint line */}
                    <div className={`mt-2 text-[10px] font-semibold ${
                      status === "Approved"          ? "text-emerald-600" :
                      status === "Awaiting Approval" ? "text-amber-600"   : "text-accent"
                    }`}>
                      {hint}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
