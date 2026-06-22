"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@nxtsft/trpc";

export type Role =
  | "super-admin"
  | "admin"
  | "supervisor"
  | "sales"
  | "support-admin"
  | "user"
  | "home-seller";

export interface Session {
  id: string;
  role: Role;
  name: string;
  email: string;
  initials: string;
  city: string;
  phone: string;
  joined: string;
}

export const ROLE_META: Record<
  Role,
  { label: string; portal: string; portalName: string; demoEmail: string; demoName: string; city: string; phone: string }
> = {
  "super-admin": {
    label: "Super Admin",
    portal: "/sa-portal",
    portalName: "NxtSft.com Command",
    demoEmail: "sa@nxtsft.com",
    demoName: "Aarav Kapoor",
    city: "Bengaluru HQ",
    phone: "+91 9800000001",
  },
  admin: {
    label: "Admin",
    portal: "/admin-portal",
    portalName: "NxtSft.com Control",
    demoEmail: "admin@nxtsft.com",
    demoName: "Meera Iyer",
    city: "Mumbai",
    phone: "+91 9800000002",
  },
  supervisor: {
    label: "Supervisor",
    portal: "/supervisor-portal",
    portalName: "NxtSft.com Desk",
    demoEmail: "supervisor@nxtsft.com",
    demoName: "Rahul Verma",
    city: "Pune",
    phone: "+91 9800000003",
  },
  sales: {
    label: "Sales Rep",
    portal: "/sales-portal",
    portalName: "NxtSft.com Field",
    demoEmail: "priya@nxtsft.com",
    demoName: "Priya Sharma",
    city: "Mumbai",
    phone: "+91 9800012042",
  },
  "support-admin": {
    label: "Support Admin",
    portal: "/support-portal",
    portalName: "NxtSft.com Support",
    demoEmail: "support@nxtsft.com",
    demoName: "Support Admin",
    city: "Mumbai",
    phone: "+91 9800000005",
  },
  user: {
    label: "Home Buyer",
    portal: "/user-portal",
    portalName: "NxtSft.com Home",
    demoEmail: "rohan@example.com",
    demoName: "Rohan Mehta",
    city: "Mumbai",
    phone: "+91 9800011000",
  },
  "home-seller": {
    label: "Home Seller",
    portal: "/user-portal",
    portalName: "NxtSft.com Seller",
    demoEmail: "ananya@example.com",
    demoName: "Ananya Gupta",
    city: "Delhi",
    phone: "+91 9800011001",
  },
};

const SESSION_KEY = "nxtsft.session";
const CREDITS_KEY = "nxtsft.credits";
const TOKEN_KEY = "nxtsft.token";

/* ---- Cookie helpers (mirror for Edge Middleware) ---- */

function setSessionCookie(token: string, role: string): void {
  document.cookie = `nxtsft_session=${token}|${role}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Strict${window.location.protocol === 'https:' ? '; Secure' : ''}`;
}

function clearSessionCookie(): void {
  document.cookie = 'nxtsft_session=; path=/; max-age=0';
}

interface Ctx {
  session: Session | null;
  credits: number;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Session>;
  signInStaff: (email: string, password: string) => Promise<Session>;
  signInWithGoogle: (credential: string) => Promise<Session>;
  signOut: () => Promise<void>;
  register: (name: string, email: string, phone: string, password: string, city?: string) => Promise<Session>;
  updateProfile: (name: string, phone: string) => Promise<void>;
  addCredits: (n: number) => void;
  useCredit: () => boolean;
  refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<Ctx | null>(null);

// Vanilla tRPC client for imperative calls (AuthProvider can't use hooks)
function makeTRPC(token?: string | null) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    ],
  });
}

