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
  | "home-seller"
  | "agent";

export interface Session {
  id: string;
  role: Role;
  name: string;
  email: string;
  initials: string;
  city: string;
  phone: string;
  /** True once the number passed a WhatsApp OTP. Drives the verify banner. */
  phoneVerified: boolean;
  joined: string;
  /** Hosted profile photo; null falls back to rendering `initials`. */
  avatar: string | null;
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
  // Agents onboard through the seller approval queue but land on the same
  // consumer portal (they manage listings + leads there, like a Home Seller).
  agent: {
    label: "Agent / Partner",
    portal: "/user-portal",
    portalName: "NxtSft.com Agent",
    demoEmail: "agent@nxtsft.com",
    demoName: "Agent Partner",
    city: "Mumbai",
    phone: "+91 9800011002",
  },
};

const SESSION_KEY = "nxtsft.session";
const CREDITS_KEY = "nxtsft.credits";

/* ---- Session cookie sync (server-set httpOnly cookie, GOL-268 H2/M1) ----
 * The actual session token now lives only in a server-set httpOnly cookie —
 * it's never persisted to localStorage or written by client JS, so an XSS
 * payload can no longer read or exfiltrate it. The token still passes through
 * a JS variable once, synchronously, right after login (unavoidable — the
 * server has to communicate it somehow); it's handed straight to this route
 * and discarded, never stored. */

async function syncSessionCookie(token: string): Promise<void> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token }),
  });
  // Without the cookie every subsequent request is unauthenticated and the
  // middleware bounces the user straight back to login — fail the login
  // loudly here instead of letting it look like it succeeded.
  if (!res.ok) {
    throw new Error("Could not establish your session. Please try again.");
  }
}

async function clearSessionCookieServer(): Promise<void> {
  try {
    await fetch("/api/auth/session", { method: "DELETE", credentials: "include" });
  } catch {}
}

