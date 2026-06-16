"use client";

import { CardGridSkeleton, Skeleton } from "@/components/ui/skeleton";

/* SiteHeader / SiteFooter are rendered by the persistent layout (SiteChrome),
   so page-level skeletons only fill the content slot — no chrome here. */

function SitePageShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[oklch(0.97_0.01_260)]">{children}</div>;
}

/* ── Home ─────────────────────────────────────────────────────────── */

export function HomePageLoadingPreset() {
  return (
    <SitePageShell>
      <main className="space-y-8 px-4 py-6 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 rounded-[28px] bg-white p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-14 w-full max-w-xl rounded-2xl" />
            <Skeleton className="h-14 w-4/5 rounded-2xl" />
            <Skeleton className="h-5 w-full max-w-2xl" />
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-12 w-36 rounded-xl" />
              <Skeleton className="h-12 w-32 rounded-xl" />
            </div>
          </div>
          <Skeleton className="min-h-[18rem] w-full rounded-[28px]" />
        </div>

        <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>

        <div className="mx-auto max-w-7xl">
          <Skeleton className="mb-4 h-8 w-56" />
          <CardGridSkeleton count={4} className="lg:grid-cols-4" />
        </div>

        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-3xl" />
          ))}
        </div>
      </main>
    </SitePageShell>
  );
}

/* ── Marketing (about, refer, fraud-advisory) ─────────────────────── */

export function MarketingPageLoadingPreset() {
  return (
    <SitePageShell>
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-14 sm:px-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-12 w-full max-w-2xl rounded-2xl" />
          <Skeleton className="h-5 w-full max-w-3xl" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-3xl" />
      </main>
    </SitePageShell>
  );
}

/* ── Contact ──────────────────────────────────────────────────────── */

export function ContactPageLoadingPreset() {
  return (
    <SitePageShell>
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-12 w-full max-w-2xl rounded-2xl" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <div className="mt-14 grid gap-10 lg:grid-cols-5">
          <div className="space-y-5 rounded-2xl border border-border bg-white p-8 lg:col-span-3">
            <div className="grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-4 lg:col-span-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </main>
    </SitePageShell>
  );
}

/* ── Auth (login, register, admin-login) ──────────────────────────── */

export function AuthPageLoadingPreset({ sidePanel = true }: { sidePanel?: boolean }) {
  return (
    <SitePageShell>
      <main
        className={`mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-6 sm:py-16 ${sidePanel ? "lg:grid-cols-2" : ""}`}
      >
        {sidePanel && <Skeleton className="hidden min-h-[38rem] w-full rounded-3xl lg:block" />}
        <div className="mx-auto w-full max-w-lg space-y-5">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-10 w-full max-w-sm rounded-2xl" />
          <Skeleton className="h-5 w-full max-w-md" />
          <div className="space-y-4 rounded-2xl border border-border bg-white p-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ))}
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </main>
    </SitePageShell>
  );
}

/* ── Detail (agent / owner profile) ───────────────────────────────── */

export function DetailPageLoadingPreset() {
  return (
    <SitePageShell>
      <main className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-3xl" />
            <Skeleton className="h-48 w-full rounded-3xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-10 w-full max-w-md rounded-2xl" />
            <Skeleton className="h-5 w-48" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        </div>
      </main>
    </SitePageShell>
  );
}

/* ── Document (terms, privacy, cookie-policy) ─────────────────────── */

export function DocumentPageLoadingPreset() {
  return (
    <SitePageShell>
      <main className="mx-auto max-w-5xl px-5 py-14 sm:px-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-2xl rounded-2xl" />
          <Skeleton className="h-5 w-full max-w-3xl" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <div className="mt-10 space-y-6 rounded-3xl border border-border bg-white p-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      </main>
    </SitePageShell>
  );
}

/* ── Properties listing ───────────────────────────────────────────── */

