"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Lamp, MapPin, Globe, CheckCircle2, Calendar, ArrowLeft, IndianRupee,
  Phone, Mail, MessageCircle, Coins, ShieldCheck, ChevronRight, Clock, PaintBucket,
  Heart, Share2, Video, Play, Rotate3d,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth";
import { DecorStoreReport } from "@/components/DecorStoreReport";

function fmt(n: number | null | undefined): string {
  if (n == null) return "";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(0)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

type Store = {
  id: string; slug: string; companyName: string; city: string; state: string | null;
  logo: string | null; coverImage: string | null; description: string | null;
  verified: boolean; yearsExperience: number | null; projectsCompleted: number;
  startingBudget: number | null; decorCategories: string[]; servicesOffered: string[];
  areasServed: string[]; portfolioImages: string[]; portfolioVideos: string[];
  workingHours: string | null; website: string | null;
};

function ContactCard({ store, session, credits, refreshCredits }: {
  store: Store;
  session: ReturnType<typeof useAuth>["session"];
  credits: number;
  refreshCredits: () => Promise<void>;
}) {
  const router = useRouter();
  const [contact, setContact] = useState<{ phone: string; email: string | null } | null>(null);

  const unlock = trpc.decorStores.unlockContact.useMutation({
    onSuccess: (data) => {
      setContact({ phone: data.phone, email: data.email });
      toast.success("Store contact unlocked! 1 credit used.");
      void refreshCredits();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleUnlock = () => {
    if (!session) { router.push("/login"); return; }
    if (credits <= 0) {
      router.push("/pricing");
      toast.info("You need credits to unlock store contacts.");
      return;
    }
    unlock.mutate({ id: store.id });
  };

  const initials = store.companyName.split(" ").map((s) => s[0] ?? "").join("").slice(0, 2).toUpperCase();

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <h3 className="font-display text-base font-bold text-navy">Contact Store</h3>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-accent font-display text-lg font-black text-white">
          {initials}
        </div>
        <div>
          <div className="font-semibold text-foreground">{store.companyName}</div>
          {store.verified && (
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
              <ShieldCheck size={12} /> Verified Store
            </div>
          )}
        </div>
      </div>

      {!contact && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800">
          <Coins size={14} className="shrink-0 text-amber-600" />
          <span>
            {session
              ? credits > 0
                ? `Uses 1 credit · You have ${credits} credit${credits !== 1 ? "s" : ""}`
                : "You have no credits. Buy a plan to unlock."
              : "Sign in to unlock store contact."}
          </span>
        </div>
      )}

      {contact ? (
        <div className="mt-4 space-y-2.5">
          <a
            href={`tel:${contact.phone}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-display text-sm font-bold text-white shadow-md shadow-accent/20 transition hover:opacity-95"
          >
            <Phone size={16} />
            {contact.phone}
          </a>
          <a
            href={`https://wa.me/91${contact.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 py-3 font-display text-sm font-bold text-emerald-600 transition hover:bg-emerald-50"
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold text-navy transition hover:bg-secondary"
            >
              <Mail size={14} />
              {contact.email}
            </a>
          )}
        </div>
      ) : (
        <button
          onClick={handleUnlock}
          disabled={unlock.isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-display text-sm font-bold text-white shadow-md shadow-accent/20 transition hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-60"
        >
          {unlock.isPending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Unlocking…
            </>
          ) : (
            <>
              <Phone size={16} />
              {session ? "Unlock Store Contact" : "Sign in to Contact"}
              {session && credits > 0 && (
                <span className="ml-auto flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                  <Coins size={10} />1
                </span>
              )}
            </>
          )}
        </button>
      )}

      {!session && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          New user?{" "}
          <Link href="/register" className="font-semibold text-accent hover:underline">
            Register free and get 1 credit
          </Link>
        </p>
      )}

      {session && credits <= 0 && !contact && (
        <Link
          href="/pricing"
          className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          Buy credits from ₹99
          <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

function SimilarStores({ slug }: { slug: string }) {
  const { data } = trpc.decorStores.similar.useQuery({ slug }) as { data: Store[] | undefined };
  if (!data || data.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <h2 className="mb-4 font-display text-lg font-bold text-navy">Similar Decor Stores</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.map((d) => (
          <Link
            key={d.id}
            href={`/decor/${d.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-border p-3 transition hover:border-accent/40 hover:shadow-sm"
          >
            <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
              {d.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.logo} alt={d.companyName} className="h-9 w-9 rounded-md object-contain" />
              ) : (
                <Lamp size={18} strokeWidth={1.75} />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-navy group-hover:text-accent">{d.companyName}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin size={10} />{[d.city, d.state].filter(Boolean).join(", ")}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DecorStoreClient({ slug }: { slug: string }) {
  const { session, credits, refreshCredits } = useAuth();
  const { data: store, isLoading } = trpc.decorStores.publicGet.useQuery({ slug }) as {
    data: Store | null | undefined;
    isLoading: boolean;
  };

  const [saved, setSaved] = useState(false);
  const addFavorite = trpc.users.addDecorFavorite.useMutation({
    onSuccess: () => { setSaved(true); toast.success("Saved to your favourites!"); },
    onError: (e) => toast.error(e.message),
  });
  const removeFavorite = trpc.users.removeDecorFavorite.useMutation({
    onSuccess: () => { setSaved(false); toast.success("Removed from favourites."); },
    onError: (e) => toast.error(e.message),
  });

  function toggleSave() {
    if (!store) return;
    if (!session) { toast.info("Sign in to save stores."); return; }
    if (saved) removeFavorite.mutate({ storeId: store.id });
    else addFavorite.mutate({ storeId: store.id });
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: store?.companyName, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied to clipboard."); }
    } catch { /* user dismissed share sheet */ }
  }

  const recordView = trpc.decorStores.recordView.useMutation();
  const recordViewRef = useRef(recordView.mutate);
  recordViewRef.current = recordView.mutate;
  const mountedAt = useRef(0);
  const recordedRef = useRef(false);
  const storeId = store?.id;

  useEffect(() => {
    if (!storeId) return;
    mountedAt.current = Date.now();
    recordedRef.current = false;
    return () => {
      if (recordedRef.current) return;
      recordedRef.current = true;
      const durationSec = Math.min(86_400, Math.round((Date.now() - mountedAt.current) / 1000));
      recordViewRef.current({ storeId, durationSec });
    };
  }, [storeId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Lamp size={48} className="text-muted-foreground/30" />
        <p className="font-semibold text-navy">Store not found</p>
        <Link href="/decor" className="text-sm text-accent hover:underline">← Back to directory</Link>
      </div>
    );
  }

  const images = store.portfolioImages.length > 0 ? store.portfolioImages : [];

  return (
    <main className="min-h-screen bg-[oklch(0.97_0.01_260)]">
      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Link href="/decor" className="mb-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-accent">
            <ArrowLeft size={12} /> Back to Decors
          </Link>
          <div className="flex flex-wrap items-start gap-5">
            <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl border border-border bg-accent/10 text-accent">
              {store.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logo} alt={store.companyName} className="h-14 w-14 rounded-xl object-contain" />
              ) : (
                <Lamp size={28} strokeWidth={1.5} />
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-black text-navy">{store.companyName}</h1>
                {store.verified && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 size={11} /> Verified Store
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {(store.city || store.state) && (
                  <span className="flex items-center gap-1"><MapPin size={11} />{[store.city, store.state].filter(Boolean).join(", ")}</span>
                )}
                {store.yearsExperience != null && (
                  <span className="flex items-center gap-1"><Calendar size={11} />{store.yearsExperience}+ years experience</span>
                )}
                {store.workingHours && (
                  <span className="flex items-center gap-1"><Clock size={11} />{store.workingHours}</span>
                )}
                {store.website && (
                  <a href={store.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-accent">
                    <Globe size={11} />{store.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
              {store.description && (
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{store.description}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex gap-2">
                <button
                  onClick={toggleSave}
                  aria-label="Save store"
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${saved ? "border-rose-500 bg-rose-500 text-white" : "border-border bg-white text-foreground hover:bg-rose-50 hover:text-rose-500"}`}
                >
                  <Heart size={16} fill={saved ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={share}
                  aria-label="Share store"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-foreground transition hover:bg-secondary"
                >
                  <Share2 size={15} />
                </button>
              </div>
              <div className="flex gap-4">
                {[
                  { label: "Projects Done", value: store.projectsCompleted },
                  { label: "Categories",    value: store.decorCategories.length },
                  { label: "Areas Served",  value: store.areasServed.length },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-center">
                    <div className="font-display text-xl font-black text-navy">{value}</div>
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Portfolio gallery */}
            <div className="rounded-2xl border border-border bg-white p-6">
              <h2 className="mb-4 font-display text-lg font-bold text-navy">Portfolio</h2>
              {images.length === 0 ? (
                <p className="text-sm text-muted-foreground">No portfolio images uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt={`${store.companyName} project ${i + 1}`} className="aspect-square w-full rounded-xl object-cover" />
                  ))}
                </div>
              )}
            </div>

            {/* Project videos */}
            {store.portfolioVideos.length > 0 && (
              <div className="rounded-2xl border border-border bg-white p-6">
                <h2 className="mb-4 font-display text-lg font-bold text-navy">Videos</h2>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Video size={12} /> Project Videos
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {store.portfolioVideos.map((src, i) => (
                        <div key={i} className="aspect-video overflow-hidden rounded-xl border border-border">
                          <iframe src={src} className="h-full w-full" allowFullScreen title={`Project video ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Services & categories */}
            <div className="rounded-2xl border border-border bg-white p-6">
              <h2 className="mb-4 font-display text-lg font-bold text-navy">Services &amp; Categories</h2>
              {store.servicesOffered.length > 0 && (
                <div className="mb-4">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Services Offered</div>
                  <div className="flex flex-wrap gap-1.5">
                    {store.servicesOffered.map((s) => (
                      <span key={s} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-navy">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {store.decorCategories.length > 0 && (
                <div className="mb-4">
                  <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <PaintBucket size={11} /> Decor Categories
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {store.decorCategories.map((s) => (
                      <span key={s} className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {store.areasServed.length > 0 && (
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Areas Served</div>
                  <div className="flex flex-wrap gap-1.5">
                    {store.areasServed.map((s) => (
                      <span key={s} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {store.startingBudget != null && (
                <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-navy">
                  <IndianRupee size={13} /> Starting budget: {fmt(store.startingBudget)}
                </p>
              )}
            </div>

            {/* Similar stores */}
            <SimilarStores slug={store.slug} />

            {/* Report listing */}
            <DecorStoreReport storeId={store.id} />
          </div>

          {/* Right: contact card */}
          <div className="space-y-4">
            <ContactCard store={store} session={session} credits={credits} refreshCredits={refreshCredits} />
          </div>
        </div>
      </div>
    </main>
  );
}
