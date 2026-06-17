"use client";
import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import { useRouter } from "next/navigation";
import {
  MapPin,
  BedDouble,
  Bath,
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
} from "lucide-react";
import { PropertyEngagement } from "@/components/PropertyEngagement";
import { PropertyMapWrapper as PropertyMap } from "@/components/map/PropertyMapWrapper";
import { GalleryLightbox } from "@/components/ui/GalleryLightbox";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth";
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
  price: number;
  pricePerSqft: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  parking: number;
  images: string[];
  amenities: string[];
  bhk: string | null;
  rera: string | null;
  facing: string | null;
  possession: string | null;
  builder: string | null;
  featured: boolean;
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
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6">
          <div className="animate-pulse space-y-4">
            <div className="h-80 rounded-2xl bg-secondary" />
            <div className="h-8 w-64 rounded bg-secondary" />
            <div className="h-4 w-48 rounded bg-secondary" />
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
          <div className="space-y-6 lg:col-span-2">
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
                <div>
                  <h1 className="font-display text-2xl font-black text-navy sm:text-3xl">
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
                  RERA Verified · {property.rera}
                </div>
              )}
            </div>

            {/* Buyer activity / engagement */}
            <PropertyEngagement propertyId={property.id} />

            {/* Specs */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-display text-lg font-bold text-navy">Property Details</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {property.bedrooms > 0 && (
                  <SpecItem
                    icon={<BedDouble size={18} />}
                    label="Bedrooms"
                    value={property.bhk ?? `${property.bedrooms} BHK`}
                  />
                )}
                {property.bathrooms > 0 && (
                  <SpecItem
                    icon={<Bath size={18} />}
                    label="Bathrooms"
                    value={`${property.bathrooms}`}
                  />
                )}
                <SpecItem
                  icon={<SquareStack size={18} />}
                  label="Area"
                  value={`${property.area.toLocaleString()} sq.ft`}
                />
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

            {/* Amenities */}
            {property.amenities.length > 0 && (
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-display text-lg font-bold text-navy">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a) => (
                    <span
                      key={a}
                      className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-foreground/70"
                    >
                      {a}
                    </span>
                  ))}
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
          <div className="space-y-5">
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
  const items = (reviewsQ.data?.items ?? []) as unknown as ReviewItem[];

  const createReview = trpc.reviews.create.useMutation({
    onSuccess: () => {
      reviewsQ.refetch();
      setForm({ rating: 0, title: "", content: "" });
      setShowForm(false);
      toast.success("Review posted!");
    },
    onError: (e) => toast.error(e.message),
  });
  const markHelpful = trpc.reviews.markHelpful.useMutation({ onSuccess: () => reviewsQ.refetch() });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ rating: 0, title: "", content: "" });

  const avg = items.length ? items.reduce((a, r) => a + r.rating, 0) / items.length : 0;
  const alreadyReviewed = !!session && items.some((r) => r.author?.id === session.id);

  const fmtWhen = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

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
          {items.length > 0 && (
            <div className="flex items-center gap-1.5">
              <StarRow value={Math.round(avg)} size={15} />
              <span className="text-sm font-bold text-navy">{avg.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </div>
          )}
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
        ) : items.length === 0 ? (
          <div className="py-8 text-center">
            <Star size={26} className="mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No reviews yet. Be the first to review this property.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((r) => {
              const initials = (r.author?.name ?? "?")
                .split(" ")
                .map((s) => s[0] ?? "")
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <div key={r.id} className="py-4 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
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
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {fmtWhen(r.createdAt)}
                    </span>
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
