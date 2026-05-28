import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ROLE_META, useAuth, type Role } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — NestIQ" },
      { name: "description", content: "Sign in to your NestIQ portal — Super Admin, Admin, Supervisor, Sales or Home Buyer." },
    ],
  }),
  component: LoginPage,
});

const ROLES: Role[] = ["super-admin", "admin", "supervisor", "sales", "user"];

const roleColor: Record<Role, string> = {
  "super-admin": "from-blue-600 to-indigo-700",
  admin: "from-sky-500 to-blue-700",
  supervisor: "from-cyan-500 to-blue-600",
  sales: "from-blue-500 to-violet-600",
  user: "from-sky-400 to-blue-500",
};

function LoginPage() {
  const { session, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>(session?.role ?? "user");
  const [email, setEmail] = useState(ROLE_META[session?.role ?? "user"].demoEmail);
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);

  const onRole = (r: Role) => {
    setRole(r);
    setEmail(ROLE_META[r].demoEmail);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      signIn(role);
      navigate({ to: ROLE_META[role].portal });
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-6 sm:py-16 lg:grid-cols-2">
        {/* Hero side */}
        <div className="hidden flex-col justify-between rounded-3xl bg-gradient-to-br from-navy via-navy-deep to-accent p-10 text-white lg:flex">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-white/70">NestIQ Workspace</div>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight">One platform.<br />Five portals.<br /><span className="text-white/70">Built for every role.</span></h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/70">Pick any role below to instantly demo NestIQ — from a Super Admin command deck to a first-time home buyer's dashboard. No real account required.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
            <div><div className="font-display text-2xl font-bold">18.4k</div><div className="text-[10px] uppercase tracking-wider text-white/60">Listings</div></div>
            <div><div className="font-display text-2xl font-bold">3.2k</div><div className="text-[10px] uppercase tracking-wider text-white/60">Agents</div></div>
            <div><div className="font-display text-2xl font-bold">₹142Cr</div><div className="text-[10px] uppercase tracking-wider text-white/60">Closed</div></div>
          </div>
        </div>

        {/* Form side */}
        <div className="mx-auto w-full max-w-lg">
          {session && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm">
              <span className="text-foreground/80">Signed in as <strong className="text-navy">{session.name}</strong> ({ROLE_META[session.role].label})</span>
              <button onClick={() => { signOut(); }} className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-secondary">Sign out</button>
            </div>
          )}

          <div className="text-xs font-semibold uppercase tracking-widest text-accent">Demo Sign In</div>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy sm:text-4xl">Choose your role</h2>
          <p className="mt-2 text-sm text-muted-foreground">No real account required — credentials are pre-filled. Pick a role to enter that portal.</p>

          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ROLES.map((r) => {
              const m = ROLE_META[r];
              const active = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => onRole(r)}
                  className={`group relative overflow-hidden rounded-xl border p-4 text-left transition ${active ? "border-accent shadow-lg shadow-accent/15 ring-2 ring-accent/30" : "border-border hover:border-accent/50"}`}
                >
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${roleColor[r]}`} />
                  <div className="flex items-center gap-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br ${roleColor[r]} font-display text-sm font-bold text-white`}>
                      {m.demoName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-display text-sm font-bold text-navy">{m.label}</div>
                      <div className="text-[11px] text-muted-foreground">{m.portalName}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="mt-6 rounded-xl border border-border bg-white p-6 shadow-sm">
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <div className="mt-3 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-muted-foreground"><input type="checkbox" defaultChecked /> Remember me</label>
              <a href="#" className="font-semibold text-accent hover:underline">Forgot password?</a>
            </div>
            <button disabled={loading} type="submit" className="mt-5 w-full rounded-md bg-accent py-3 font-display text-sm font-bold text-accent-foreground shadow-lg shadow-accent/20 transition hover:opacity-95 disabled:opacity-60">
              {loading ? "Signing in…" : `Sign in as ${ROLE_META[role].label} →`}
            </button>
            <div className="mt-4 text-center text-[11px] text-muted-foreground">
              Will land at <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-navy">{ROLE_META[role].portal}</code>
            </div>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            New here? <Link to="/contact" className="font-semibold text-accent hover:underline">Request a workspace</Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}