function toInitials(name: string): string {
  return name.split(" ").map((s) => s[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function formatJoined(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

type SafeUser = {
  id: string;
  role: string;
  name: string;
  email: string;
  phone: string | null;
  city: string;
  credits: number;
  joined: Date | string;
};

function toSession(user: SafeUser): Session {
  return {
    id: user.id,
    role: user.role as Role,
    name: user.name,
    email: user.email,
    initials: toInitials(user.name),
    city: user.city || "India",
    phone: user.phone ? (user.phone.startsWith("+") ? user.phone : `+91 ${user.phone}`) : "",
    joined: formatJoined(user.joined),
  };
}

function readLS(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function removeLS(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [credits, setCredits] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = readLS(SESSION_KEY, "null");
    const t = readLS(TOKEN_KEY, "");
    const c = Math.max(0, parseInt(readLS(CREDITS_KEY, "0"), 10) || 0);
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setSession(parsed as Session);
        if (t && parsed) {
          setSessionCookie(t, (parsed as Session).role);
        }
      }
    } catch {}
    if (t) setToken(t);
    setCredits(c);
    setLoading(false);
  }, []);

  function persist(s: Session, t: string, c: number) {
    writeLS(SESSION_KEY, JSON.stringify(s));
    writeLS(TOKEN_KEY, t);
    writeLS(CREDITS_KEY, String(c));
    setSession(s);
    setToken(t);
    setCredits(c);
  }

  async function signIn(email: string, password: string): Promise<Session> {
    const { token: t, user } = await makeTRPC().auth.login.mutate({ email, password });
    const s = toSession(user);
    persist(s, t, user.credits);
    setSessionCookie(t, user.role);
    return s;
  }

  async function signInStaff(email: string, password: string): Promise<Session> {
    const { token: t, user } = await makeTRPC().auth.loginStaff.mutate({ email, password });
    const s = toSession(user);
    persist(s, t, user.credits);
    setSessionCookie(t, user.role);
    return s;
  }

  async function signInWithGoogle(credential: string): Promise<Session> {
    const { token: t, user } = await makeTRPC().auth.googleSignIn.mutate({ credential });
    const s = toSession(user);
    persist(s, t, user.credits);
    setSessionCookie(t, user.role);
    return s;
  }

  async function signOut(): Promise<void> {
    if (token) {
      try {
        await makeTRPC(token).auth.logout.mutate();
      } catch {}
    }
    clearSessionCookie();
    removeLS(SESSION_KEY);
    removeLS(TOKEN_KEY);
    setSession(null);
    setToken(null);
    // credits are intentionally preserved across sign-out
    setCredits(Math.max(0, parseInt(readLS(CREDITS_KEY, "0"), 10) || 0));
  }

  async function register(
    name: string,
    email: string,
    phone: string,
    password: string,
    city = "India"
  ): Promise<Session> {
    const { token: t, user } = await makeTRPC().auth.register.mutate({
      name,
      email,
      phone,
      password,
      city,
    });
    const s = toSession(user);
    persist(s, t, user.credits);
    setSessionCookie(t, user.role);
    return s;
  }

  async function updateProfile(name: string, phone: string): Promise<void> {
    if (!session || !token) return;
    await makeTRPC(token).users.updateProfile.mutate({ name, phone });
    const updated: Session = { ...session, name, phone: `+91 ${phone}`, initials: toInitials(name) };
    writeLS(SESSION_KEY, JSON.stringify(updated));
    setSession(updated);
  }

  function addCredits(n: number): void {
    const next = Math.max(0, credits + n);
    writeLS(CREDITS_KEY, String(next));
    setCredits(next);
  }

  function useCredit(): boolean {
    if (credits <= 0) return false;
    const next = credits - 1;
    writeLS(CREDITS_KEY, String(next));
    setCredits(next);
    return true;
  }

  async function refreshCredits(): Promise<void> {
    if (!token) return;
    try {
      const user = await makeTRPC(token).auth.me.query();
      if (user) {
        writeLS(CREDITS_KEY, String(user.credits));
        setCredits(user.credits);
      }
    } catch {}
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        credits,
        token,
        loading,
        signIn,
        signInStaff,
        signInWithGoogle,
        signOut,
        register,
        updateProfile,
        addCredits,
        useCredit,
        refreshCredits,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
