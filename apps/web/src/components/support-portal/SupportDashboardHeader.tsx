"use client";
import { useContext, useState } from "react";
import { Settings } from "lucide-react";
import { SupportPortalContext, JOB_ROLE_OPTIONS } from "@/lib/support-portal-context";
import { DateRangePicker } from "@/components/admin-portal/DateRangePicker";

export function SupportDashboardHeader() {
  const ctx = useContext(SupportPortalContext);
  const [showFilters, setShowFilters] = useState(false);

  const startDate = ctx?.startDate ?? null;
  const endDate = ctx?.endDate ?? null;
  const setDateRange = ctx?.setDateRange ?? (() => {});
  const selectedJobRoles = ctx?.selectedJobRoles ?? [];
  const toggleJobRole = ctx?.toggleJobRole ?? (() => {});
  const clearJobRoles = ctx?.clearJobRoles ?? (() => {});

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
          {selectedJobRoles.length > 0 ? `Job Category (${selectedJobRoles.length})` : "Job Category"}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="border border-border rounded-lg bg-secondary/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy">Filter by job category:</span>
            {selectedJobRoles.length > 0 && (
              <button
                onClick={clearJobRoles}
                className="text-xs text-accent hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {JOB_ROLE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedJobRoles.includes(opt.value)}
                  onChange={() => toggleJobRole(opt.value)}
                  className="rounded"
                />
                <span className="text-xs font-medium text-navy">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
