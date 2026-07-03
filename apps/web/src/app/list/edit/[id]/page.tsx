"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, MapPin, Clock, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { validateRera } from "@/lib/rera";
import { parseLatLng } from "@/lib/map";
import { AMENITIES } from "@/data/amenities";
import { ImageUploader, type UploadImage } from "@/components/ui/ImageUploader";
import { compressImage } from "@/lib/image";

const BHK_OPTIONS = ["1 BHK", "2 BHK", "3 BHK", "4+ BHK", "Open Plot", "Studio"];
const FURNISHING = ["Furnished", "Semi-Furnished", "Unfurnished"];
const RERA_LABELS = ["RERA", "TS RERA", "KA RERA", "TN RERA", "MahaRERA", "GujRERA", "HMDA", "DTCP", "BDA", "CMDA", "Others"];

// The editable slice of a listing. City / purpose / property-type are omitted on
// purpose — changing those churns the slug and RERA-state validation, which is a
// separate concern from a routine content edit.
type EditForm = {
  title: string;
  description: string;
  price: string;
  area: string;
  builtUpArea: string;
  bhk: string;
  bedrooms: string;
  bathrooms: string;
  balconies: string;
  parking: string;
  furnishing: string;
  facing: string;
  possession: string;
  rera: string;
  reraLabel: string;
  amenities: string[];
  locality: string;
  latitude: string;
  longitude: string;
};

const numOrEmpty = (v: number | null | undefined) => (v == null ? "" : String(v));

