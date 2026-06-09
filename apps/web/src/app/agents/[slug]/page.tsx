"use client";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import {
  Star,
  Phone,
  MessageCircle,
  Lock,
  ShieldCheck,
  MapPin,
  Globe,
  Award,
  ArrowLeft,
  Clock,
  TrendingUp,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { properties, ownerSlug } from "@/data/static";
import { AGENTS } from "@/data/agents";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={
            i <= Math.round(n) ? "fill-amber-400 text-amber-400" : "fill-border text-border"
          }
        />
      ))}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4 text-center">
      <div className="font-display text-2xl font-black text-navy">{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export default function AgentProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { session } = useAuth();

  const agent = AGENTS.find((a) => ownerSlug(a.name) === slug);
  if (!agent) {
    notFound();
    return null;
  }

  const agentListings = properties.filter((p) => ownerSlug(p.owner.name) === slug);
  const yrs = new Date().getFullYear() - agent.since;
  const totalValue = agentListings.reduce((s, p) => s + (p.purpose === "Sale" ? p.price : 0), 0);

  const handleContact = (channel: "phone" | "whatsapp") => {
    if (!session) {
      toast.error("Sign in required", { description: `Sign in to contact ${agent.name}.` });
      return;
    }
    if (channel === "phone") {
      toast.success("Connecting…", { description: `Calling ${agent.name}.` });
    } else {
      toast.success("Opening WhatsApp…", { description: `Connecting you with ${agent.name}.` });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* ── Header ───────────────────────────────────────── */}
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-accent">
              Home
            </Link>
            <span>/</span>
            <Link href="/agents" className="hover:text-accent">
              Agents
            </Link>
            <span>/</span>
            <span className="font-semibold text-navy">{agent.name}</span>
          </div>

          {/* Back link */}
          <Link
            href="/agents"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-accent"
          >
            <ArrowLeft size={14} /> Back to agents
          </Link>

          {/* Profile header */}
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className={`flex h-24 w-24 items-center justify-center rounded-3xl font-display text-3xl font-black text-white sm:h-28 sm:w-28 ${agent.color}`}
              >
                {agent.initials}
              </div>
              {agent.verified && (
                <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-accent shadow">
                  <ShieldCheck size={14} className="text-white" strokeWidth={2.5} />
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl font-black text-navy sm:text-4xl">
                  {agent.name}
                </h1>
                {agent.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold/25 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-navy">
                    <Award size={10} /> Featured
                  </span>
                )}
                {agent.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
                    <ShieldCheck size={10} /> RERA Verified
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {agent.role} · Partner since {agent.since}
              </div>

              {/* Rating row */}
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Stars n={agent.rating} size={15} />
                  <span className="font-display text-base font-bold text-navy">{agent.rating}</span>
                  <span className="text-sm text-muted-foreground">({agent.reviews} reviews)</span>
                </div>
                <span className="hidden h-4 w-px bg-border sm:block" />
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock size={13} /> Replies {agent.responseTime}
                </div>
              </div>

              {/* Cities */}
              <div className="mt-3 flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                <span className="text-sm text-foreground/70">{agent.cities.join(" · ")}</span>
              </div>

              {/* Languages */}
              <div className="mt-1.5 flex items-start gap-2">
                <Globe size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                <span className="text-sm text-foreground/70">{agent.languages.join(" · ")}</span>
              </div>
            </div>

            {/* Contact buttons */}
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              {session ? (
                <>
                  <button
                    onClick={() => handleContact("phone")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90 sm:w-auto"
                  >
                    <Phone size={15} /> Call Agent
                  </button>
                  <button
                    onClick={() => handleContact("whatsapp")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-500/25 transition hover:opacity-90 sm:w-auto"
                  >
                    <MessageCircle size={15} /> WhatsApp
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90"
                >
                  <Lock size={14} /> Sign in to contact
                </Link>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Closed Deals" value={String(agent.deals)} />
            <Stat label="Years Experience" value={`${yrs} yrs`} />
            <Stat label="Portfolio Value" value={agent.portfolioValue} />
            <Stat label="Active Listings" value={String(agent.listings)} />
          </div>
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: listings */}
          <div className="lg:col-span-2">
            <h2 className="font-display text-xl font-black text-navy">
              {agentListings.length > 0
                ? `Listings by ${agent.name.split(" ")[0]}`
                : `About ${agent.name.split(" ")[0]}`}
            </h2>

            {agentListings.length > 0 ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {agentListings.map((p) => (
                  <Link
                    key={p.id}
                    href={`/properties/${p.id}`}
                    className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={p.image}
                        alt={p.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <span className="absolute right-2.5 top-2.5 rounded-md bg-navy/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur">
                        {p.matchScore}% match
                      </span>
                      <span className="absolute bottom-2.5 right-2.5 rounded-md bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy">
                        {p.purpose}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {p.locality}, {p.city}
                      </div>
                      <h3 className="mt-0.5 font-display text-base font-bold leading-tight text-navy">
                        {p.title}
                      </h3>
                      <div className="mt-2 flex items-end justify-between">
                        <div className="font-display text-lg font-black text-accent">
                          {p.priceLabel}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.bhk} · {p.area} sqft
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-border bg-white p-8 text-center">
                <Building2
                  size={32}
                  className="mx-auto mb-3 text-muted-foreground/40"
                  strokeWidth={1.5}
                />
                <p className="text-sm font-semibold text-navy">No listings currently active</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {agent.name.split(" ")[0]} has closed {agent.deals} deals across{" "}
                  {agent.cities.slice(0, 2).join(" and ")}.
                </p>
              </div>
            )}

            {totalValue > 0 && (
              <div className="mt-5 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Combined listing value: </span>
                <span className="font-bold text-navy">
                  ₹{(totalValue / 10000000).toFixed(2)} Cr
                </span>
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <div className="space-y-5">
            {/* Specialties */}
            <div className="rounded-2xl border border-border bg-white p-5">
              <h3 className="mb-3 font-display text-base font-bold text-navy">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                {agent.specialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-accent/20 bg-accent/6 px-3 py-1 text-xs font-semibold text-accent"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Cities covered */}
            <div className="rounded-2xl border border-border bg-white p-5">
              <h3 className="mb-3 font-display text-base font-bold text-navy">Cities Covered</h3>
              <ul className="space-y-2">
                {agent.cities.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-sm text-foreground/75">
                    <MapPin size={12} className="shrink-0 text-accent" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* Languages */}
            <div className="rounded-2xl border border-border bg-white p-5">
              <h3 className="mb-3 font-display text-base font-bold text-navy">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {agent.languages.map((l) => (
                  <span
                    key={l}
                    className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-semibold text-navy"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {/* Trust signals */}
            <div className="rounded-2xl border border-border bg-white p-5">
              <h3 className="mb-3 font-display text-base font-bold text-navy">
                Why work with {agent.name.split(" ")[0]}?
              </h3>
              <ul className="space-y-2.5">
                {[
                  `${agent.deals} successful transactions`,
                  `${yrs} years of market expertise`,
                  agent.verified ? "RERA certified & verified" : "Active NxtSft.com partner",
                  `Replies within ${agent.responseTime}`,
                  `Portfolio value: ${agent.portfolioValue}`,
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-foreground/75">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-accent/20 bg-navy p-5 text-white">
              <div className="mb-1 flex items-center gap-2">
                <TrendingUp size={14} className="text-gold" />
                <span className="text-xs font-bold uppercase tracking-widest text-gold">
                  Get in Touch
                </span>
              </div>
              <p className="mt-2 text-sm text-white/75">
                Ready to buy, sell or rent? {agent.name.split(" ")[0]} is available to help.
              </p>
              {session ? (
                <button
                  onClick={() => handleContact("whatsapp")}
                  className="mt-4 w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90"
                >
                  Contact Now
                </button>
              ) : (
                <Link
                  href="/login"
                  className="mt-4 block w-full rounded-xl bg-accent py-2.5 text-center text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90"
                >
                  Sign in to contact
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
