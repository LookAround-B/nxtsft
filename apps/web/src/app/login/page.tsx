"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { ROLE_META, useAuth } from "@/lib/auth";
import { toast } from "sonner";

const GOOGLE_ENABLED = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const { session, sessionChecked, signIn, signInWithGoogle, completePhone, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Google sign-up returns no phone; hold the auto-redirect while we collect one.
  const [needPhone, setNeedPhone] = useState(false);

  // Middleware sometimes lands a still-signed-in user here because the
  // nxtsft_session cookie silently expired/was cleared while their
  // localStorage token was still valid (Safari's 7-day cap on JS-set cookies,
  // aggressive in-app browser cookie clearing, etc). AuthProvider re-verifies
  // the token in the background on mount and repairs the cookie — once that
  // check confirms the session is still good, send them straight back instead
  // of making them notice the banner below and click "Sign in" again.
  useEffect(() => {
    if (sessionChecked && session && !needPhone) {
      router.replace(searchParams.get("redirect") || ROLE_META[session.role].portal);
    }
  }, [sessionChecked, session, searchParams, router, needPhone]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [applyAs, setApplyAs] = useState<"buyer" | "seller">("buyer");
  const [sellerPending, setSellerPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const s = await signIn(email.trim(), password);
      toast.success(`Welcome back, ${s.name.split(" ")[0]}!`);
      router.push(ROLE_META[s.role].portal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential?: string) => {
    if (!credential) {
      setError("Google sign-in failed. Please try again.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { session: s, needsPhone } = await signInWithGoogle(credential);
      toast.success(`Welcome, ${s.name.split(" ")[0]}!`);
      if (needsPhone) {
        // Collect a mobile number before entering the app.
        setNeedPhone(true);
        return;
      }
      router.push(ROLE_META[s.role].portal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const submitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(p)) {
      setPhoneErr("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setPhoneErr("");
    setPhoneSaving(true);
    try {
      const { pendingApproval } = await completePhone(p, applyAs);
      setNeedPhone(false);
      if (pendingApproval) {
        // Seller — server invalidated the session; clear it locally and show
        // the pending-approval screen instead of entering the app.
        await signOut();
        setSellerPending(true);
        return;
      }
      router.push(searchParams.get("redirect") || "/user-portal");
    } catch (err) {
      setPhoneErr(err instanceof Error ? err.message : "Could not save your number. Try again.");
    } finally {
      setPhoneSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* After Google sign-up: pick role + capture phone (Google can't ask up-front) */}
      {needPhone && !sellerPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="font-display text-xl font-bold text-navy">Complete your profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us what you&apos;re here for and add your mobile number.
            </p>

            {/* Role choice */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {([["buyer", "I'm buying"], ["seller", "I'm selling"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setApplyAs(val)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    applyAs === val
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-navy hover:border-accent/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={submitPhone} className="mt-4">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Mobile Number
              </label>
              <div className="mt-1.5 flex items-center rounded-xl border border-input bg-background px-3 focus-within:border-accent">
                <span className="text-sm text-muted-foreground">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit number"
                  className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {applyAs === "buyer"
                  ? "🎉 Get 1 free credit to unlock an owner contact."
                  : "Our team reviews new sellers before your listings go live."}
              </p>
              {phoneErr && <p className="mt-2 text-xs font-medium text-red-500">{phoneErr}</p>}
              <button
                type="submit"
                disabled={phoneSaving}
                className="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {phoneSaving
                  ? "Please wait…"
                  : applyAs === "buyer"
                    ? "Unlock 1 credit"
                    : "Submit for approval"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Seller chose "I'm selling" — pending admin approval */}
      {sellerPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
              ⏳
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-navy">Application submitted</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your Home Seller account is pending admin approval. We&apos;ll notify you once it&apos;s
              approved — usually within 1–2 business days.
            </p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-xl bg-navy px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
            >
              Back to home
            </Link>
          </div>
        </div>
      )}
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-6 sm:py-16 lg:grid-cols-2">
        {/* Left decorative panel */}
        <div className="hidden animate-fade-up flex-col justify-between rounded-3xl bg-gradient-to-br from-navy via-navy-deep to-accent p-10 text-white lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/70">
              NxtSft.com Home
            </div>
            <h1 className="mt-6 font-display text-4xl font-black leading-tight">
              Your dream home
              <br />
              starts here.
              <br />
              <span className="text-white/55">Verified. Trusted. Yours.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/65">
              Sign in to track saved properties, unlock owner contacts, manage site visits, and get
              personalised recommendations.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {[
              ["10K+", "Properties"],
              ["50+", "Cities"],
              ["100K+", "Happy Buyers"],
            ].map(([v, l]) => (
              <div key={l}>
                <div className="font-display text-2xl font-black">{v}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/50">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="mx-auto w-full max-w-lg animate-fade-up delay-75">
          {session && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm">
              <span className="text-foreground/80">
                Signed in as <strong className="text-navy">{session.name}</strong>
              </span>
              <button
                onClick={() => signOut()}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-secondary"
              >
                Sign out
              </button>
            </div>
          )}

          <div className="text-xs font-bold uppercase tracking-widest text-accent">Welcome back</div>
          <h2 className="mt-2 font-display text-3xl font-black text-navy sm:text-4xl">
            Sign in to NxtSft.com
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Find your next home — zero commission, RERA-verified.
          </p>

          <form
            onSubmit={submit}
            noValidate
            className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm"
          >
            {/* Email */}
            <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />

            {/* Password */}
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-3 pr-11 text-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                className="text-xs font-semibold text-accent hover:underline"
                onClick={() => toast.info("Password reset coming soon.")}
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-accent py-3.5 font-display text-sm font-bold text-white shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </span>
              ) : (
                "Sign in →"
              )}
            </button>
          </form>

          {GOOGLE_ENABLED && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={(cred) => handleGoogle(cred.credential)}
                  onError={() => setError("Google sign-in failed. Please try again.")}
                  text="continue_with"
                  shape="rectangular"
                  width="360"
                />
              </div>
            </>
          )}

          <p className="mt-5 text-center text-xs text-muted-foreground">
            New here?{" "}
            <Link href="/register" className="font-semibold text-accent hover:underline">
              Create a free account →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
