"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { WatermarkOverlay } from "@/components/ui/WatermarkOverlay";
import { useParams } from "next/navigation";
import {
  Star, Phone, MessageCircle, Lock, ShieldCheck, MapPin, Globe,
  Award, ArrowLeft, Clock, TrendingUp, Building2, CheckCircle2,
} from "lucide-react";
import { trpcClient } from "@/lib/trpcClient";
import { useAuth } from "@/lib/auth";

type AgentRow = {
  id: string; name: string; slug: string | null; city: string; verified: boolean;
  phone?: string | null;
  initials?: string; rating?: number; reviews?: number; deals?: number; since?: number;
  listings?: number; featured?: boolean; color?: string; responseTime?: string;
  portfolioValue?: string; specialties?: string[]; languages?: string[]; cities?: string[];
};

type AgentListing = {
  id: string; slug: string; title: string; type: string; purpose: string;
  price: number; bhk: string | null; area: number; images: string[];
  location: { city: string; locality: string } | null;
};

const fmtPrice = (p: number) =>
  p >= 1e7 ? `₹${(p / 1e7).toFixed(2)} Cr` : p >= 1e5 ? `₹${(p / 1e5).toFixed(1)} L` : `₹${p.toLocaleString("en-IN")}`;

function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size}
          className={i <= Math.round(n) ? "fill-amber-400 text-amber-400" : "fill-border text-border"} />
      ))}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4 text-center">
      <div className="font-display text-2xl font-black text-navy">{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

export default function AgentProfileClient() {
  const { slug } = useParams<{ slug: string }>();
  const { session } = useAuth();
  const [agent, setAgent] = useState<AgentRow | null | undefined>(undefined);
  const [listings, setListings] = useState<AgentListing[]>([]);

  useEffect(() => {
    trpcClient.users.getAgent.query({ slug })
      .then(setAgent)
      .catch(() => setAgent(null));
    trpcClient.users.agentListings.query({ slug })
      .then(setListings)
      .catch(() => setListings([]));
  }, [slug]);

  if (agent === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-bold text-navy">Agent not found</p>
        <Link href="/agents" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
          Back to Agents
        </Link>
      </div>
    );
  }

  const yrs = new Date().getFullYear() - (agent.since ?? new Date().getFullYear());
  const color = agent.color ?? "bg-accent";
  const cities = agent.cities ?? [agent.city];
  const specialties = agent.specialties ?? [];
  const languages = agent.languages ?? [];

  // Normalise the agent's phone to a 10-digit local number, then build real
  // dial / WhatsApp links (null when no usable number is on file).
  const local10 = (agent.phone ?? "").replace(/\D/g, "").slice(-10);
  const hasPhone = local10.length === 10;
  const telHref = hasPhone ? `tel:+91${local10}` : null;
  const waHref = hasPhone ? `https://wa.me/91${local10}` : null;

  return (
    <div className="min-h-screen bg-background">
        <section className="border-b border-border bg-white">
          <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
            <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-accent">Home</Link>
              <span>/</span>
              <Link href="/agents" className="hover:text-accent">Agents</Link>
              <span>/</span>
              <span className="font-semibold text-navy">{agent.name}</span>
            </div>
            <Link href="/agents" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-accent">
              <ArrowLeft size={14} /> Back to agents
            </Link>
            <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="relative shrink-0">
                <div className={`flex h-24 w-24 items-center justify-center rounded-3xl font-display text-3xl font-black text-white sm:h-28 sm:w-28 ${color}`}>
                  {agent.initials ?? agent.name[0]}
                </div>
                {agent.verified && (
                  <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-accent shadow">
                    <ShieldCheck size={14} className="text-white" strokeWidth={2.5} />
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-3xl font-black text-navy sm:text-4xl">{agent.name}</h1>
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
                <div className="mt-1 text-sm text-muted-foreground">Senior RERA Agent · Partner since {agent.since}</div>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Stars n={agent.rating ?? 0} size={15} />
                    <span className="font-display text-base font-bold text-navy">{agent.rating}</span>
                    <span className="text-sm text-muted-foreground">({agent.reviews} reviews)</span>
                  </div>
                  <span className="hidden h-4 w-px bg-border sm:block" />
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock size={13} /> Replies {agent.responseTime ?? "within 24 hrs"}
                  </div>
                </div>
                {cities.length > 0 && (
                  <div className="mt-3 flex items-start gap-2">
                    <MapPin size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm text-foreground/70">{cities.join(" · ")}</span>
                  </div>
                )}
                {languages.length > 0 && (
                  <div className="mt-1.5 flex items-start gap-2">
                    <Globe size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm text-foreground/70">{languages.join(" · ")}</span>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                {!session ? (
                  <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90">
                    <Lock size={14} /> Sign in to contact
                  </Link>
                ) : hasPhone ? (
                  <>
                    <a href={telHref!} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90 sm:w-auto">
                      <Phone size={15} /> Call Agent
                    </a>
                    <a href={waHref!} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-500/25 transition hover:opacity-90 sm:w-auto">
                      <MessageCircle size={15} /> WhatsApp
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Contact details unavailable</span>
                )}
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Closed Deals" value={String(agent.deals ?? 0)} />
              <Stat label="Years Experience" value={`${yrs} yrs`} />
              <Stat label="Portfolio Value" value={agent.portfolioValue ?? "—"} />
              <Stat label="Active Listings" value={String(agent.listings ?? 0)} />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="mb-4 font-display text-lg font-bold text-navy">
                Listings by {agent.name.split(" ")[0]}
                {listings.length > 0 && (
                  <span className="ml-2 text-sm font-semibold text-muted-foreground">
                    ({listings.length})
                  </span>
                )}
              </h2>
              {listings.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {listings.map((p) => (
                    <Link
                      key={p.id}
                      href={`/properties/${p.slug}`}
                      className="group overflow-hidden rounded-2xl border border-border bg-white transition hover:border-accent/40 hover:shadow-md"
                    >
                      <div className="relative h-40 w-full bg-secondary">
                        <Image
                          src={p.images?.[0] ?? "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=70"}
                          alt={p.title}
                          fill
                          className="object-cover transition group-hover:scale-[1.02]"
                        />
                        <span className="absolute left-2 top-2 rounded-full bg-navy/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          For {p.purpose}
                        </span>
                        <WatermarkOverlay />
                      </div>
                      <div className="p-4">
                        <div className="truncate text-sm font-semibold text-navy">{p.title}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin size={11} className="shrink-0" />
                          {[p.location?.locality, p.location?.city].filter(Boolean).join(", ")}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-display text-base font-bold text-accent">{fmtPrice(p.price)}</span>
                          <div className="flex flex-wrap items-center justify-end gap-1.5 text-[11px] font-semibold text-foreground/70">
                            {p.bhk && <span className="rounded bg-secondary px-1.5 py-0.5">{p.bhk}</span>}
                            <span className="rounded bg-secondary px-1.5 py-0.5">{p.area} sqft</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
                  <Building2 size={32} className="mx-auto mb-3 text-muted-foreground/40" strokeWidth={1.5} />
                  <p className="text-sm font-semibold text-navy">No live listings right now</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {agent.name.split(" ")[0]} has closed {agent.deals ?? 0} deals. Browse other available properties.
                  </p>
                  <Link href="/properties" className="mt-4 inline-block rounded-xl bg-accent px-5 py-2 text-sm font-bold text-white transition hover:opacity-90">
                    Browse Properties →
                  </Link>
                </div>
              )}
            </div>
            <div className="space-y-5">
              {specialties.length > 0 && (
                <div className="rounded-2xl border border-border bg-white p-5">
                  <h3 className="mb-3 font-display text-base font-bold text-navy">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {specialties.map((s) => (
                      <span key={s} className="rounded-full border border-accent/20 bg-accent/6 px-3 py-1 text-xs font-semibold text-accent">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {cities.length > 0 && (
                <div className="rounded-2xl border border-border bg-white p-5">
                  <h3 className="mb-3 font-display text-base font-bold text-navy">Cities Covered</h3>
                  <ul className="space-y-2">
                    {cities.map((c) => (
                      <li key={c} className="flex items-center gap-2 text-sm text-foreground/75">
                        <MapPin size={12} className="shrink-0 text-accent" />{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {languages.length > 0 && (
                <div className="rounded-2xl border border-border bg-white p-5">
                  <h3 className="mb-3 font-display text-base font-bold text-navy">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {languages.map((l) => (
                      <span key={l} className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-semibold text-navy">{l}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-2xl border border-border bg-white p-5">
                <h3 className="mb-3 font-display text-base font-bold text-navy">Why work with {agent.name.split(" ")[0]}?</h3>
                <ul className="space-y-2.5">
                  {[
                    `${agent.deals ?? 0} successful transactions`,
                    `${yrs} years of market expertise`,
                    agent.verified ? "RERA certified & verified" : "Active NxtSft.com partner",
                    `Replies within ${agent.responseTime ?? "24 hrs"}`,
                    `Portfolio value: ${agent.portfolioValue ?? "Available on request"}`,
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-foreground/75">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />{point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-accent/20 bg-navy p-5 text-white">
                <div className="mb-1 flex items-center gap-2">
                  <TrendingUp size={14} className="text-gold" />
                  <span className="text-xs font-bold uppercase tracking-widest text-gold">Get in Touch</span>
                </div>
                <p className="mt-2 text-sm text-white/75">Ready to buy, sell or rent? {agent.name.split(" ")[0]} is available to help.</p>
                {!session ? (
                  <Link href="/login" className="mt-4 block w-full rounded-xl bg-accent py-2.5 text-center text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90">
                    Sign in to contact
                  </Link>
                ) : waHref ? (
                  <a href={waHref} target="_blank" rel="noopener noreferrer" className="mt-4 block w-full rounded-xl bg-accent py-2.5 text-center text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90">
                    Contact Now
                  </a>
                ) : (
                  <p className="mt-4 text-sm text-white/60">Contact details unavailable right now.</p>
                )}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