export function PropertiesPageLoadingPreset() {
  return (
    <SitePageShell>
      {/* Sticky filter bar */}
      <div className="border-b border-border bg-white/95 shadow-sm">
        <div className="mx-auto max-w-7xl px-5 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Skeleton className="h-11 flex-1 rounded-xl" />
            <Skeleton className="h-11 w-28 rounded-xl" />
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="mb-5 space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <CardGridSkeleton count={9} />
      </main>
    </SitePageShell>
  );
}

/* ── Agents directory ─────────────────────────────────────────────── */

export function AgentsPageLoadingPreset() {
  return (
    <SitePageShell>
      {/* Navy hero */}
      <div className="border-b border-border bg-navy-deep">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-20">
          <Skeleton className="mx-auto h-7 w-56 rounded-full bg-white/10" />
          <Skeleton className="mx-auto mt-5 h-12 w-full max-w-md rounded-2xl bg-white/10" />
          <Skeleton className="mx-auto mt-4 h-5 w-full max-w-lg bg-white/10" />
          <Skeleton className="mx-auto mt-8 h-14 w-full max-w-xl rounded-2xl bg-white/10" />
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <CardGridSkeleton count={6} />
      </main>
    </SitePageShell>
  );
}

/* ── Pricing ──────────────────────────────────────────────────────── */

export function PricingPageLoadingPreset() {
  return (
    <SitePageShell>
      {/* Navy hero */}
      <div className="bg-navy-deep py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Skeleton className="mx-auto h-7 w-64 rounded-full bg-white/10" />
          <Skeleton className="mx-auto mt-6 h-12 w-full max-w-lg rounded-2xl bg-white/10" />
          <Skeleton className="mx-auto mt-5 h-5 w-full max-w-xl bg-white/10" />
        </div>
      </div>
      {/* Tab bar */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl gap-2 px-5 py-4 sm:px-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-32 rounded-md" />
          ))}
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[26rem] w-full rounded-2xl" />
          ))}
        </div>
      </main>
    </SitePageShell>
  );
}

/* ── List a property (multi-step form) ────────────────────────────── */

export function ListPageLoadingPreset() {
  return (
    <SitePageShell>
      {/* Step progress bar */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-1 items-center gap-2 last:flex-none">
                <Skeleton className="h-8 w-8 rounded-full" />
                {i < 3 && <Skeleton className="h-0.5 flex-1" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="space-y-5 rounded-2xl border border-border bg-white p-6 sm:p-8">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="grid gap-4 pt-2 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="mt-2 h-11 w-32 rounded-xl" />
        </div>
      </main>
    </SitePageShell>
  );
}

/* ── Profile ──────────────────────────────────────────────────────── */

export function ProfilePageLoadingPreset() {
  return (
    <SitePageShell>
      {/* Cover */}
      <div className="h-40 bg-navy-deep sm:h-56" />
      <div className="mx-auto -mt-16 w-full max-w-5xl px-4 sm:-mt-20 sm:px-6">
        {/* Identity card */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xl sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <Skeleton className="-mt-14 h-20 w-20 rounded-2xl sm:-mt-16 sm:h-24 sm:w-24" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-20 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-28 rounded-xl" />
            </div>
          </div>
        </div>
        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        {/* Body */}
        <div className="mt-5 grid gap-5 lg:grid-cols-3 lg:items-start">
          <div className="space-y-5 lg:col-span-2">
            <Skeleton className="h-56 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    </SitePageShell>
  );
}

/* ── Property detail ──────────────────────────────────────────────── */

export function PropertyDetailPageLoadingPreset() {
  return (
    <SitePageShell>
      {/* Breadcrumb */}
      <div className="border-b border-border bg-white/80">
        <div className="mx-auto max-w-7xl px-5 py-3 sm:px-6">
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Gallery + details */}
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-72 w-full rounded-2xl sm:h-96" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-20 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-48" />
            <div className="grid gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          {/* Sticky sidebar */}
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        </div>
      </main>
    </SitePageShell>
  );
}
