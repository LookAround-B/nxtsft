"use client";
import { useState } from "react";
import { Settings } from "lucide-react";
import { useContext } from "react";
import { AdminPortalContext, type AdminRole, type ReportSection } from "@/lib/admin-portal-context";
import { DateRangePicker } from "./DateRangePicker";

const ROLE_OPTIONS: { value: AdminRole; label: string }[] = [
  { value: "supervisor", label: "Supervisor" },
  { value: "sales-rep", label: "Sales Rep" },
  { value: "customer", label: "Customer" },
  { value: "agent", label: "Agent" },
  { value: "referral", label: "Referral" },
];

const REPORT_OPTIONS: { value: ReportSection; label: string }[] = [
  { value: "kpi", label: "KPI Scorecard" },
  { value: "funnel", label: "Conversion Funnel" },
  { value: "leaderboard", label: "Sales Leaderboard" },
  { value: "activity", label: "Activity Stream" },
  { value: "leads", label: "Lead Status" },
  { value: "quickActions", label: "Quick Actions" },
];

export function AdminDashboardHeader() {
  const ctx = useContext(AdminPortalContext);
  const [showFilters, setShowFilters] = useState(false);
  const [tab, setTab] = useState<"roles" | "reports">("roles");

  // Use context if available, otherwise provide safe defaults
  const selectedRoles = ctx?.selectedRoles ?? [];
  const toggleRole = ctx?.toggleRole ?? (() => {});
  const clearRoles = ctx?.clearRoles ?? (() => {});
  const startDate = ctx?.startDate ?? null;
  const endDate = ctx?.endDate ?? null;
  const setDateRange = ctx?.setDateRange ?? (() => {});
  const visibleReports = ctx?.visibleReports ?? [];
  const toggleReport = ctx?.toggleReport ?? (() => {});
  const toggleAllReports = ctx?.toggleAllReports ?? (() => {});

  return (
    <div className="space-y-4">
      {/* Calendar Date Range Picker */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <DateRangePicker startDate={startDate} endDate={endDate} onChange={setDateRange} />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border border-border rounded-lg hover:bg-secondary/30 transition-colors whitespace-nowrap"
        >
          <Settings size={16} />
          {selectedRoles.length > 0 ? `Roles (${selectedRoles.length})` : "Roles"}
        </button>
      </div>

      {/* Filter/Report Panel */}
      {showFilters && (
        <div className="border border-border rounded-lg bg-secondary/20 p-4 space-y-4">
          {/* Tab switcher */}
          <div className="flex items-center gap-2 border-b border-border/30 pb-3">
            <button
              onClick={() => setTab("roles")}
              className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === "roles" ? "text-navy" : "text-muted-foreground hover:text-navy/70"
              }`}
            >
              Data Filter
            </button>
            <span className="text-xs text-border/50">·</span>
            <button
              onClick={() => setTab("reports")}
              className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === "reports" ? "text-navy" : "text-muted-foreground hover:text-navy/70"
              }`}
            >
              Report Sections
            </button>
          </div>

          {/* Role Filter Tab */}
          {tab === "roles" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy">Show data by role:</span>
                {selectedRoles.length > 0 && (
                  <button
                    onClick={clearRoles}
                    className="text-xs text-accent hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {ROLE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(opt.value)}
                      onChange={() => toggleRole(opt.value)}
                      className="rounded"
                    />
                    <span className="text-xs font-medium text-navy">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {tab === "reports" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy">Display on dashboard:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAllReports(true)}
                    className="text-xs text-accent hover:underline"
                  >
                    All
                  </button>
                  <span className="text-xs text-border/50">·</span>
                  <button
                    onClick={() => toggleAllReports(false)}
                    className="text-xs text-accent hover:underline"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {REPORT_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleReports.includes(opt.value)}
                      onChange={() => toggleReport(opt.value)}
                      className="rounded"
                    />
                    <span className="text-xs font-medium text-navy">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
