"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

// Only end-users carry a public-facing WhatsApp number worth verifying.
const END_USER_ROLES = new Set(["user", "home-seller", "agent"]);

/**
 * Persistent (non-dismissable) top strip nudging a logged-in user whose number
 * isn't yet WhatsApp-OTP-verified to verify it. Opens a modal where they can
 * confirm/correct the number (must be their WhatsApp number) → OTP → verified
 * badge. Stays until `phoneVerified` flips true. Users with NO number are handled
 * by the PhoneGate modal instead, so this only targets has-number-but-unverified.
 */
export function VerifyPhoneBanner() {
  const { session, sessionChecked, requestMyPhoneOtp, verifyMyPhone } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
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
    !!session.phone &&
    !session.phoneVerified &&
    END_USER_ROLES.has(session.role) &&
    !onAuthRoute;

  if (!shouldShow) return null;

  const openModal = () => {
    setPhone(session!.phone.replace(/\D/g, "").slice(-10));
    setStep("phone");
    setCode("");
    setErr("");
    setOpen(true);
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(p)) {
      setErr("Enter a valid 10-digit WhatsApp number.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await requestMyPhoneOtp(p);
      setCode("");
      setResendIn(30);
      setStep("code");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't send the OTP. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setErr("Enter the 6-digit code.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await verifyMyPhone(phone.replace(/\D/g, ""), code);
      toast.success("WhatsApp number verified ✓");
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't verify the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0) return;
    setErr("");
    try {
      await requestMyPhoneOtp(phone.replace(/\D/g, ""));
      setResendIn(30);
      toast.success("OTP resent to your WhatsApp.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't resend the code.");
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-amber-300/50 bg-amber-50 px-4 py-2 sm:px-6">
        <ShieldCheck size={18} className="shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-amber-900">
            Verify your WhatsApp number
          </p>
          <p className="truncate text-xs text-amber-700">
            Confirm your WhatsApp number to get the verified badge and receive OTPs & alerts.
          </p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600"
        >
          Verify now
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            {step === "phone" ? (
              <>
                <h2 className="font-display text-xl font-bold text-navy">Verify your WhatsApp number</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We&apos;ll send a one-time code on WhatsApp. Make sure this is your WhatsApp number.
                </p>

                <form onSubmit={sendCode} className="mt-4">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    WhatsApp Number
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
                  <p className="mt-2 text-xs font-medium text-amber-600">
                    ⚠ Enter your WhatsApp number only — the code is delivered on WhatsApp.
                  </p>
                  {err && <p className="mt-2 text-xs font-medium text-red-500">{err}</p>}
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {busy ? "Sending code…" : "Send OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="mt-2 w-full rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:text-navy"
                  >
                    Not now
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold text-navy">Enter the code</h2>
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
                    disabled={busy}
                    className="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {busy ? "Verifying…" : "Verify number"}
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
