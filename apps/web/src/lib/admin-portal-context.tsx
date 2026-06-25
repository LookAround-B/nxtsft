"use client";
import { createContext, useState, ReactNode } from "react";

export type AdminRole = "supervisor" | "sales-rep" | "customer" | "agent" | "referral";
export type ReportSection = "kpi" | "funnel" | "leaderboard" | "activity" | "leads" | "quickActions";

interface AdminPortalContextType {
  selectedRoles: AdminRole[];
  toggleRole: (role: AdminRole) => void;
  clearRoles: () => void;
  startDate: Date | null;
  endDate: Date | null;
  setDateRange: (start: Date | null, end: Date | null) => void;
  visibleReports: ReportSection[];
  toggleReport: (report: ReportSection) => void;
  toggleAllReports: (visible: boolean) => void;
}

export const AdminPortalContext = createContext<AdminPortalContextType | undefined>(undefined);

const DEFAULT_REPORTS: ReportSection[] = ["kpi", "funnel", "leaderboard", "activity", "leads", "quickActions"];

export function AdminPortalProvider({ children }: { children: ReactNode }) {
  const [selectedRoles, setSelectedRoles] = useState<AdminRole[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [visibleReports, setVisibleReports] = useState<ReportSection[]>(DEFAULT_REPORTS);

  const toggleRole = (role: AdminRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const clearRoles = () => setSelectedRoles([]);

  const setDateRange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  const toggleReport = (report: ReportSection) => {
    setVisibleReports((prev) =>
      prev.includes(report) ? prev.filter((r) => r !== report) : [...prev, report]
    );
  };

  const toggleAllReports = (visible: boolean) => {
    setVisibleReports(visible ? DEFAULT_REPORTS : []);
  };

  return (
    <AdminPortalContext.Provider
      value={{
        selectedRoles,
        toggleRole,
        clearRoles,
        startDate,
        endDate,
        setDateRange,
        visibleReports,
        toggleReport,
        toggleAllReports,
      }}
    >
      {children}
    </AdminPortalContext.Provider>
  );
}

