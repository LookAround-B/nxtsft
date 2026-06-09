'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Crown, UserCog, TrendingUp, HeadphonesIcon, ChevronRight, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { ROLE_META, useAuth, type Role } from '@/lib/auth';

type AdminRole = 'super-admin' | 'admin' | 'supervisor' | 'sales' | 'support-admin';

const ROLES: {
  role: AdminRole;
  icon: React.ReactNode;
  accent: string;
  cardAccent: string;
  textAccent: string;
  borderAccent: string;
  ringAccent: string;
  badgeBg: string;
  description: string;
}[] = [
  {
    role: 'super-admin',
    icon: <Crown size={22} />,
    accent: 'from-[oklch(0.76_0.14_76)] to-[oklch(0.68_0.16_76)]',
    cardAccent: 'bg-[oklch(0.76_0.14_76)]',
    textAccent: 'text-[oklch(0.55_0.14_76)]',
    borderAccent: 'border-[oklch(0.76_0.14_76)/40]',
    ringAccent: 'ring-[oklch(0.76_0.14_76)/30]',
    badgeBg: 'bg-[oklch(0.96_0.04_76)] text-[oklch(0.55_0.14_76)]',
    description: 'Full platform control, permissions & AI systems',
  },
  {
    role: 'admin',
    icon: <Shield size={22} />,
    accent: 'from-[oklch(0.65_0.18_27)] to-[oklch(0.58_0.20_27)]',
    cardAccent: 'bg-[oklch(0.65_0.18_27)]',
    textAccent: 'text-[oklch(0.50_0.18_27)]',
    borderAccent: 'border-[oklch(0.65_0.18_27)/40]',
    ringAccent: 'ring-[oklch(0.65_0.18_27)/30]',
    badgeBg: 'bg-[oklch(0.96_0.03_27)] text-[oklch(0.50_0.18_27)]',
    description: 'City operations, agents, listings & compliance',
  },
  {
    role: 'supervisor',
    icon: <UserCog size={22} />,
    accent: 'from-emerald-500 to-emerald-600',
    cardAccent: 'bg-emerald-500',
    textAccent: 'text-emerald-700',
    borderAccent: 'border-emerald-400/40',
    ringAccent: 'ring-emerald-400/30',
    badgeBg: 'bg-emerald-50 text-emerald-700',
    description: 'Team leads, site visits, call scheduling & KPIs',
  },
  {
    role: 'sales',
    icon: <TrendingUp size={22} />,
    accent: 'from-amber-500 to-amber-600',
    cardAccent: 'bg-amber-500',
    textAccent: 'text-amber-700',
    borderAccent: 'border-amber-400/40',
    ringAccent: 'ring-amber-400/30',
    badgeBg: 'bg-amber-50 text-amber-700',
    description: 'Leads, pipeline, closings & commissions',
  },
  {
    role: 'support-admin',
    icon: <HeadphonesIcon size={22} />,
    accent: 'from-blue-500 to-blue-600',
    cardAccent: 'bg-blue-500',
    textAccent: 'text-blue-700',
    borderAccent: 'border-blue-400/40',
    ringAccent: 'ring-blue-400/30',
    badgeBg: 'bg-blue-50 text-blue-700',
    description: 'Tickets, TAT tracking & knowledge base',
  },
];

export default function AdminLoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<AdminRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo1234');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectRole = (r: AdminRole) => {
    setSelected(r);
    setEmail(ROLE_META[r].demoEmail);
    setPassword('demo1234');
    setError('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { setError('Select a role to continue.'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      signIn(selected as Role);
      router.push(ROLE_META[selected].portal);
    }, 600);
  };

  const active = selected ? ROLES.find((r) => r.role === selected) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[oklch(0.97_0.01_260)]">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-white/80 px-5 py-3 backdrop-blur-sm sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-navy hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="NxtSft.com" className="h-16 w-auto object-contain" />
        </Link>
        <Link href="/login" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-accent transition-colors">
          <ArrowLeft size={13} />
          Customer login
        </Link>
      </div>

      {/* Main */}
      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-4xl">

          {/* Heading */}
          <div className="mb-8 text-center animate-slide-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground shadow-sm mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-accent badge-live" />
              Staff Access Portal
            </div>
            <h1 className="font-display text-3xl font-black text-navy sm:text-4xl">Admin Sign In</h1>
            <p className="mt-2 text-sm text-muted-foreground">Select your role, then sign in to your dashboard.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Role cards — 3 cols on lg */}
            <div className="lg:col-span-3">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">1. Select your role</p>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r, i) => {
                  const meta = ROLE_META[r.role];
                  const isActive = selected === r.role;
                  return (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => selectRole(r.role)}
                      className={`
                        group relative flex flex-col gap-3 rounded-2xl border-2 bg-white p-5 text-left shadow-sm
                        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
                        animate-slide-up
                        ${isActive
                          ? `border-transparent ring-2 ${r.ringAccent} shadow-md -translate-y-0.5`
                          : 'border-border hover:border-border/80'
                        }
                      `}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white text-[10px] font-black">✓</span>
                      )}

                      {/* Icon */}
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white ${r.accent}`}>
                        {r.icon}
                      </div>

                      <div className="min-w-0">
                        <div className="font-display text-[15px] font-bold leading-tight text-navy">{meta.label}</div>
                        <div className={`mt-0.5 text-[11px] font-semibold ${r.textAccent}`}>{meta.portalName}</div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{r.description}</p>
                      </div>

                      <div className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${r.badgeBg}`}>
                        {meta.demoEmail}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Login form — 2 cols on lg */}
            <div className="lg:col-span-2">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">2. Sign in</p>
              <form
                onSubmit={submit}
                className={`rounded-2xl border-2 bg-white p-6 shadow-sm transition-all duration-300 ${
                  active ? `${active.borderAccent}` : 'border-border'
                }`}
              >
                {/* Selected role pill */}
                {active ? (
                  <div className={`mb-5 flex items-center gap-2.5 rounded-xl bg-gradient-to-r p-3 text-white ${active.accent}`}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                      {active.icon}
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Signing in as</div>
                      <div className="font-display text-sm font-bold">{ROLE_META[active.role].label}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-border/40">
                      <Shield size={16} />
                    </div>
                    <span className="text-sm">No role selected yet</span>
                  </div>
                )}

                {/* Email */}
                <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selected ? ROLE_META[selected].demoEmail : 'Select a role first'}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  disabled={!selected}
                />

                {/* Password */}
                <label className="mt-4 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Password</label>
                <div className="relative mt-1.5">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 pr-10 text-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    disabled={!selected}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Error */}
                {error && <p className="mt-3 text-xs font-medium text-red-500">{error}</p>}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !selected}
                  className={`
                    mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display text-sm font-bold text-white
                    shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
                    disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50
                    ${active ? `bg-gradient-to-r ${active.accent} shadow-sm` : 'bg-navy'}
                  `}
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in to {selected ? ROLE_META[selected].portalName : 'Portal'}
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>

                {/* Demo hint */}
                <p className="mt-4 rounded-lg bg-secondary/60 px-3 py-2 text-center text-[11px] text-muted-foreground">
                  Demo mode — credentials are pre-filled when you select a role.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
