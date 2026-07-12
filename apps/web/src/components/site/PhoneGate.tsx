"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

// End-user roles that should be reachable by phone. Staff (admin/sales/etc.)
// are internal and excluded. Home-sellers/agents give a phone at registration,
// so in practice this mostly catches Google buyers who never completed it and
// any legacy account without a number.
const END_USER_ROLES = new Set(["user", "home-seller", "agent"]);

/**
 * App-wide phone gate. Any logged-in end-user without a mobile number is asked
 * to add one — regardless of how/when they signed in. Dismissable, but returns
 * on the next visit until a number is saved. `completePhone` sets the phone and
 * grants the one-time promotion credit; on success the session updates and this
 * closes on its own. The /login + /register routes run their own phone flows, so
 * the gate stays out of their way to avoid a double modal.
 */
export function PhoneGate() {
  const { session, sessionChecked, completePhone } = useAuth();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const onAuthRoute = pathname === "/login" || pathname === "/register";
  const shouldShow =
    sessionChecked &&
    !!session &&
    !session.phone &&
    END_USER_ROLES.has(session.role) &&
    !onAuthRoute &&
    !dismissed;

  if (!shouldShow) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = phone.replace(/\D/g, "");
    if (p.length !== 10) {
      setErr("Enter a valid 10-digit mobile number.");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      await completePhone(p, "buyer");
      // session.phone is now set → the gate condition closes it; dismiss too.
      setDismissed(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save your number. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="font-display text-xl font-bold text-navy">Add your mobile number</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your account reachable for enquiries — and unlock a free credit while you&apos;re at it.
        </p>

        <form onSubmit={submit} className="mt-4">
          <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Mobile Number
          </label>
          <div className="mt-1.5 flex items-center rounded-xl border border-input bg-background px-3 focus-within:border-accent">
            <span className="text-sm text-muted-foreground">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit number"
              className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">🎉 Get 1 free credit to unlock an owner contact.</p>
          {err && <p className="mt-2 text-xs font-medium text-red-500">{err}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Please wait…" : "Unlock 1 credit"}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="mt-2 w-full rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:text-navy"
          >
            Maybe later
          </button>
        </form>
      </div>
    </div>
  );
}
