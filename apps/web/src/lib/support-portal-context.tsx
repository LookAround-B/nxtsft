"use client";
import { createContext, useState, ReactNode } from "react";

// GOL-137 "job category" = the raiser's auth role. Values are role strings
// sent straight to the tickets API jobRole filter; labels are display-only.
export const JOB_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "super-admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "sales", label: "Sales Rep" },
  { value: "user", label: "Customer" },
  { value: "home-seller", label: "Agent" },
];

interface SupportPortalContextType {
  startDate: Date | null;
  endDate: Date | null;
  setDateRange: (start: Date | null, end: Date | null) => void;
  selectedJobRoles: string[];
  toggleJobRole: (role: string) => void;
  clearJobRoles: () => void;
}

export const SupportPortalContext = createContext<SupportPortalContextType | undefined>(undefined);

export function SupportPortalProvider({ children }: { children: ReactNode }) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedJobRoles, setSelectedJobRoles] = useState<string[]>([]);

  const setDateRange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  const toggleJobRole = (role: string) =>
    setSelectedJobRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );

  const clearJobRoles = () => setSelectedJobRoles([]);

  return (
    <SupportPortalContext.Provider
      value={{
        startDate,
        endDate,
        setDateRange,
        selectedJobRoles,
        toggleJobRole,
        clearJobRoles,
      }}
    >
      {children}
    </SupportPortalContext.Provider>
  );
}
