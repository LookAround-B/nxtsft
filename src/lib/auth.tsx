'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "super-admin" | "admin" | "supervisor" | "sales" | "user" | "customer";

export interface Session {
  role: Role;
  name: string;
  email: string;
  initials: string;
  city: string;
  phone: string;
  joined: string;
}

export const ROLE_META: Record<Role, { label: string; portal: string; portalName: string; demoEmail: string; demoName: string; city: string; phone: string }> = {
  "super-admin": { label: "Super Admin", portal: "/sa-portal", portalName: "NestIt Command", demoEmail: "sa@nestit.in", demoName: "Aarav Kapoor", city: "Bengaluru HQ", phone: "+91 98xxx 00001" },
  admin: { label: "Admin", portal: "/admin-portal", portalName: "NestIt Control", demoEmail: "admin@nestit.in", demoName: "Meera Iyer", city: "Mumbai", phone: "+91 98xxx 00002" },
  supervisor: { label: "Supervisor", portal: "/supervisor-portal", portalName: "NestIt Desk", demoEmail: "supervisor@nestit.in", demoName: "Rahul Verma", city: "Pune", phone: "+91 98xxx 00003" },
  sales: { label: "Sales Rep", portal: "/sales-portal", portalName: "NestIt Field", demoEmail: "priya@nestit.in", demoName: "Priya Sharma", city: "Mumbai", phone: "+91 98xxx 12042" },
  user: { label: "Home Buyer", portal: "/user-portal", portalName: "NestIt Home", demoEmail: "rohan@example.com", demoName: "Rohan Mehta", city: "Mumbai", phone: "+91 98xxx 11000" },
  customer: { label: "Customer", portal: "/user-portal", portalName: "NestIt Concierge", demoEmail: "ananya@example.com", demoName: "Ananya Gupta", city: "Delhi", phone: "+91 98xxx 11001" },
};

const STORAGE_KEY = "nestit.session";

interface Ctx {
  session: Session | null;
  signIn: (role: Role) => Session;
  signOut: () => void;
}

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setSession(JSON.parse(raw));
    } catch {}
  }, []);

  const signIn = (role: Role) => {
    const meta = ROLE_META[role];
    const initials = meta.demoName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
    const s: Session = {
      role,
      name: meta.demoName,
      email: meta.demoEmail,
      initials,
      city: meta.city,
      phone: meta.phone,
      joined: "Jan 2024",
    };
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
    setSession(s);
    return s;
  };

  const signOut = () => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    setSession(null);
  };

  return <AuthContext.Provider value={{ session, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
