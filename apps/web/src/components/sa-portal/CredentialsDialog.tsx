"use client";
import { toast } from "sonner";

export type Credentials = { name: string; email: string; password: string };

/** Readable 10-char password, same alphabet as the server's generator. */
export function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/**
 * Shows a login ID + password exactly once, after create / reset. Passwords
 * are stored hashed, so once this closes nobody can see it again — only reset.
 */
export function CredentialsDialog({ creds, onClose }: { creds: Credentials; onClose: () => void }) {
  const loginUrl = `${window.location.origin}/admin-login`;
  const message = `NxtSft login for ${creds.name}\nLogin: ${loginUrl}\nLogin ID: ${creds.email}\nPassword: ${creds.password}\nPlease change your password after first login.`;
  const copy = (text: string, what: string) =>
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${what} copied`),
      () => toast.error("Copy failed — select and copy manually"),
    );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl font-bold text-navy">Login details</h3>
        <p className="mt-1 text-xs text-amber-700">
          Shown only once — copy it now. After closing, the password can only be reset, not viewed.
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          {[
            ["Name", creds.name],
            ["Login ID", creds.email],
            ["Password", creds.password],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="flex items-center gap-2 font-mono font-semibold text-navy">
                {v}
                {k !== "Name" && (
                  <button onClick={() => copy(v!, k!)} className="text-[11px] font-sans font-semibold text-accent hover:underline">
                    Copy
                  </button>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => copy(message, "WhatsApp message")}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-navy hover:bg-secondary"
          >
            Copy as message
          </button>
          <button onClick={onClose} className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-navy-deep hover:opacity-90">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