export default function EditListingPage() {
  const { session } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const propertyQ = trpc.properties.get.useQuery({ id }, { enabled: !!id });
  const submitEdit = trpc.properties.submitEdit.useMutation();
  const uploadImage = trpc.media.uploadImage.useMutation();

  const [form, setForm] = useState<EditForm | null>(null);
  const [original, setOriginal] = useState<EditForm | null>(null);
  // Existing hosted image URLs the seller keeps, in cover-first order.
  const [keptImages, setKeptImages] = useState<string[]>([]);
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<UploadImage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [mapsLink, setMapsLink] = useState("");

  const property = propertyQ.data as
    | {
        ownerId: string;
        title: string;
        slug: string;
        description: string | null;
        price: number;
        area: number;
        builtUpArea: number | null;
        bhk: string | null;
        bedrooms: number;
        bathrooms: number;
        balconies: number;
        parking: number;
        furnishing: string | null;
        facing: string | null;
        possession: string | null;
        rera: string | null;
        reraLabel: string | null;
        amenities: string[];
        images: string[];
        location: { city: string; locality: string | null; latitude: number | null; longitude: number | null } | null;
      }
    | undefined;

  // Seed the form once the listing loads.
  useEffect(() => {
    if (!property || form) return;
    const seeded: EditForm = {
      title: property.title ?? "",
      description: property.description ?? "",
      price: numOrEmpty(property.price),
      area: numOrEmpty(property.area),
      builtUpArea: numOrEmpty(property.builtUpArea),
      bhk: property.bhk ?? "",
      bedrooms: numOrEmpty(property.bedrooms),
      bathrooms: numOrEmpty(property.bathrooms),
      balconies: numOrEmpty(property.balconies),
      parking: numOrEmpty(property.parking),
      furnishing: property.furnishing ?? "",
      facing: property.facing ?? "",
      possession: property.possession ?? "",
      rera: property.rera ?? "",
      reraLabel: property.reraLabel ?? "RERA",
      amenities: property.amenities ?? [],
      locality: property.location?.locality ?? "",
      latitude: numOrEmpty(property.location?.latitude),
      longitude: numOrEmpty(property.location?.longitude),
    };
    setForm(seeded);
    setOriginal(seeded);
    setKeptImages(property.images ?? []);
    setOriginalImages(property.images ?? []);
  }, [property, form]);

  const set = <K extends keyof EditForm>(k: K, v: EditForm[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setErrors((e) => (e[k as string] ? { ...e, [k as string]: "" } : e));
  };

  const toggleAmenity = (a: string) =>
    setForm((f) =>
      f
        ? { ...f, amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a] }
        : f,
    );

  const pinFromLink = (value: string) => {
    const parsed = parseLatLng(value);
    if (parsed) {
      set("latitude", String(parsed.lat));
      set("longitude", String(parsed.lng));
      toast.success("Location pinned from link.");
    } else {
      toast.error("Couldn't read coordinates — paste a full Google Maps URL or 'lat, lng'.");
    }
  };

  const removeKept = (url: string) => setKeptImages((arr) => arr.filter((u) => u !== url));

  const isDirty = useMemo(() => {
    if (!form || !original) return false;
    const fieldsChanged = (Object.keys(form) as (keyof EditForm)[]).some((k) => {
      const a = form[k];
      const b = original[k];
      return Array.isArray(a) && Array.isArray(b) ? JSON.stringify(a) !== JSON.stringify(b) : a !== b;
    });
    const imagesChanged = JSON.stringify(keptImages) !== JSON.stringify(originalImages) || newImages.length > 0;
    return fieldsChanged || imagesChanged;
  }, [form, original, keptImages, originalImages, newImages]);

  const validate = (): boolean => {
    if (!form) return false;
    const e: Record<string, string> = {};
    if (form.title.trim().length < 10) e.title = "Title must be at least 10 characters";
    if (!form.description.trim()) e.description = "Add a brief description";
    if (!form.price || Number(form.price) <= 0) e.price = "Enter a valid price";
    if (!form.area || Number(form.area) <= 0) e.area = "Enter a valid area";
    if (form.rera.trim() && property?.location?.city) {
      const reraError = validateRera(form.rera, property.location.city, form.reraLabel);
      if (reraError) e.rera = reraError;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!form || !original) return;
    if (!validate()) return;
    if (!isDirty) {
      toast.info("No changes to submit.");
      return;
    }

    setSubmitting(true);
    // Upload any newly added photos to R2, keeping order (cover = first kept, then new).
    const uploaded: string[] = [];
    for (const img of newImages) {
      try {
        const dataUrl = await compressImage(img.file);
        const { url } = await uploadImage.mutateAsync({
          contentType: "image/jpeg",
          data: dataUrl.split(",")[1] ?? "",
          folder: "properties",
        });
        uploaded.push(url);
      } catch {
        // storage unavailable — skip this photo from the hosted set
      }
    }
    if (newImages.length > 0 && uploaded.length === 0) {
      toast.warning("New photos couldn't be uploaded — submitting without them.");
    }
    const finalImages = [...keptImages, ...uploaded];

    // Build a minimal diff: only send fields the seller actually changed.
    const num = (v: string) => (v === "" ? undefined : Number(v));
    const changed: Record<string, unknown> = {};
    const put = <K extends keyof EditForm>(key: string, current: unknown, base: EditForm[K], now: EditForm[K]) => {
      const differs = Array.isArray(now) && Array.isArray(base)
        ? JSON.stringify(now) !== JSON.stringify(base)
        : now !== base;
      if (differs) changed[key] = current;
    };

    put("title", form.title.trim(), original.title, form.title);
    put("description", form.description.trim() || undefined, original.description, form.description);
    put("price", num(form.price), original.price, form.price);
    put("area", num(form.area), original.area, form.area);
    put("builtUpArea", num(form.builtUpArea), original.builtUpArea, form.builtUpArea);
    put("bhk", form.bhk || undefined, original.bhk, form.bhk);
    put("bedrooms", num(form.bedrooms), original.bedrooms, form.bedrooms);
    put("bathrooms", num(form.bathrooms), original.bathrooms, form.bathrooms);
    put("balconies", num(form.balconies), original.balconies, form.balconies);
    put("parking", num(form.parking), original.parking, form.parking);
    put("furnishing", form.furnishing || undefined, original.furnishing, form.furnishing);
    put("facing", form.facing || undefined, original.facing, form.facing);
    put("possession", form.possession || undefined, original.possession, form.possession);
    put("rera", form.rera.trim() || undefined, original.rera, form.rera);
    put("reraLabel", form.reraLabel || undefined, original.reraLabel, form.reraLabel);
    put("amenities", form.amenities, original.amenities, form.amenities);
    put("locality", form.locality || undefined, original.locality, form.locality);
    put("latitude", num(form.latitude), original.latitude, form.latitude);
    put("longitude", num(form.longitude), original.longitude, form.longitude);
    if (JSON.stringify(finalImages) !== JSON.stringify(originalImages)) changed.images = finalImages;

    try {
      await submitEdit.mutateAsync({ id, ...changed });
      setSubmitting(false);
      toast.success("Changes submitted for review.");
      router.push("/user-portal#mylist");
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Couldn't submit changes.");
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <GuardCard
        title="Sign in to edit your listing"
        body="You need to be signed in as the listing's owner to modify it."
      />
    );
  }
  if (propertyQ.isLoading || !form) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 rounded bg-secondary" />
            <div className="h-40 w-full rounded-2xl bg-secondary" />
          </div>
        </div>
      </div>
    );
  }
  if (propertyQ.isError || !property) {
    return <GuardCard title="Listing not found" body="This listing may have been removed." />;
  }
  if (property.ownerId !== session.id) {
    return <GuardCard title="Not your listing" body="You can only modify listings you own." />;
  }

  const inputCls = (err?: string) =>
    `mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${err ? "border-rose-400" : "border-input"}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link
          href="/user-portal#mylist"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-accent"
        >
          <ArrowLeft size={15} /> Back to my listings
        </Link>

        {/* Review notice */}
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent/[0.04] p-4">
          <Clock size={18} className="mt-0.5 shrink-0 text-accent" />
          <div className="text-sm text-navy">
            <p className="font-semibold">Changes require admin approval before they go live.</p>
            <p className="mt-0.5 text-muted-foreground">
              Approval may take up to 24 hours (TAT). Your listing stays live with its current details until
              then, and you&apos;ll get a notification once the changes are approved.
            </p>
          </div>
        </div>

        <h1 className="mt-6 font-display text-2xl font-black text-navy sm:text-3xl">Modify listing</h1>

        <div className="mt-6 space-y-6 rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-foreground">Listing Title</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls(errors.title)} />
            {errors.title && <p className="mt-1 text-xs text-rose-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className={`${inputCls(errors.description)} resize-none`}
            />
            {errors.description && <p className="mt-1 text-xs text-rose-500">{errors.description}</p>}
          </div>

          {/* Price + area */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-foreground">Price (₹)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className={inputCls(errors.price)}
              />
              {errors.price && <p className="mt-1 text-xs text-rose-500">{errors.price}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground">Super Built-up Area (sqft)</label>
              <input
                type="number"
                value={form.area}
                onChange={(e) => set("area", e.target.value)}
                className={inputCls(errors.area)}
              />
              {errors.area && <p className="mt-1 text-xs text-rose-500">{errors.area}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground">Built-up Area (sqft)</label>
              <input
                type="number"
                value={form.builtUpArea}
                onChange={(e) => set("builtUpArea", e.target.value)}
                className={inputCls()}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground">Configuration / BHK</label>
              <select value={form.bhk} onChange={(e) => set("bhk", e.target.value)} className={inputCls()}>
                <option value="">—</option>
                {BHK_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rooms */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {([
              ["bedrooms", "Bedrooms"],
              ["bathrooms", "Bathrooms"],
              ["balconies", "Balconies"],
              ["parking", "Parking"],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-foreground">{label}</label>
                <input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className={inputCls()}
                />
              </div>
            ))}
          </div>

          {/* Furnishing / facing / possession */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-foreground">Furnishing</label>
              <select value={form.furnishing} onChange={(e) => set("furnishing", e.target.value)} className={inputCls()}>
                <option value="">—</option>
                {FURNISHING.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground">Facing</label>
              <input value={form.facing} onChange={(e) => set("facing", e.target.value)} placeholder="e.g. North-East" className={inputCls()} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground">Possession</label>
              <input value={form.possession} onChange={(e) => set("possession", e.target.value)} placeholder="e.g. Ready to Move" className={inputCls()} />
            </div>
          </div>

          {/* RERA */}
          <div>
            <label className="block text-sm font-semibold text-foreground">
              RERA / Authority Number <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <div className="mt-1.5 flex gap-2">
              <select
                value={form.reraLabel}
                onChange={(e) => set("reraLabel", e.target.value)}
                className="rounded-xl border border-input bg-background px-2 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              >
                {RERA_LABELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <input
                value={form.rera}
                onChange={(e) => set("rera", e.target.value)}
                placeholder="e.g. P51800000053"
                className={`flex-1 rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.rera ? "border-rose-400" : "border-input"}`}
              />
            </div>
            {errors.rera && <p className="mt-1 text-xs text-rose-500">{errors.rera}</p>}
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-sm font-semibold text-foreground">
              Amenities <span className="font-normal text-muted-foreground">({form.amenities.length} selected)</span>
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AMENITIES.map(({ name, Icon }) => {
                const on = form.amenities.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleAmenity(name)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition
                      ${on ? "border-accent bg-accent/8 font-semibold text-accent" : "border-border bg-white text-foreground/70 hover:border-accent/40"}`}
                  >
                    <div className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition ${on ? "border-accent bg-accent" : "border-border"}`}>
                      {on && <Check size={10} strokeWidth={3} className="text-white" />}
                    </div>
                    <Icon size={14} className="shrink-0 text-accent/80" />
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-foreground">
              Locality <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input value={form.locality} onChange={(e) => set("locality", e.target.value)} className={inputCls()} />
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-accent" />
              <label className="text-sm font-semibold text-foreground">
                Pin exact location <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              {form.latitude && form.longitude && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <Check size={10} strokeWidth={3} /> Pinned
                </span>
              )}
            </div>
            <input
              value={mapsLink}
              onChange={(e) => setMapsLink(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (text) {
                  setMapsLink(text);
                  pinFromLink(text);
                  e.preventDefault();
                }
              }}
              placeholder="Paste Google Maps link or '19.017, 72.812'"
              className="mt-2.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                inputMode="decimal"
                value={form.latitude}
                onChange={(e) => set("latitude", e.target.value)}
                placeholder="Latitude"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
              <input
                inputMode="decimal"
                value={form.longitude}
                onChange={(e) => set("longitude", e.target.value)}
                placeholder="Longitude"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-semibold text-foreground">Current Photos</label>
            {keptImages.length > 0 ? (
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {keptImages.map((url, i) => (
                  <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white shadow">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeKept(url)}
                      className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-rose-500 shadow transition hover:bg-rose-500 hover:text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">No photos kept — add at least one below.</p>
            )}
            <label className="mt-4 block text-sm font-semibold text-foreground">Add New Photos</label>
            <div className="mt-2">
              <ImageUploader images={newImages} onChange={setNewImages} max={10} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
            <Link
              href="/user-portal#mylist"
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition hover:bg-secondary"
            >
              Cancel
            </Link>
            <button
              onClick={submit}
              disabled={submitting || !isDirty}
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:opacity-95 disabled:pointer-events-none disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit for approval"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuardCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-white p-10 text-center shadow-sm">
        <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
        <h2 className="font-display text-xl font-black text-navy">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <Link href="/user-portal#mylist" className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white transition hover:opacity-90">
          <ArrowLeft size={15} /> Back to my listings
        </Link>
      </div>
    </div>
  );
}
