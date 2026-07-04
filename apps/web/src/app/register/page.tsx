"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle2, Home, Building2 } from "lucide-react";
import { useAuth, ROLE_META } from "@/lib/auth";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Pune", "Chennai",
  "Ahmedabad", "Kolkata", "Jaipur", "Surat", "Lucknow", "Kanpur",
];

type RegistrationType = "buyer" | "seller";

export default function RegisterPage() {
  const router = useRouter();
  const { session, signOut, register, registerSeller } = useAuth();

  const [regType, setRegType] = useState<RegistrationType>("buyer");
  // RERA agents/partners share the seller registration form + admin approval
  // queue, but register as role "agent" (see `applyAs` below) so an approved
  // agent lands on the /agents directory. `?type=agent` preselects the seller
  // tab and reframes the copy; `?type=seller` preselects it without agent framing.
  const [isAgent, setIsAgent] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("type");
    if (t === "seller" || t === "agent") setRegType("seller");
    if (t === "agent") setIsAgent(true);
  }, []);
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sellerPending, setSellerPending] = useState(false);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Enter your full name (min 2 characters)";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email address";
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g, "")))
      errs.phone = "Enter a valid 10-digit Indian mobile number (starts with 6-9)";
    if (!form.city) errs.city = "Select your city";
    if (form.password.length < 8) errs.password = "Password must be at least 8 characters";
    if (!/[A-Z]/.test(form.password)) errs.password = "Password must contain an uppercase letter";
    if (!/[a-z]/.test(form.password)) errs.password = "Password must contain a lowercase letter";
    if (!/\d/.test(form.password)) errs.password = "Password must contain a number";
    if (form.password !== form.confirm) errs.confirm = "Passwords do not match";
    if (!agreed) errs.agreed = "You must accept the terms to continue";
    return errs;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      if (regType === "buyer") {
        const s = await register(form.name.trim(), form.email.trim(), form.phone.replace(/\s/g, ""), form.password, form.city);
        toast.success(`Welcome to NxtSft, ${s.name.split(" ")[0]}! You have 1 free credit.`);
        router.push(ROLE_META[s.role].portal);
      } else {
        await registerSeller(form.name.trim(), form.email.trim(), form.phone.replace(/\s/g, ""), form.password, form.city, isAgent ? "agent" : "seller");
        setSellerPending(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      if (msg.toLowerCase().includes("email")) setErrors({ email: msg });
      else if (msg.toLowerCase().includes("phone")) setErrors({ phone: msg });
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (sellerPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <CheckCircle2 className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-black text-navy">Application Submitted!</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Your {isAgent ? "Agent / Partner" : "Home Seller"} account is under review. Our team will
            verify your details and notify you once your account is approved. This usually takes 1–2
            business days.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Questions? Contact us at{" "}
            <a href="mailto:support@nxtsft.com" className="font-semibold text-accent hover:underline">
              support@nxtsft.com
            </a>
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-navy px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-6 sm:py-16 lg:grid-cols-2">
        {/* Left decorative panel */}
        <div className="hidden animate-fade-up flex-col justify-between rounded-3xl bg-gradient-to-br from-navy via-navy-deep to-accent p-10 text-white lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/70">
              Join NxtSft.com
            </div>
            <h1 className="mt-6 font-display text-4xl font-black leading-tight">
              {regType === "buyer" ? (
                <>Your perfect home<br />is one step away.<br /><span className="text-white/55">Sign up. Explore. Own.</span></>
              ) : (
                <>List your property.<br />Reach lakh+ buyers.<br /><span className="text-white/55">Zero commission. Full control.</span></>
              )}
            </h1>
            <ul className="mt-8 space-y-3">
              {(regType === "buyer"
                ? ["Zero commission — save lakhs", "RERA-verified listings only", "Dedicated relationship manager", "1 free credit on signup, no card required"]
                : ["Verified buyer audience", "RERA-compliant listings", "Dedicated account manager", "Pay only when you sell"]
              ).map((pt) => (
                <li key={pt} className="flex items-center gap-2.5 text-sm text-white/80">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Form */}
        <div className="mx-auto w-full max-w-lg animate-fade-up delay-75">
          {session && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm">
              <span className="text-foreground/80">
                Already signed in as <strong className="text-navy">{session.name}</strong>
              </span>
              <button
                onClick={() => signOut()}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-secondary"
              >
                Sign out
              </button>
            </div>
          )}

          <div className="text-xs font-bold uppercase tracking-widest text-accent">Get started free</div>
          <h2 className="mt-2 font-display text-3xl font-black text-navy sm:text-4xl">Create your account</h2>

          {/* Role toggle */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(["buyer", "seller"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setRegType(t); setErrors({}); }}
                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition ${
                  regType === t
                    ? "border-accent bg-accent/5"
                    : "border-border bg-white hover:border-accent/40"
                }`}
              >
                {t === "buyer" ? <Home size={20} className={regType === t ? "text-accent" : "text-muted-foreground"} /> : <Building2 size={20} className={regType === t ? "text-accent" : "text-muted-foreground"} />}
                <div>
                  <div className={`text-sm font-bold ${regType === t ? "text-accent" : "text-navy"}`}>
                    {t === "buyer" ? "Home Buyer" : isAgent ? "Agent / Partner" : "Home Seller"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t === "buyer" ? "Browse & buy" : isAgent ? "List & sell as a verified agent" : "List & sell"}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {regType === "seller" && (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
              {isAgent
                ? "Agent / partner accounts require admin approval (RERA verification) before you can log in and list properties."
                : "Home Seller accounts require admin approval before you can log in and list properties."}
            </p>
          )}

          <form onSubmit={submit} noValidate className="mt-4 space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-foreground">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={set("name")}
                placeholder="Enter your full name"
                autoComplete="name"
                className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.name ? "border-rose-400" : "border-input"}`}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-foreground">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="your@email.com"
                autoComplete="email"
                className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.email ? "border-rose-400" : "border-input"}`}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-foreground">Phone Number</label>
              <div className="mt-1.5 flex">
                <span className="flex items-center rounded-l-xl border border-r-0 border-input bg-secondary px-3.5 text-sm font-medium text-foreground/60">+91</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="9876543210"
                  maxLength={10}
                  autoComplete="tel"
                  className={`min-w-0 flex-1 rounded-r-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.phone ? "border-rose-400" : "border-input"}`}
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>}
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-semibold text-foreground">Your City</label>
              <Select value={form.city || undefined} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
                <SelectTrigger className={`mt-1.5 rounded-xl px-3.5 py-3 ${errors.city ? "border-rose-400" : ""}`}>
                  <SelectValue placeholder="Select your city" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.city && <p className="mt-1 text-xs text-rose-500">{errors.city}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-foreground">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className={`w-full rounded-xl border bg-background px-3.5 py-3 pr-11 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.password ? "border-rose-400" : "border-input"}`}
                />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground">
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-foreground">Confirm Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirm}
                  onChange={set("confirm")}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className={`w-full rounded-xl border bg-background px-3.5 py-3 pr-11 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.confirm ? "border-rose-400" : "border-input"}`}
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground">
                  {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.confirm && <p className="mt-1 text-xs text-rose-500">{errors.confirm}</p>}
            </div>

            {/* Terms */}
            <div>
              <label className="flex cursor-pointer items-start gap-3">
                <div className="relative mt-0.5 shrink-0">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="sr-only" />
                  <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${agreed ? "border-accent bg-accent" : "border-border bg-white"}`}>
                    {agreed && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                  </div>
                </div>
                <span className="text-sm leading-relaxed text-foreground/80">
                  I accept the{" "}
                  <Link href="/terms" className="font-semibold text-accent hover:underline">Terms &amp; Conditions</Link>{" "}
                  and agree to receive communication from NxtSft.com.
                </span>
              </label>
              {errors.agreed && <p className="mt-1 text-xs text-rose-500">{errors.agreed}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-accent py-3.5 font-display text-sm font-bold text-white shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {regType === "buyer" ? "Creating account…" : "Submitting application…"}
                </span>
              ) : (
                regType === "buyer" ? "Create Account →" : "Submit Application →"
              )}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-accent hover:underline">Sign In</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
