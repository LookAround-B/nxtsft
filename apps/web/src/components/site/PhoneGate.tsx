"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

// End-user roles that should be reachable by phone. Staff (admin/sales/etc.)
// are internal and excluded. Home-sellers/agents give a phone at registration,
// so in practice this mostly catches Google buyers who never completed it and
// any legacy account without a number.
const END_USER_ROLES = new Set(["user", "home-seller", "agent"]);

/**
 * App-wide phone gate. Any logged-in end-user without a mobile number is asked
 * to add one — regardless of how/when they signed in. The number is verified
 * with a WhatsApp OTP (falls back to saving it unverified if delivery is down).
 * `completePhone` sets the phone and grants the one-time promotion credit; on
 * success the session updates and this closes on its own. The /login + /register
 * routes run their own phone flows, so the gate stays out of their way.
 */
export function PhoneGate() {
  const { session, sessionChecked, completePhone, requestSignupOtp } = useAuth();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const onAuthRoute = pathname === "/login" || pathname === "/register";
  const shouldShow =
    sessionChecked &&
    !!session &&
    !session.phone &&
    END_USER_ROLES.has(session.role) &&
    !onAuthRoute &&
    !dismissed;

  if (!shouldShow) return null;

  // Save the phone (grants the promotion credit). `otp` present → also verified.
  const save = async (otp?: string) => {
    await completePhone(phone.replace(/\D/g, ""), "buyer", otp);
    setDismissed(true);
  };

  // Step 1: validate + send a WhatsApp OTP.
  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(p)) {
      setErr("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      await requestSignupOtp(p);
      setCode("");
      setResendIn(30);
      setStep("code");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/already registered/i.test(msg)) {
        setErr(msg);
        return;
      }
      // Delivery down → save the number unverified rather than block the user.
      try {
        await save(undefined);
        toast.info("Saved — we'll verify your number later.");
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : "Could not save your number. Try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Step 2: verify the code by saving the phone with it.
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setErr("Enter the 6-digit code.");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      await save(code);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't verify the code. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0) return;
    setErr("");
    try {
      await requestSignupOtp(phone.replace(/\D/g, ""));
      setResendIn(30);
      toast.success("OTP resent to your WhatsApp.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't resend the code.");
    }
  };

  const skip = async () => {
    setSaving(true);
    try {
      await save(undefined);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save your number.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        {step === "phone" ? (
          <>
            <h2 className="font-display text-xl font-bold text-navy">Add your mobile number</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep your account reachable for enquiries — and unlock a free credit while you&apos;re at it.
            </p>

            <form onSubmit={sendCode} className="mt-4">
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
              <p className="mt-2 text-xs text-muted-foreground">🎉 Get 1 free credit to unlock an owner contact.</p>
              <p className="mt-1 text-xs font-medium text-amber-600">
                ⚠ Enter your WhatsApp number only — the code is sent on WhatsApp.
              </p>
              {err && <p className="mt-2 text-xs font-medium text-red-500">{err}</p>}
              <button
                type="submit"
                disabled={saving}
                className="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Please wait…" : "Send OTP"}
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="mt-2 w-full rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:text-navy"
              >
                Maybe later
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl font-bold text-navy">Verify your number</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the 6-digit code sent to{" "}
              <strong className="text-navy">+91 {phone.replace(/\D/g, "")}</strong> on WhatsApp.
            </p>

            <form onSubmit={verify} className="mt-4">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-center text-lg font-bold tracking-[0.4em] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
              {err && <p className="mt-2 text-xs font-medium text-red-500">{err}</p>}
              <button
                type="submit"
                disabled={saving}
                className="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Verifying…" : "Verify & save"}
              </button>
            </form>

            <div className="mt-3 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => { setStep("phone"); setErr(""); }}
                className="font-semibold text-muted-foreground hover:text-foreground"
              >
                ← Change number
              </button>
              <button
                type="button"
                disabled={resendIn > 0}
                onClick={resend}
                className="font-semibold text-accent hover:underline disabled:text-muted-foreground disabled:no-underline"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
              </button>
            </div>

            <button
              type="button"
              onClick={skip}
              disabled={saving}
              className="mt-4 w-full text-center text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-60"
            >
              Didn&apos;t get the code? Save without verifying
            </button>
          </>
        )}
      </div>
    </div>
  );
}
