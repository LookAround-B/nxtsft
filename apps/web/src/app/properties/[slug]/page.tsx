"use client";
import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import { useRouter } from "next/navigation";
import {
  MapPin,
  BedDouble,
  Car,
  SquareStack,
  BadgeCheck,
  Phone,
  MessageCircle,
  Heart,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Building2,
  Coins,
  ShieldCheck,
  Star,
  Share2,
  Maximize2,
  Eye,
  Flame,
  Users,
  UtensilsCrossed,
  Rotate3d,
  Play,
  ScrollText,
  IndianRupee,
} from "lucide-react";
import { PropertyEngagement } from "@/components/PropertyEngagement";
import { PropertyReport } from "@/components/PropertyReport";
import { PropertyMapWrapper as PropertyMap } from "@/components/map/PropertyMapWrapper";
import { GalleryLightbox } from "@/components/ui/GalleryLightbox";
import { trpc } from "@/lib/trpc";
import { propertyActivity } from "@/lib/propertyActivity";
import { amenityIcon } from "@/data/amenities";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function formatPrice(price: number): string {
  if (price >= 1_00_00_000) return `₹${(price / 1_00_00_000).toFixed(2)} Cr`;
  if (price >= 1_00_000) return `₹${(price / 1_00_000).toFixed(1)} L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

type FullProperty = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  purpose: string;
  status: string;
  createdAt: string;
  price: number;
  pricePerSqft: number;
  area: number;
  builtUpArea: number | null;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  parking: number;
  images: string[];
  amenities: string[];
  bhk: string | null;
  rera: string | null;
  reraLabel: string | null;
  facing: string | null;
  possession: string | null;
  builder: string | null;
  featured: boolean;
  views: number;
  viewBase: number;
  pgGender: string | null;
  pgOccupancy: string[];
  pgAvailableBeds: number | null;
  pgDeposit: number | null;
  pgRoomTypes: string[];
  pgHouseRules: string[];
  pgFood: string | null;
  virtualTourUrl: string | null;
  walkthroughVideoUrl: string | null;
  location: {
    city: string;
    locality: string;
    state: string;
    address: string | null;
    latitude: number;
    longitude: number;
  };
  owner: { id: string; name: string; email: string; avatar: string | null } | null;
};

/* Small labelled fact tile used in the PG details grid */
function PgFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <div className="flex items-center gap-1.5 text-accent">{icon}</div>
      <div className="mt-1.5 text-sm font-bold text-navy">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

/* Simulated live viewer badge — random jitter every 45s, seeded by viewBase */
function ViewerBadge({
  propertyId,
  createdAt,
  viewBase,
}: {
  propertyId: string;
  createdAt: string;
  viewBase: number;
}) {
  const seed = (viewBase % 9) + 3; // 3–11 starting live count
  const [live, setLive] = useState(seed);
  // Mass (total) views must always exceed Unique Views shown in "Activity On
  // This Property". Both derive from the same fabricated source so they stay
  // consistent: total = unique viewers × a repeat-view factor (1.3–1.6×).
  // Computed after mount (date-dependent) to avoid SSR/CSR hydration mismatch.
  const [massViews, setMassViews] = useState<number | null>(null);

  useEffect(() => {
    const unique = propertyActivity(propertyId, new Date(createdAt)).counts.views;
    const factor = 1.3 + (viewBase % 4) * 0.1; // 1.3–1.6, deterministic per listing
    setMassViews(Math.round(unique * factor));
  }, [propertyId, createdAt, viewBase]);

  useEffect(() => {
    const tick = () => {
      setLive((n) => {
        const delta = Math.random() < 0.5 ? 1 : -1;
        return Math.max(2, Math.min(18, n + delta));
      });
    };
    const id = setInterval(tick, 38_000 + Math.random() * 14_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {massViews !== null && massViews > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-700">
          <Flame size={12} className="text-orange-500" />
          {massViews.toLocaleString("en-IN")} people viewed this month
        </span>
      )}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/8 border border-accent/20 px-3 py-1 text-xs font-semibold text-accent">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        {live} people viewing right now
      </span>
    </div>
  );
}

function SpecItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-navy shadow-sm">
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function ContactCard({
  property,
  session,
  credits,
  refreshCredits,
  onUnlock,
}: {
  property: FullProperty;
  session: ReturnType<typeof useAuth>["session"];
  credits: number;
  refreshCredits: () => Promise<void>;
  onUnlock?: () => void;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);

  const unlock = trpc.properties.unlockContact.useMutation({
    onSuccess: (data) => {
      setPhone(data.phone);
      onUnlock?.();
      toast.success("Owner contact unlocked! 1 credit used.");
      void refreshCredits();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleUnlock = () => {
    if (!session) {
      router.push("/login");
      return;
    }
    if (credits <= 0) {
      router.push("/pricing");
      toast.info("You need credits to unlock owner contacts.");
      return;
    }
    unlock.mutate({ id: property.id });
  };

  const initials =
    property.owner?.name
      .split(" ")
      .map((s) => s[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "??";

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <h3 className="font-display text-base font-bold text-navy">Contact Owner</h3>

      {/* Owner avatar */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-accent font-display text-lg font-black text-white">
          {initials}
        </div>
        <div>
          <div className="font-semibold text-foreground">{property.owner?.name ?? "Owner"}</div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
            <ShieldCheck size={12} />
            Verified Owner
          </div>
        </div>
      </div>

      {/* Credit info */}
      {!phone && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800">
          <Coins size={14} className="shrink-0 text-amber-600" />
          <span>
            {session
              ? credits > 0
                ? `Uses 1 credit · You have ${credits} credit${credits !== 1 ? "s" : ""}`
                : "You have no credits. Buy a plan to unlock."
              : "Sign in to unlock owner contact."}
          </span>
        </div>
      )}

      {/* Phone (after unlock) */}
      {phone ? (
        <div className="mt-4 space-y-2.5">
          <a
            href={`tel:${phone}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-display text-sm font-bold text-white shadow-md shadow-accent/20 transition hover:opacity-95"
          >
            <Phone size={16} />
            {phone}
          </a>
          <a
            href={`https://wa.me/91${phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 py-3 font-display text-sm font-bold text-emerald-600 transition hover:bg-emerald-50"
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
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
              {session ? "Unlock Owner Contact" : "Sign in to Contact"}
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

      {session && credits <= 0 && !phone && (
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

export default function PropertyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { session, credits, refreshCredits } = useAuth();
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    data: property,
    isLoading,
    isError,
  } = trpc.properties.get.useQuery({ id: slug }) as {
    data: FullProperty | undefined;
    isLoading: boolean;
    isError: boolean;
  };

  const addFavorite = trpc.users.addFavorite.useMutation({
    onSuccess: () => {
      setSaved(true);
      toast.success("Saved to your favourites!");
    },
    onError: (e) => toast.error(e.message),
  });
  const removeFavorite = trpc.users.removeFavorite.useMutation({
    onSuccess: () => {
      setSaved(false);
      toast.success("Removed from favourites.");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── View tracking: record a single PropertyView on unmount (real dwell time) ──
  const recordView = trpc.propertyViews.record.useMutation();
  const recordViewRef = useRef(recordView.mutate);
  recordViewRef.current = recordView.mutate;
  const mountedAt = useRef(0);
  const unlockedRef = useRef(false);
  const recordedRef = useRef(false);
  const propertyId = property?.id;

  useEffect(() => {
    if (!propertyId) return;
    mountedAt.current = Date.now();
    recordedRef.current = false;
    unlockedRef.current = false;
    return () => {
      if (recordedRef.current) return;
      recordedRef.current = true;
      const durationSec = Math.min(86_400, Math.round((Date.now() - mountedAt.current) / 1000));
      recordViewRef.current({ propertyId, durationSec, contactUnlocked: unlockedRef.current });
    };
  }, [propertyId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[oklch(0.97_0.01_260)]">
        <div className="border-b border-border bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-5 py-3 sm:px-6">
            <Skeleton className="h-3 w-56 rounded" />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left: gallery + detail cards */}
            <div className="space-y-6 lg:col-span-2">
              <Skeleton className="h-72 w-full rounded-2xl sm:h-96" />
              <div className="rounded-2xl border border-border bg-white p-6">
                <Skeleton className="mb-4 h-6 w-40 rounded" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-white p-6">
                <Skeleton className="mb-3 h-6 w-48 rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-11/12 rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                </div>
              </div>
            </div>
            {/* Right: owner/action card */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-white p-6">
                <Skeleton className="h-8 w-36 rounded" />
                <Skeleton className="mt-3 h-4 w-28 rounded" />
                <Skeleton className="mt-6 h-11 w-full rounded-xl" />
                <Skeleton className="mt-3 h-11 w-full rounded-xl" />
              </div>
              <div className="rounded-2xl border border-border bg-white p-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !property) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-5 py-20 text-center sm:px-6">
          <h1 className="font-display text-2xl font-black text-navy">Property not found</h1>
          <p className="mt-2 text-muted-foreground">
            This listing may have been removed or is no longer available.
          </p>
          <Link
            href="/properties"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white"
          >
            <ArrowLeft size={16} />
            Browse properties
          </Link>
        </div>
      </div>
    );
  }

  const images =
    property.images.length > 0
      ? property.images
      : ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80"];

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.01_260)]">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-5 py-3 sm:px-6">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-accent">
              Home
            </Link>
            <ChevronRight size={12} />
            <Link href="/properties" className="hover:text-accent">
              Properties
            </Link>
            <ChevronRight size={12} />
            <span className="line-clamp-1 text-foreground font-medium max-w-xs">
              {property.title}
            </span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Gallery + Details */}
          <div className="min-w-0 space-y-6 lg:col-span-2">
            {/* Gallery */}
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <div className="relative h-72 sm:h-96">
                <button
                  type="button"
                  aria-label="Open full-screen gallery"
                  onClick={() => setLightboxOpen(true)}
                  className="group absolute inset-0 cursor-zoom-in"
                >
                  <SafeImage
                    src={images[activeImage] ?? images[0] ?? ""}
                    alt={property.title}
                    fill
                    className="object-cover transition group-hover:brightness-95"
                    sizes="(max-width: 1024px) 100vw, 67vw"
                    priority
                  />
                  <span className="absolute bottom-3 right-3 hidden items-center gap-1.5 rounded-full bg-navy/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm sm:flex">
                    <Maximize2 size={13} /> View gallery
                  </span>
                </button>
                {/* Carousel arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      aria-label="Previous image"
                      onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-navy shadow transition hover:bg-white"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      aria-label="Next image"
                      onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-navy shadow transition hover:bg-white"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {images.map((_, i) => (
                        <span
                          key={i}
                          className={`h-2 rounded-full transition-all ${i === activeImage ? "w-5 bg-white" : "w-2 bg-white/60"}`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Purpose badge */}
                <div className="absolute left-4 top-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold text-white ${property.purpose === "Sale" ? "bg-accent" : "bg-emerald-500"}`}
                  >
                    For {property.purpose}
                  </span>
                </div>
                {/* Actions */}
                <div className="absolute right-4 top-4 flex gap-2">
                  <button
                    onClick={() => {
                      if (!session) {
                        toast.info("Sign in to save properties.");
                        return;
                      }
                      if (saved) {
                        removeFavorite.mutate({ propertyId: property.id });
                      } else {
                        addFavorite.mutate({ propertyId: property.id });
                      }
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border border-border backdrop-blur-sm transition ${saved ? "bg-rose-500 text-white border-rose-500" : "bg-white/80 text-foreground hover:bg-rose-50 hover:text-rose-500"}`}
                  >
                    <Heart size={16} fill={saved ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(window.location.href);
                      toast.success("Link copied!");
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white/80 text-foreground backdrop-blur-sm transition hover:bg-secondary"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition ${activeImage === i ? "border-accent" : "border-transparent"}`}
                    >
                      <SafeImage src={img} alt="" fill className="object-cover" sizes="96px" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <GalleryLightbox
              images={images}
              index={activeImage}
              open={lightboxOpen}
              title={property.title}
              onClose={() => setLightboxOpen(false)}
              onIndexChange={setActiveImage}
            />

            {/* Title + Price */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-display text-2xl font-black text-navy break-words sm:text-3xl">
                    {property.title}
                  </h1>
                  <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin size={14} />
                    {property.location.locality}, {property.location.city},{" "}
                    {property.location.state}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl font-black text-accent">
                    {formatPrice(property.price)}
                  </div>
                  {property.pricePerSqft > 0 && (
                    <div className="text-xs text-muted-foreground">
                      ₹{property.pricePerSqft.toLocaleString("en-IN")}/sq.ft
                    </div>
                  )}
                </div>
              </div>

              {/* RERA */}
              {property.rera && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700">
                  <BadgeCheck size={16} />
                  {property.reraLabel ?? "RERA"} Verified · {property.rera}
                </div>
              )}

              {/* Social-proof viewer badge */}
              <ViewerBadge propertyId={property.id} createdAt={property.createdAt} viewBase={property.viewBase} />
            </div>

            {/* Activity on this property (fabricated social proof — Active only) */}
            <PropertyEngagement
              propertyId={property.id}
              createdAt={property.createdAt}
              status={property.status}
              state={property.location.state}
            />

            {/* Report incorrect info */}
            <PropertyReport propertyId={property.id} />

            {/* Specs */}
            <div className="">
              <h2 className="mb-4 font-display text-lg font-bold text-navy">Property Details</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {property.bedrooms > 0 && (
                  <SpecItem
                    icon={<BedDouble size={18} />}
                    label="Bedrooms"
                    value={property.bhk ?? `${property.bedrooms} BHK`}
                  />
                )}
                <SpecItem
                  icon={<SquareStack size={18} />}
                  label="Super Built-up Area"
                  value={`${property.area.toLocaleString()} sq.ft`}
                />
                {property.builtUpArea != null && property.builtUpArea > 0 && (
                  <SpecItem
                    icon={<SquareStack size={18} />}
                    label="Built-up Area"
                    value={`${property.builtUpArea.toLocaleString()} sq.ft`}
                  />
                )}
                {property.parking > 0 && (
                  <SpecItem
                    icon={<Car size={18} />}
                    label="Parking"
                    value={`${property.parking} spot${property.parking > 1 ? "s" : ""}`}
                  />
                )}
                {property.facing && (
                  <SpecItem icon={<Star size={18} />} label="Facing" value={property.facing} />
                )}
                {property.possession && (
                  <SpecItem
                    icon={<Building2 size={18} />}
                    label="Possession"
                    value={property.possession}
                  />
                )}
                {property.builder && (
                  <SpecItem
                    icon={<Building2 size={18} />}
                    label="Builder"
                    value={property.builder}
                  />
                )}
                <SpecItem icon={<Building2 size={18} />} label="Type" value={property.type} />
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <h2 className="mb-3 font-display text-lg font-bold text-navy">
                  About this property
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                  {property.description}
                </p>
              </div>
            )}

            {/* PG-specific details — only when type === "PG" and at least one PG field is set */}
            {property.type === "PG" && (
              property.pgGender || property.pgAvailableBeds != null || property.pgFood ||
              property.pgDeposit != null || property.pgOccupancy.length > 0 ||
              property.pgRoomTypes.length > 0 || property.pgHouseRules.length > 0
            ) && (
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-display text-lg font-bold text-navy">PG Details</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {property.pgGender && (
                    <PgFact icon={<Users size={16} />} label="For" value={property.pgGender} />
                  )}
                  {property.pgAvailableBeds != null && (
                    <PgFact icon={<BedDouble size={16} />} label="Available Beds" value={String(property.pgAvailableBeds)} />
                  )}
                  {property.pgFood && (
                    <PgFact icon={<UtensilsCrossed size={16} />} label="Food" value={property.pgFood} />
                  )}
                  {property.pgDeposit != null && (
                    <PgFact icon={<IndianRupee size={16} />} label="Deposit" value={`₹${property.pgDeposit.toLocaleString("en-IN")}`} />
                  )}
                </div>

                {property.pgOccupancy.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Occupancy</div>
                    <div className="flex flex-wrap gap-1.5">
                      {property.pgOccupancy.map((o) => (
                        <span key={o} className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">{o}</span>
                      ))}
                    </div>
                  </div>
                )}

                {property.pgRoomTypes.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Room Types</div>
                    <div className="flex flex-wrap gap-1.5">
                      {property.pgRoomTypes.map((r) => (
                        <span key={r} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-navy">{r}</span>
                      ))}
                    </div>
                  </div>
                )}

                {property.pgHouseRules.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <ScrollText size={12} /> House Rules
                    </div>
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {property.pgHouseRules.map((r) => (
                        <li key={r} className="flex items-start gap-1.5 text-sm text-foreground/80">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 360° tour & walkthrough (PG + any listing that has them) */}
            {(property.virtualTourUrl || property.walkthroughVideoUrl) && (
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-display text-lg font-bold text-navy">Virtual Tour</h2>
                <div className="space-y-4">
                  {property.virtualTourUrl && (
                    <div>
                      <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Rotate3d size={12} /> 360° Virtual Tour
                      </div>
                      <div className="aspect-video overflow-hidden rounded-xl border border-border">
                        <iframe src={property.virtualTourUrl} className="h-full w-full" allowFullScreen title="360° virtual tour" />
                      </div>
                    </div>
                  )}
                  {property.walkthroughVideoUrl && (
                    <div>
                      <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Play size={12} /> Walkthrough Video
                      </div>
                      <div className="aspect-video overflow-hidden rounded-xl border border-border">
                        <iframe src={property.walkthroughVideoUrl} className="h-full w-full" allowFullScreen title="Walkthrough video" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Amenities */}
            {property.amenities.length > 0 && (
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-display text-lg font-bold text-navy">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a) => {
                    const Icon = amenityIcon(a);
                    return (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-foreground/70"
                      >
                        <Icon size={14} className="text-accent" />
                        {a}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h2 className="mb-1 font-display text-lg font-bold text-navy">Location</h2>
              <p className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin size={14} />
                {[property.location.locality, property.location.city, property.location.state]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <PropertyMap
                lat={property.location.latitude}
                lng={property.location.longitude}
                city={property.location.city}
                seed={property.id}
                label={property.title}
                className="h-80"
              />
            </div>
          </div>

          {/* Right: Contact sidebar */}
          <div className="min-w-0 space-y-5">
            <ContactCard
              property={property}
              session={session}
              credits={credits}
              refreshCredits={refreshCredits}
              onUnlock={() => {
                unlockedRef.current = true;
              }}
            />

            <InquiryForm property={property} session={session} />

            {/* Price info card */}
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Coins size={13} />
                Price Breakdown
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base price</span>
                  <span className="font-bold text-navy">{formatPrice(property.price)}</span>
                </div>
                {property.pricePerSqft > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Per sq.ft</span>
                    <span className="font-semibold">
                      ₹{property.pricePerSqft.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Back link */}
            <Link
              href="/properties"
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-accent transition-colors"
            >
              <ArrowLeft size={15} />
              Back to all properties
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <PropertyReviews propertyId={property.id} session={session} />
        </div>
      </div>
    </div>
  );
}

/* ─── Inquiry / "I'm interested" form ──────────────────────────────────────── */
function InquiryForm({
  property,
  session,
}: {
  property: FullProperty;
  session: ReturnType<typeof useAuth>["session"];
}) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });

  const createLead = trpc.leads.create.useMutation({
    onSuccess: () => {
      setSent(true);
      toast.success("Enquiry sent! An agent will reach out shortly.");
    },
    onError: (e) => toast.error(e.message),
  });

  // Prefill name once the session is known
  useEffect(() => {
    if (session) setForm((f) => (f.name ? f : { ...f, name: session.name }));
  }, [session]);

  const submit = () => {
    if (!session) {
      router.push("/login");
      return;
    }
    if (form.name.trim().length < 2) return toast.error("Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(form.phone))
      return toast.error("Enter a valid 10-digit mobile number.");
    createLead.mutate({
      propertyId: property.id,
      name: form.name.trim(),
      phone: form.phone,
      city: property.location.city,
      interest: `${property.bhk ? property.bhk + " " : ""}${property.type} · ${property.purpose}`,
      notes: form.notes.trim() || undefined,
      source: "Portal",
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <h3 className="font-display text-base font-bold text-navy">Interested in this property?</h3>
      {sent ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl bg-emerald-50 px-4 py-8 text-center">
          <ShieldCheck size={28} className="text-emerald-500" />
          <p className="text-sm font-semibold text-navy">Enquiry sent!</p>
          <p className="text-xs text-muted-foreground">
            Our team will contact you about this {property.type.toLowerCase()}.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            Send an enquiry and a relationship manager will get in touch.
          </p>
          <div className="mt-4 space-y-2.5">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
              className="w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
            />
            <input
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))
              }
              placeholder="10-digit mobile"
              className="w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
            />
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Anything specific you'd like to know? (optional)"
              className="w-full resize-none rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={submit}
              disabled={createLead.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-3 font-display text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {createLead.isPending ? "Sending…" : session ? "Send Enquiry" : "Sign in to enquire"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Reviews ──────────────────────────────────────────────────────────────── */
type ReviewItem = {
  id: string;
  rating: number;
  title: string;
  content: string | null;
  helpful: number;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null } | null;
};

// Default testimonial pool — seeded per-property so each listing shows
// a stable, varied set when no real reviews have been submitted yet.
const REVIEW_POOL = [
  { name: "Priya Sharma", city: "Mumbai", rating: 5, title: "Excellent property, highly recommended!", content: "The property is exactly as described. Great location, well-maintained, and the owner was very cooperative. The process was smooth and transparent from start to finish." },
  { name: "Rajesh Kumar", city: "Bangalore", rating: 5, title: "Great experience with NxtSft", content: "Found exactly what I was looking for within my budget. The listing details were accurate and the locality has excellent connectivity to the metro and schools." },
  { name: "Anita Nair", city: "Chennai", rating: 4, title: "Good value for money", content: "We were sceptical at first but the property turned out to be even better in person. Spacious, good ventilation, and the builder reputation is solid." },
  { name: "Suresh Reddy", city: "Hyderabad", rating: 5, title: "Smooth & hassle-free process", content: "I have bought properties before through brokers and it was always stressful. NxtSft made it easy — verified listings, no hidden costs, direct owner contact." },
  { name: "Kavitha Menon", city: "Kochi", rating: 5, title: "Wonderful locality and well-maintained", content: "The apartment exceeded my expectations. The society is well-maintained, security is round-the-clock, and the neighbours are lovely. Highly recommended!" },
  { name: "Vikram Singh", city: "Delhi NCR", rating: 4, title: "Genuine listings, no time waste", content: "Unlike other portals I didn't encounter any fake listings here. Every property I enquired about was real and the owners responded quickly." },
  { name: "Meera Iyer", city: "Pune", rating: 5, title: "Found my dream home!", content: "After months of searching I finally found the perfect 3 BHK through NxtSft. The photos matched reality, the price was fair, and the registration process was seamless." },
  { name: "Arun Pillai", city: "Thrissur", rating: 4, title: "Reliable platform for property search", content: "The filters are very helpful and I could shortlist properties quickly. The owner was responsive and the property details were completely accurate." },
  { name: "Deepika Joshi", city: "Ahmedabad", rating: 5, title: "Trusted and transparent", content: "I was relocating from Pune and couldn't visit properties frequently. The virtual tour and detailed photos on NxtSft helped me make a confident decision remotely." },
  { name: "Sanjay Patil", city: "Nashik", rating: 5, title: "Best real estate platform in India", content: "I have used 99acres, MagicBricks and others but NxtSft is far more transparent. The RERA details are always present and the pricing is genuine." },
  { name: "Lakshmi Venkat", city: "Coimbatore", rating: 4, title: "Professional and courteous service", content: "The relationship manager helped us shortlist properties based on our specific requirements. We finalised a beautiful villa within two weeks of registering." },
  { name: "Nikhil Desai", city: "Surat", rating: 5, title: "No brokerage — saved a lot!", content: "The zero-commission model is a game changer. Saved almost ₹2.5L in brokerage. The entire process from search to registration was done in under a month." },
  { name: "Sunita Bose", city: "Kolkata", rating: 5, title: "Verified listings give peace of mind", content: "The verified owner badge and RERA number made me confident about the investment. The property is exactly as shown — no surprises at all." },
  { name: "Harish Nambiar", city: "Calicut", rating: 4, title: "Great connectivity and amenities", content: "The property is close to the expressway, schools, and hospitals. The gated community is very well-managed and the builder delivered on time." },
  { name: "Pooja Agarwal", city: "Jaipur", rating: 5, title: "Highly satisfied with the purchase", content: "From shortlisting to registration everything was smooth. The NxtSft team was always available to answer questions. The flat is spacious and priced right." },
  { name: "Mohan Krishnan", city: "Mysuru", rating: 5, title: "Peaceful location, worth every rupee", content: "We were looking for a retirement home and this property ticked every box — peaceful locality, good infrastructure, and a trustworthy builder." },
  { name: "Ritu Kapoor", city: "Chandigarh", rating: 4, title: "Quick process, genuine owners", content: "Every property enquiry I made was responded to within hours. The owners were professional and there was no pressure at any point." },
  { name: "Abhijit Roy", city: "Bhubaneswar", rating: 5, title: "Exceeded all our expectations", content: "We got a 2 BHK that is better than anything we saw at this price point. The photographs on the listing were accurate and the area is growing rapidly." },
  { name: "Geetha Subramanian", city: "Madurai", rating: 5, title: "Transparent pricing, no hidden charges", content: "The price breakdown was very clear — base price, stamp duty, registration. No surprises. The property is well-designed and worth the investment." },
  { name: "Prakash Tiwari", city: "Lucknow", rating: 4, title: "Good investment, great platform", content: "I bought this as an investment property and I am very happy with the decision. The rental yield is strong and the resale value is appreciating well." },
];

function pickDefaultReviews(propertyId: string, count: number) {
  const hash = propertyId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(REVIEW_POOL[(hash + i * 7) % REVIEW_POOL.length]!);
  }
  return result;
}

function StarRow({
  value,
  size = 14,
  onSelect,
}: {
  value: number;
  size?: number;
  onSelect?: (n: number) => void;
}) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= value;
        const star = (
          <Star
            size={size}
            className={filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}
          />
        );
        return onSelect ? (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className="cursor-pointer transition hover:scale-110"
          >
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        );
      })}
    </span>
  );
}

function PropertyReviews({
  propertyId,
  session,
}: {
  propertyId: string;
  session: ReturnType<typeof useAuth>["session"];
}) {
  const router = useRouter();
  const reviewsQ = trpc.reviews.list.useQuery({ propertyId });
  const realItems = (reviewsQ.data?.items ?? []) as unknown as ReviewItem[];

  const createReview = trpc.reviews.create.useMutation({
    onSuccess: () => {
      setForm({ rating: 0, title: "", content: "" });
      setShowForm(false);
      toast.success("Review submitted!", {
        description: "It will appear once an admin approves it.",
      });
    },
    onError: (e) => toast.error(e.message),
  });
  const markHelpful = trpc.reviews.markHelpful.useMutation({ onSuccess: () => reviewsQ.refetch() });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ rating: 0, title: "", content: "" });

  // Use default pool when no real reviews exist yet
  const defaults = pickDefaultReviews(propertyId, 3);
  const usingDefaults = !reviewsQ.isLoading && realItems.length === 0;
  const displayItems = usingDefaults ? defaults : realItems;

  const avg = usingDefaults
    ? +(defaults.reduce((a, r) => a + r.rating, 0) / defaults.length).toFixed(1)
    : realItems.length
      ? +(realItems.reduce((a, r) => a + r.rating, 0) / realItems.length).toFixed(1)
      : 0;

  const alreadyReviewed = !!session && realItems.some((r) => r.author?.id === session.id);

  const submit = () => {
    if (form.rating < 1) return toast.error("Pick a star rating.");
    if (form.title.trim().length < 3) return toast.error("Title must be at least 3 characters.");
    createReview.mutate({
      propertyId,
      rating: form.rating,
      title: form.title.trim(),
      content: form.content.trim() || undefined,
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-lg font-bold text-navy">Reviews</h2>
          <div className="flex items-center gap-1.5">
            <StarRow value={Math.round(avg)} size={15} />
            <span className="text-sm font-bold text-navy">{avg.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({displayItems.length})</span>
          </div>
        </div>

        {alreadyReviewed ? (
          <span className="text-xs font-semibold text-emerald-600">✓ You reviewed this</span>
        ) : (
          <button
            onClick={() => {
              if (!session) {
                router.push("/login");
                return;
              }
              setShowForm((v) => !v);
            }}
            className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
          >
            {session ? (showForm ? "Cancel" : "Write a review") : "Sign in to review"}
          </button>
        )}
      </div>

      {showForm && !alreadyReviewed && (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-secondary/20 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-navy">Your rating:</span>
            <StarRow
              value={form.rating}
              size={20}
              onSelect={(n) => setForm((f) => ({ ...f, rating: n }))}
            />
          </div>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Summarise your experience"
            maxLength={100}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Tell others about the property, locality, owner experience… (optional)"
            rows={3}
            maxLength={1000}
            className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={submit}
            disabled={createReview.isPending}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {createReview.isPending ? "Posting…" : "Post review"}
          </button>
        </div>
      )}

      <div className="mt-5">
        {reviewsQ.isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse space-y-2 border-b border-border pb-4">
                <div className="h-4 w-40 rounded bg-secondary" />
                <div className="h-3 w-full rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : usingDefaults ? (
          <div className="divide-y divide-border">
            {defaults.map((r, idx) => {
              const initials = r.name
                .split(" ")
                .map((s) => s[0] ?? "")
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <div key={idx} className="py-4 first:pt-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-navy to-accent text-xs font-black text-white">
                      {initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-navy">{r.name}</div>
                      <div className="flex items-center gap-1.5">
                        <StarRow value={r.rating} size={12} />
                        <span className="text-[11px] text-muted-foreground">{r.city}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-foreground">{r.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.content}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {realItems.map((r) => {
              const initials = (r.author?.name ?? "?")
                .split(" ")
                .map((s) => s[0] ?? "")
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <div key={r.id} className="py-4 first:pt-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-navy to-accent text-xs font-black text-white">
                      {initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-navy">
                        {r.author?.name ?? "User"}
                      </div>
                      <StarRow value={r.rating} size={12} />
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-foreground">{r.title}</div>
                  {r.content && <p className="mt-1 text-sm text-muted-foreground">{r.content}</p>}
                  <button
                    onClick={() => {
                      if (!session) return router.push("/login");
                      markHelpful.mutate({ id: r.id });
                    }}
                    disabled={markHelpful.isPending}
                    className="mt-2 text-xs font-semibold text-muted-foreground hover:text-accent disabled:opacity-50"
                  >
                    👍 Helpful ({r.helpful})
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
