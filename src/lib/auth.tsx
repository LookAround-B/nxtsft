'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "super-admin" | "admin" | "supervisor" | "sales" | "support-admin" | "user" | "customer";

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
  "super-admin": { label: "Super Admin",  portal: "/sa-portal",          portalName: "NxtSft.com Command",  demoEmail: "sa@nxtsft.com",          demoName: "Aarav Kapoor",  city: "Bengaluru HQ", phone: "+91 98xxx 00001" },
  admin:         { label: "Admin",         portal: "/admin-portal",       portalName: "NxtSft.com Control",  demoEmail: "admin@nxtsft.com",       demoName: "Meera Iyer",    city: "Mumbai",       phone: "+91 98xxx 00002" },
  supervisor:    { label: "Supervisor",    portal: "/supervisor-portal",  portalName: "NxtSft.com Desk",     demoEmail: "supervisor@nxtsft.com",  demoName: "Rahul Verma",   city: "Pune",         phone: "+91 98xxx 00003" },
  sales:         { label: "Sales Rep",     portal: "/sales-portal",       portalName: "NxtSft.com Field",    demoEmail: "priya@nxtsft.com",       demoName: "Priya Sharma",  city: "Mumbai",       phone: "+91 98xxx 12042" },
  "support-admin":{ label: "Support Admin", portal: "/support-portal",    portalName: "NxtSft.com Support",  demoEmail: "support@nxtsft.com",     demoName: "Support Admin", city: "Mumbai",       phone: "+91 98xxx 00005" },
  user:          { label: "Home Buyer",    portal: "/user-portal",        portalName: "NxtSft.com Home",     demoEmail: "rohan@example.com",      demoName: "Rohan Mehta",   city: "Mumbai",       phone: "+91 98xxx 11000" },
  customer:      { label: "Customer",      portal: "/user-portal",        portalName: "NxtSft.com Concierge",demoEmail: "ananya@example.com",     demoName: "Ananya Gupta",  city: "Delhi",        phone: "+91 98xxx 11001" },
};

const SESSION_KEY = "nxtsft.session";
const CREDITS_KEY = "nxtsft.credits";

interface Ctx {
  session:       Session | null;
  credits:       number;
  signIn:        (role: Role) => Session;
  signOut:       () => void;
  register:      (name: string, email: string, phone: string) => Session;
  updateProfile: (name: string, phone: string) => void;
  addCredits:    (n: number) => void;
  useCredit:     () => boolean;
}

const AuthContext = createContext<Ctx | null>(null);

function readCredits(): number {
  try { return Math.max(0, parseInt(localStorage.getItem(CREDITS_KEY) ?? '0', 10) || 0); } catch { return 0; }
}

function writeCredits(n: number): void {
  try { localStorage.setItem(CREDITS_KEY, String(Math.max(0, n))); } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(SESSION_KEY) : null;
      if (raw) setSession(JSON.parse(raw));
    } catch {}
    setCredits(readCredits());
  }, []);

  const signIn = (role: Role): Session => {
    const meta = ROLE_META[role];
    const initials = meta.demoName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
    const s: Session = { role, name: meta.demoName, email: meta.demoEmail, initials, city: meta.city, phone: meta.phone, joined: "Jan 2024" };
    try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
    setSession(s);
    // Demo home-buyer roles get 3 free credits to explore the platform
    if ((role === 'user' || role === 'customer') && readCredits() === 0) {
      writeCredits(3);
      setCredits(3);
    } else {
      setCredits(readCredits());
    }
    return s;
  };

  const signOut = () => {
    try { window.localStorage.removeItem(SESSION_KEY); } catch {}
    setSession(null);
    setCredits(readCredits()); // keep credits
  };

  const register = (name: string, email: string, phone: string): Session => {
    const initials = name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
    const joined = new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    const s: Session = { role: 'user', name, email, initials, city: 'India', phone, joined };
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      const users: Session[] = JSON.parse(window.localStorage.getItem('nxtsft.users') ?? '[]');
      if (!users.find((u) => u.email === email)) users.push(s);
      window.localStorage.setItem('nxtsft.users', JSON.stringify(users));
    } catch {}
    setSession(s);
    // Give 1 free credit on registration (welcome gift)
    if (readCredits() === 0) {
      writeCredits(1);
      setCredits(1);
    } else {
      setCredits(readCredits());
    }
    return s;
  };

  const updateProfile = (name: string, phone: string) => {
    if (!session) return;
    const initials = name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
    const updated: Session = { ...session, name, phone, initials };
    try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(updated)); } catch {}
    setSession(updated);
  };

  const addCredits = (n: number) => {
    const next = readCredits() + n;
    writeCredits(next);
    setCredits(next);
  };

  const useCredit = (): boolean => {
    const current = readCredits();
    if (current <= 0) return false;
    const next = current - 1;
    writeCredits(next);
    setCredits(next);
    return true;
  };

  return (
    <AuthContext.Provider value={{ session, credits, signIn, signOut, register, updateProfile, addCredits, useCredit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