interface Ctx {
  session: Session | null;
  credits: number;
  loading: boolean;
  // Flips true once the background server re-check (see AuthProvider's mount
  // effect) resolves — lets pages tell "session hydrated from localStorage,
  // not yet confirmed" apart from "confirmed still valid" before redirecting.
  sessionChecked: boolean;
  signIn: (email: string, password: string) => Promise<Session>;
  signInStaff: (email: string, password: string) => Promise<Session>;
  requestOtp: (phone: string) => Promise<void>;
  loginWithOtp: (phone: string, code: string) => Promise<Session>;
  // Signup phone verification: send an OTP to a NOT-yet-registered number.
  requestSignupOtp: (phone: string, email?: string) => Promise<void>;
  // Logged-in phone verification (banner): send/verify OTP for the current user's
  // own (or a new, unowned) WhatsApp number.
  requestMyPhoneOtp: (phone: string) => Promise<void>;
  verifyMyPhone: (phone: string, code: string) => Promise<Session>;
  signInWithGoogle: (credential: string) => Promise<{ session: Session; needsPhone: boolean }>;
  completePhone: (phone: string, applyAs?: "buyer" | "seller", otp?: string) => Promise<{ pendingApproval: boolean }>;
  signOut: () => Promise<void>;
  register: (name: string, email: string, phone: string, password: string, city?: string, waOptIn?: boolean, otp?: string) => Promise<Session>;
  registerSeller: (name: string, email: string, phone: string, password: string, city: string, applyAs?: "seller" | "agent", waOptIn?: boolean, otp?: string) => Promise<void>;
  updateProfile: (name: string, phone: string) => Promise<void>;
  updateAvatar: (url: string) => Promise<void>;
  addCredits: (n: number) => void;
  useCredit: () => boolean;
  refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<Ctx | null>(null);

// Vanilla tRPC client for imperative calls (AuthProvider can't use hooks).
// Auth now travels via the httpOnly session cookie (credentials: "include"),
// not a JS-held token — see the syncSessionCookie comment above.
function makeTRPC() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        fetch(url, options) {
          return fetch(url, { ...options, credentials: "include" });
        },
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
  phoneVerified?: boolean;
  city: string;
  credits: number;
  joined: Date | string;
  avatar?: string | null;
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
    phoneVerified: user.phoneVerified ?? false,
    joined: formatJoined(user.joined),
    avatar: user.avatar ?? null,
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
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const raw = readLS(SESSION_KEY, "null");
    const c = Math.max(0, parseInt(readLS(CREDITS_KEY, "0"), 10) || 0);
    let hadCachedSession = false;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setSession(parsed as Session);
        hadCachedSession = true;
      }
    } catch {}
    setCredits(c);
    setLoading(false);

    // Background re-validation against the server via the httpOnly session
    // cookie — that cookie (not this cached localStorage copy) is what
    // actually grants access, so this also catches: the cookie expired or
    // was cleared, or the user's role changed (e.g. an admin promoting them
    // to home-seller) since the cached copy was written.
    if (hadCachedSession) {
      makeTRPC()
        .auth.me.query()
        .then((freshUser) => {
          if (!freshUser) {
            // No valid session server-side — clear the stale local cache.
            removeLS(SESSION_KEY);
            removeLS(CREDITS_KEY);
            setSession(null);
            setCredits(0);
            return;
          }
          persist(toSession(freshUser), freshUser.credits);
        })
        .catch(() => {
          // Network hiccup — keep the cached session; we'll re-check next load.
        })
        .finally(() => setSessionChecked(true));
    } else {
      setSessionChecked(true);
    }
  }, []);

  // Caches only display info (name/role/city/etc.) for a flash-free first
  // paint — never the token. Access is gated purely by the httpOnly cookie.
  function persist(s: Session, c: number) {
    writeLS(SESSION_KEY, JSON.stringify(s));
    writeLS(CREDITS_KEY, String(c));
    setSession(s);
    setCredits(c);
  }

  async function signIn(email: string, password: string): Promise<Session> {
    const { token, user } = await makeTRPC().auth.login.mutate({ email, password });
    await syncSessionCookie(token);
    const s = toSession(user);
    persist(s, user.credits);
    return s;
  }

  async function signInStaff(email: string, password: string): Promise<Session> {
    const { token, user } = await makeTRPC().auth.loginStaff.mutate({ email, password });
    await syncSessionCookie(token);
    const s = toSession(user);
    persist(s, user.credits);
    return s;
  }

  // Send a WhatsApp OTP to a registered mobile number.
  async function requestOtp(phone: string): Promise<void> {
    await makeTRPC().auth.requestOtp.mutate({ phone });
  }

  // Send a WhatsApp OTP to verify a NEW number at signup (rejects taken numbers).
  async function requestSignupOtp(phone: string, email?: string): Promise<void> {
    await makeTRPC().auth.requestSignupOtp.mutate({ phone, email });
  }

  // Logged-in user: send an OTP to verify their own / a new WhatsApp number.
  async function requestMyPhoneOtp(phone: string): Promise<void> {
    await makeTRPC().auth.requestMyPhoneOtp.mutate({ phone });
  }

  // Logged-in user: verify the OTP → number marked verified; refresh the session.
  async function verifyMyPhone(phone: string, code: string): Promise<Session> {
    const { user } = await makeTRPC().auth.verifyMyPhone.mutate({ phone, code });
    const s = toSession(user);
    persist(s, user.credits);
    return s;
  }

  // Verify the OTP and sign in — same session handling as password login.
  async function loginWithOtp(phone: string, code: string): Promise<Session> {
    const { token, user } = await makeTRPC().auth.loginWithOtp.mutate({ phone, code });
    await syncSessionCookie(token);
    const s = toSession(user);
    persist(s, user.credits);
    return s;
  }

  async function signInWithGoogle(credential: string): Promise<{ session: Session; needsPhone: boolean }> {
    const { token, user, needsPhone } = await makeTRPC().auth.googleSignIn.mutate({ credential });
    await syncSessionCookie(token);
    const s = toSession(user);
    persist(s, user.credits);
    return { session: s, needsPhone: needsPhone ?? false };
  }

  // Save a mobile number + chosen role captured right after Google sign-up.
  // Sellers come back as pending approval (no session) — the caller handles that.
  async function completePhone(
    phone: string,
    applyAs: "buyer" | "seller" = "buyer",
    otp?: string,
  ): Promise<{ pendingApproval: boolean }> {
    const res = await makeTRPC().auth.completePhone.mutate({ phone, applyAs, otp });
    if (!res.pendingApproval) {
      const s = toSession(res.user);
      persist(s, res.user.credits);
    }
    return { pendingApproval: res.pendingApproval };
  }

  async function signOut(): Promise<void> {
    if (session) {
      try {
        await makeTRPC().auth.logout.mutate();
      } catch {}
    }
    await clearSessionCookieServer();
    removeLS(SESSION_KEY);
    setSession(null);
    // credits are intentionally preserved across sign-out
    setCredits(Math.max(0, parseInt(readLS(CREDITS_KEY, "0"), 10) || 0));
  }

  async function register(
    name: string,
    email: string,
    phone: string,
    password: string,
    city = "India",
    waOptIn?: boolean,
    otp?: string,
  ): Promise<Session> {
    const { token, user } = await makeTRPC().auth.register.mutate({
      name,
      email,
      phone,
      password,
      city,
      waOptIn,
      otp,
    });
    await syncSessionCookie(token);
    const s = toSession(user);
    persist(s, user.credits);
    return s;
  }

  async function registerSeller(
    name: string,
    email: string,
    phone: string,
    password: string,
    city: string,
    applyAs: "seller" | "agent" = "seller",
    waOptIn?: boolean,
    otp?: string,
  ): Promise<void> {
    await makeTRPC().auth.registerSeller.mutate({ name, email, phone, password, city, applyAs, waOptIn, otp });
    // No session — applicant must wait for admin approval
  }

  async function updateProfile(name: string, phone: string): Promise<void> {
    if (!session) return;
    await makeTRPC().users.updateProfile.mutate({ name, phone });
    const updated: Session = { ...session, name, phone: `+91 ${phone}`, initials: toInitials(name) };
    writeLS(SESSION_KEY, JSON.stringify(updated));
    setSession(updated);
  }

  async function updateAvatar(url: string): Promise<void> {
    if (!session) return;
    await makeTRPC().users.updateProfile.mutate({ avatar: url });
    const updated: Session = { ...session, avatar: url };
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
    if (!session) return;
    try {
      const user = await makeTRPC().auth.me.query();
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
        loading,
        sessionChecked,
        signIn,
        signInStaff,
        requestOtp,
        loginWithOtp,
        requestSignupOtp,
        requestMyPhoneOtp,
        verifyMyPhone,
        signInWithGoogle,
        completePhone,
        signOut,
        register,
        registerSeller,
        updateProfile,
        updateAvatar,
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
