'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ROLE_META, useAuth, type Role } from '@/lib/auth';

const ROLES: Role[] = ['super-admin', 'admin', 'supervisor', 'sales', 'user', 'customer'];

const roleColor: Record<Role, string> = {
  'super-admin': 'from-blue-600 to-indigo-700',
  admin: 'from-sky-500 to-blue-700',
  supervisor: 'from-cyan-500 to-blue-600',
  sales: 'from-blue-500 to-violet-600',
  user: 'from-sky-400 to-blue-500',
  customer: 'from-emerald-500 to-teal-600',
};

export default function LoginPage() {
  const { session, signIn, signOut } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<Role>(session?.role ?? 'user');
  const [email, setEmail] = useState(ROLE_META[session?.role ?? 'user'].demoEmail);
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);

  const onRole = (r: Role) => { setRole(r); setEmail(ROLE_META[r].demoEmail); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      signIn(role);
      router.push(ROLE_META[role].portal);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-6 sm:py-16 lg:grid-cols-2">
        <div className="hidden animate-fade-up flex-col justify-between rounded-3xl bg-gradient-to-br from-navy via-navy-deep to-accent p-10 text-white lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/70">NestIt Workspace</div>
            <h1 className="mt-6 font-display text-4xl font-black leading-tight">
              One platform.<br />Five portals.<br /><span className="text-white/55">Built for every role.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/65">
              Pick any role below to instantly demo NestIt — from a Super Admin command deck to a first-time home buyer's dashboard. No real account required.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {[['18.4k', 'Listings'], ['3.2k', 'Agents'], ['₹142Cr', 'Closed']].map(([v, l]) => (
              <div key={l}><div className="font-display text-2xl font-black">{v}</div><div className="text-[10px] uppercase tracking-wider text-white/50">{l}</div></div>
            ))}
          </div>
        </div>
        <div className="mx-auto w-full max-w-lg animate-fade-up delay-75">
          {session && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm">
              <span className="text-foreground/80">Signed in as <strong className="text-navy">{session.name}</strong> <span className="text-muted-foreground">({ROLE_META[session.role].label})</span></span>
              <button onClick={() => signOut()} className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-secondary">Sign out</button>
            </div>
          )}
          <div className="text-xs font-bold uppercase tracking-widest text-accent">Demo Sign In</div>
          <h2 className="mt-2 font-display text-3xl font-black text-navy sm:text-4xl">Choose your role</h2>
          <p className="mt-2 text-sm text-muted-foreground">No real account required — credentials are pre-filled.</p>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {ROLES.map((r) => {
              const m = ROLE_META[r];
              const active = role === r;
              return (
                <button key={r} type="button" onClick={() => onRole(r)} className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${active ? 'border-accent shadow-lg shadow-accent/15 ring-2 ring-accent/30' : 'border-border hover:border-accent/40 hover:shadow-md'}`}>
                  <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${roleColor[r]}`} />
                  <div className="flex items-center gap-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br font-display text-sm font-bold text-white ${roleColor[r]}`}>{m.demoName.split(' ').map((p) => p[0]).join('').slice(0, 2)}</div>
                    <div><div className="font-display text-sm font-bold text-navy">{m.label}</div><div className="text-[11px] text-muted-foreground">{m.portalName}</div></div>
                  </div>
                </button>
              );
            })}
          </div>
          <form onSubmit={submit} className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <div className="mt-3 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer"><input type="checkbox" defaultChecked className="rounded" /> Remember me</label>
              <button type="button" className="font-semibold text-accent hover:underline" onClick={() => alert('Password reset not available in demo mode.')}>Forgot password?</button>
            </div>
            <button disabled={loading} type="submit" className="mt-5 w-full rounded-xl bg-accent py-3 font-display text-sm font-bold text-white shadow-lg shadow-accent/20 transition hover:opacity-95 hover:-translate-y-0.5 disabled:opacity-60">
              {loading ? 'Signing in…' : `Sign in as ${ROLE_META[role].label} →`}
            </button>
            <div className="mt-4 text-center text-[11px] text-muted-foreground">Will land at <code className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-navy">{ROLE_META[role].portal}</code></div>
          </form>
          <p className="mt-5 text-center text-xs text-muted-foreground">New here? <Link href="/contact" className="font-semibold text-accent hover:underline">Request a workspace</Link></p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
