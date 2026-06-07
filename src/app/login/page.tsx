'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ROLE_META, useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { session, signIn, signOut } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState(ROLE_META['user'].demoEmail);
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      try {
        const users: Array<{ email: string; role?: string }> = JSON.parse(
          window.localStorage.getItem('nxtsft.users') ?? '[]'
        );
        const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (found) {
          signIn((found.role as typeof ROLE_META extends Record<infer R, unknown> ? R : never) ?? 'user');
        } else {
          signIn('user');
        }
      } catch {
        signIn('user');
      }
      router.push(ROLE_META['user'].portal);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-6 sm:py-16 lg:grid-cols-2">
        {/* Left panel */}
        <div className="hidden animate-fade-up flex-col justify-between rounded-3xl bg-gradient-to-br from-navy via-navy-deep to-accent p-10 text-white lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/70">NxtSft.com Home</div>
            <h1 className="mt-6 font-display text-4xl font-black leading-tight">
              Your dream home<br />starts here.<br /><span className="text-white/55">Verified. Trusted. Yours.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/65">
              Sign in to track saved properties, unlock owner contacts, manage site visits, and get personalised recommendations.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {[['10K+', 'Properties'], ['50+', 'Cities'], ['100K+', 'Happy Buyers']].map(([v, l]) => (
              <div key={l}><div className="font-display text-2xl font-black">{v}</div><div className="text-[10px] uppercase tracking-wider text-white/50">{l}</div></div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="mx-auto w-full max-w-lg animate-fade-up delay-75">
          {session && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm">
              <span className="text-foreground/80">Signed in as <strong className="text-navy">{session.name}</strong></span>
              <button onClick={() => signOut()} className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-secondary">Sign out</button>
            </div>
          )}
          <div className="text-xs font-bold uppercase tracking-widest text-accent">Welcome back</div>
          <h2 className="mt-2 font-display text-3xl font-black text-navy sm:text-4xl">Sign in to NxtSft.com</h2>
          <p className="mt-2 text-sm text-muted-foreground">Demo mode — credentials are pre-filled.</p>

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
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
          <p className="mt-5 text-center text-xs text-muted-foreground">New here? <Link href="/register" className="font-semibold text-accent hover:underline">Create a free account →</Link></p>
          <div className="mt-4 border-t border-border pt-4 text-center">
            <p className="text-xs text-muted-foreground">Are you staff or admin? <Link href="/admin-login" className="font-semibold text-navy hover:underline">Admin sign in →</Link></p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
