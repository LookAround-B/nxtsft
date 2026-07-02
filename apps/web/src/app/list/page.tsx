"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Home,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Check,
  ArrowRight,
  ClipboardList,
  User,
  Upload,
  Search,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { submitListing, type ListerType, type PendingListing } from "@/lib/listings";
import { trpc } from "@/lib/trpc";
import { validateRera } from "@/lib/rera";
import { AMENITIES } from "@/data/amenities";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ImageUploader, type UploadImage } from "@/components/ui/ImageUploader";
import { compressImage } from "@/lib/image";

const PROPERTY_TYPES = ["Apartment", "Villa", "Plot", "Commercial", "PG / Co-living", "Studio"];
const CITIES = [
  "Mumbai",
  "Bengaluru",
  "Delhi NCR",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Surat",
  "Jaipur",
  "Lucknow",
  "Noida",
  "Gurgaon",
  "Other",
];
const BHK_OPTIONS = ["1 BHK", "2 BHK", "3 BHK", "4+ BHK", "Open Plot", "Studio"];

const STEPS = [
  { num: 1, label: "Role", Icon: User },
  { num: 2, label: "Property", Icon: Building2 },
  { num: 3, label: "Details", Icon: ClipboardList },
  { num: 4, label: "Contact", Icon: User },
];

type FormData = {
  listerType: ListerType | "";
  propertyType: string;
  purpose: "Sale" | "Rent";
  city: string;
  locality: string;
  price: string;
  area: string;
  areaUnit: "sqft" | "sqyd";
  builtUpArea: string;
  bhk: string;
  title: string;
  description: string;
  amenities: string[];
  rera: string;
  reraLabel: string;
  possession: string;
  listerName: string;
  listerEmail: string;
  listerPhone: string;
};

const EMPTY: FormData = {
  listerType: "",
  propertyType: "",
  purpose: "Sale",
  city: "",
  locality: "",
  price: "",
  area: "",
  areaUnit: "sqft",
  builtUpArea: "",
  bhk: "",
  title: "",
  description: "",
  amenities: [],
  rera: "",
  reraLabel: "RERA",
  possession: "",
  listerName: "",
  listerEmail: "",
  listerPhone: "",
};

const DB_TYPE_MAP: Record<
  string,
  "Apartment" | "Villa" | "Studio" | "Office" | "Bungalow" | "Plot" | "PG"
> = {
  Apartment: "Apartment",
  Villa: "Villa",
  Studio: "Studio",
  Plot: "Plot",
  Commercial: "Office",
  "PG / Co-living": "PG",
};

function parseBedrooms(bhk: string): number {
  if (bhk.startsWith("4+")) return 4;
  const n = parseInt(bhk);
  return isNaN(n) ? 0 : n;
}

// Directory Project.type → the form's property-type label.
const PROJECT_TYPE_TO_FORM: Record<string, string> = {
  Apartment: "Apartment",
  HighRise: "Apartment",
  Villa: "Villa",
  Commercial: "Commercial",
  Plot: "Plot",
  Studio: "Studio",
  PG: "PG / Co-living",
  Others: "Apartment",
};

type PickedProject = { id: string; name: string; builderName: string };

export default function ListPropertyPage() {
  const { session } = useAuth();
  const createProperty = trpc.properties.create.useMutation();
  const uploadImage = trpc.media.uploadImage.useMutation();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<PendingListing | null>(null);
  const [images, setImages] = useState<UploadImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState<FormData>(EMPTY);

  // ── Project picker (pre-fills the form from the builders directory) ──
  const [projectQuery, setProjectQuery] = useState("");
  const [projectTerm, setProjectTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<PickedProject | null>(null);
  const [showProjectResults, setShowProjectResults] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setProjectTerm(projectQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [projectQuery]);

  const projectsQ = trpc.builders.projectSearch.useQuery(
    { search: projectTerm || undefined, limit: 8 },
    { enabled: !selectedProject && projectTerm.length >= 2 },
  );
  const projectResults = projectsQ.data ?? [];

  const pickProject = (p: (typeof projectResults)[number]) => {
    setSelectedProject({ id: p.id, name: p.name, builderName: p.builderName });
    setProjectQuery(`${p.name} · ${p.builderName}`);
    setShowProjectResults(false);
    setData((d) => ({
      ...d,
      propertyType: PROJECT_TYPE_TO_FORM[p.type] ?? d.propertyType,
      city: CITIES.includes(p.city) ? p.city : d.city,
      locality: p.area || d.locality,
      price: p.priceMin ? String(p.priceMin) : d.price,
      area: p.sftMin ? String(p.sftMin) : d.area,
      description: p.description || d.description,
      amenities: p.amenities?.length ? [...new Set([...d.amenities, ...p.amenities])] : d.amenities,
      rera: p.reraNo || d.rera,
      title: d.title || `${p.name} — ${p.type} for ${d.purpose} in ${p.city}`,
    }));
    toast.success(`Pre-filled from ${p.name}. Edit and add your own details.`);
  };

  const clearProject = () => {
    setSelectedProject(null);
    setProjectQuery("");
    setProjectTerm("");
  };

  useEffect(() => {
    if (session) {
      setData((d) => ({
        ...d,
        listerName: d.listerName || session.name,
        listerEmail: d.listerEmail || session.email,
      }));
    }
  }, [session]);

  useEffect(() => {
    if (data.bhk && data.propertyType && data.city && !data.title) {
      setData((d) => ({
        ...d,
        title: `${data.bhk} ${data.propertyType} for ${data.purpose} in ${data.city}`,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.bhk, data.propertyType, data.city, data.purpose]);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => {
    setData((d) => ({ ...d, [k]: v }));
    setErrors((e) => (e[k as string] ? { ...e, [k as string]: "" } : e));
  };

  const toggleAmenity = (a: string) =>
    setData((d) => ({
      ...d,
      amenities: d.amenities.includes(a) ? d.amenities.filter((x) => x !== a) : [...d.amenities, a],
    }));

  const validate = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 1 && !data.listerType) e.listerType = "Please select your role";
    if (s === 2) {
      if (!data.propertyType) e.propertyType = "Select a property type";
      if (!data.city) e.city = "Select a city";
      if (!data.price) e.price = "Enter a price";
      if (!data.area) e.area = "Enter property area";
      if (!data.bhk) e.bhk = "Select a configuration";
    }
    if (s === 3) {
      if (!data.description.trim()) e.description = "Add a brief description";
      const reraError = validateRera(data.rera, data.city, data.reraLabel);
      if (reraError) e.rera = reraError;
    }
    if (s === 4) {
      if (!data.listerName.trim()) e.listerName = "Enter your full name";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.listerEmail))
        e.listerEmail = "Enter a valid email";
      if (!/^\d{10}$/.test(data.listerPhone.replace(/\s/g, "")))
        e.listerPhone = "Enter a 10-digit phone number";
    }
    return e;
  };

  const next = async () => {
    const errs = validate(step);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }
    const title = data.title || `${data.bhk} ${data.propertyType} in ${data.city}`;

    // Compress each photo (in submitted order — first is the cover) and upload it
    // to Cloudflare R2, keeping the returned public URL for the DB. If storage is
    // unavailable we fall back to the compressed data URL so the local listing
    // preview still works.
    setUploading(true);
    const hostedImages: string[] = [];
    const previewImages: string[] = [];
    for (const img of images) {
      const dataUrl = await compressImage(img.file);
      previewImages.push(dataUrl);
      try {
        const { url } = await uploadImage.mutateAsync({
          contentType: "image/jpeg",
          data: dataUrl.split(",")[1] ?? "",
          folder: "properties",
        });
        hostedImages.push(url);
      } catch {
        // storage not configured / upload failed — skip from the hosted set
      }
    }
    setUploading(false);
    if (images.length > 0 && hostedImages.length === 0) {
      toast.warning("Photos couldn't be uploaded to storage — saved to this listing only.");
    }

    // Prefer real R2 URLs; fall back to data URLs for the local demo record.
    const listingImages = hostedImages.length ? hostedImages : previewImages;

    // The app stores area in sqft everywhere (search, display, DB) — convert
    // sq. yards input (common for plots) at the point of submission so both
    // the local listing preview and the DB record agree with the rest of the app.
    const areaSqft =
      data.areaUnit === "sqyd"
        ? Math.round((parseInt(data.area) || 0) * 9)
        : parseInt(data.area) || 0;

    const result = submitListing({
      listerType: data.listerType as ListerType,
      propertyType: data.propertyType,
      purpose: data.purpose,
      city: data.city,
      locality: data.locality,
      price: data.price,
      area: String(areaSqft),
      bhk: data.bhk,
      title,
      description: data.description,
      amenities: data.amenities,
      images: listingImages,
      rera: data.rera,
      reraLabel: data.reraLabel || undefined,
      possession: data.possession,
      listerName: data.listerName,
      listerEmail: data.listerEmail,
      listerPhone: data.listerPhone,
    });
    const dbType = DB_TYPE_MAP[data.propertyType];
    if (session && dbType) {
      try {
        await createProperty.mutateAsync({
          title,
          type: dbType,
          purpose: data.purpose,
          price: parseInt(data.price) || 0,
          area: areaSqft,
          builtUpArea: data.builtUpArea ? parseInt(data.builtUpArea) || undefined : undefined,
          bhk: data.bhk || undefined,
          bedrooms: parseBedrooms(data.bhk),
          city: data.city,
          state: "India",
          locality: data.locality || data.city,
          description: data.description || undefined,
          amenities: data.amenities,
          images: hostedImages,
          rera: data.rera,
          possession: data.possession || undefined,
          projectId: selectedProject?.id,
        });
      } catch {
        // DB save failed; local listing still saved above
      }
    }
    setSubmitted(result);
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-emerald-50">
            <CheckCircle2 size={40} className="text-emerald-500" strokeWidth={1.5} />
          </div>
          <div className="font-display text-3xl font-black text-navy sm:text-4xl">
            Property Submitted!
          </div>
          <p className="mt-3 text-muted-foreground">
            Your listing is under review. Our team verifies details and publishes within
            24&nbsp;hours.
          </p>

          <div className="mx-auto mt-6 inline-block rounded-xl border border-border bg-secondary/60 px-6 py-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Submission ID
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-navy">{submitted.id}</div>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-white p-6 text-left shadow-sm">
            {submitted.images.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto">
                {submitted.images.slice(0, 5).map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={`Photo ${i + 1}`}
                    className="h-20 w-28 shrink-0 rounded-lg border border-border object-cover"
                  />
                ))}
              </div>
            )}
            <div className="text-sm font-semibold text-navy">{submitted.title}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-secondary px-2 py-0.5 font-medium">{submitted.city}</span>
              <span className="rounded bg-secondary px-2 py-0.5 font-medium">
                ₹{submitted.price}
              </span>
              <span className="rounded bg-secondary px-2 py-0.5 font-medium">
                {submitted.area} sqft
              </span>
              <span className="rounded bg-accent/10 px-2 py-0.5 font-medium text-accent">
                For {submitted.purpose}
              </span>
            </div>
            <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              We&apos;ll notify you at <strong>{submitted.listerEmail}</strong> once the listing
              goes live.
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:opacity-95"
            >
              Go to Homepage
            </Link>
            <button
              onClick={() => {
                images.forEach((img) => URL.revokeObjectURL(img.url));
                setImages([]);
                setSubmitted(null);
                setStep(1);
                clearProject();
                setData({
                  ...EMPTY,
                  listerName: session?.name ?? "",
                  listerEmail: session?.email ?? "",
                });
              }}
              className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-navy transition hover:bg-secondary"
            >
              List Another Property
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-white p-10 text-center shadow-sm">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <h2 className="font-display text-xl font-black text-navy">Sign in to list your property</h2>
          <p className="mt-2 text-sm text-muted-foreground">You need a Home Seller account to list a property on NxtSft.</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/login" className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white transition hover:opacity-90">
              Sign In
            </Link>
            <Link href="/register" className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-navy transition hover:bg-secondary">
              Register as Home Seller
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (session.role !== "home-seller") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-white p-10 text-center shadow-sm">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <h2 className="font-display text-xl font-black text-navy">Home Sellers only</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Property listings are for Home Seller accounts. If you want to list your property,
            register as a Home Seller.
          </p>
          <Link href="/register" className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white transition hover:opacity-90">
            Register as Home Seller
          </Link>
        </div>
      </div>
    );
  }

  // ── Wizard ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Step progress bar */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6">
          <div className="mb-4 flex justify-end">
            <Link
              href="/list/bulk"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent"
            >
              <Upload size={13} /> Bulk upload multiple
            </Link>
          </div>
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-all
                    ${step > s.num ? "bg-emerald-500 text-white" : step === s.num ? "bg-accent text-white" : "bg-secondary text-muted-foreground"}`}
                  >
                    {step > s.num ? <Check size={14} strokeWidth={3} /> : s.num}
                  </div>
                  <div
                    className={`mt-1 hidden text-[10px] font-semibold uppercase tracking-wide sm:block
                    ${step === s.num ? "text-accent" : "text-muted-foreground"}`}
                  >
                    {s.label}
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 transition-all ${step > s.num ? "bg-emerald-400" : "bg-border"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="animate-fade-up rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
          {/* ─── Step 1: Role ──────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div className="text-xs font-bold uppercase tracking-widest text-accent">
                Step 1 of 4
              </div>
              <h1 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
                What best describes you?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This helps us tailor the listing process to your needs.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    type: "owner" as const,
                    Icon: Home,
                    label: "Individual Owner",
                    desc: "I own a property I want to sell or rent",
                  },
                  {
                    type: "agent" as const,
                    Icon: Briefcase,
                    label: "Agent",
                    desc: "I am a registered real estate agent",
                  },
                  {
                    type: "builder" as const,
                    Icon: Building2,
                    label: "Builder / Developer",
                    desc: "I represent a developer or project",
                  },
                ].map(({ type, Icon, label, desc }) => (
                  <button
                    key={type}
                    onClick={() => set("listerType", type)}
                    className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition hover:border-accent/40 hover:bg-accent/5
                      ${data.listerType === type ? "border-accent bg-accent/8" : "border-border bg-white"}`}
                  >
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-xl transition
                      ${data.listerType === type ? "bg-accent text-white" : "bg-secondary text-navy"}`}
                    >
                      <Icon size={22} />
                    </div>
                    <div>
                      <div
                        className={`text-sm font-bold ${data.listerType === type ? "text-accent" : "text-navy"}`}
                      >
                        {label}
                      </div>
                      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {desc}
                      </div>
                    </div>
                    {data.listerType === type && (
                      <div className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white">
                        Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {errors.listerType && (
                <p className="mt-3 text-xs text-rose-500">{errors.listerType}</p>
              )}
            </>
          )}

          {/* ─── Step 2: Property Details ──────────────────────────────────── */}
          {step === 2 && (
            <>
              <div className="text-xs font-bold uppercase tracking-widest text-accent">
                Step 2 of 4
              </div>
              <h1 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
                Tell us about the property
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Basic details help us list your property in the right category.
              </p>

              {/* ── Project picker — pre-fills from our verified builder directory ── */}
              <div className="mt-6 rounded-2xl border border-accent/25 bg-accent/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-accent" />
                  <span className="text-sm font-bold text-navy">
                    Listing in a known project?
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Optional
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Search our verified builder directory — we&apos;ll pre-fill the details and you just
                  add your own price, area &amp; photos.
                </p>

                {selectedProject ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-navy">
                        <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                        <span className="truncate">{selectedProject.name}</span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        by {selectedProject.builderName}
                      </div>
                    </div>
                    <button
                      onClick={clearProject}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:text-accent"
                    >
                      <X size={12} /> Change
                    </button>
                  </div>
                ) : (
                  <div className="relative mt-3">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      value={projectQuery}
                      onChange={(e) => {
                        setProjectQuery(e.target.value);
                        setShowProjectResults(true);
                      }}
                      onFocus={() => setShowProjectResults(true)}
                      placeholder="Search project or builder name…"
                      className="w-full rounded-xl border border-input bg-white py-2.5 pl-9 pr-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    {showProjectResults && projectTerm.length >= 2 && (
                      <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                        {projectsQ.isLoading ? (
                          <div className="px-4 py-3 text-xs text-muted-foreground">Searching…</div>
                        ) : projectResults.length === 0 ? (
                          <div className="px-4 py-3 text-xs text-muted-foreground">
                            No matching projects. You can fill the details manually below.
                          </div>
                        ) : (
                          <ul className="max-h-64 overflow-y-auto">
                            {projectResults.map((p) => (
                              <li key={p.id}>
                                <button
                                  onClick={() => pickProject(p)}
                                  className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-secondary"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-navy">
                                      <span className="truncate">{p.name}</span>
                                      {p.verified && (
                                        <CheckCircle2 size={11} className="shrink-0 text-emerald-600" />
                                      )}
                                    </div>
                                    <div className="truncate text-xs text-muted-foreground">
                                      {p.builderName} · {[p.area, p.city].filter(Boolean).join(", ")}
                                    </div>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-navy">
                                    {p.type}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-foreground">Property Type</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        // Area was entered in whatever unit the previous type showed
                        // (sq. yards is only offered for Plot) — clear it on type
                        // change so a stale value/unit never gets silently reused.
                        if (t !== data.propertyType) {
                          setData((d) => ({ ...d, propertyType: t, area: "", areaUnit: "sqft" }));
                          setErrors((e) => ({ ...e, propertyType: "", area: "" }));
                        }
                      }}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition
                        ${data.propertyType === t ? "border-accent bg-accent text-white" : "border-border bg-white text-foreground/70 hover:border-accent/40 hover:bg-accent/5"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {errors.propertyType && (
                  <p className="mt-1 text-xs text-rose-500">{errors.propertyType}</p>
                )}
              </div>

              <div className="mt-5">
                <label className="block text-sm font-semibold text-foreground">Purpose</label>
                <div className="mt-2 flex gap-3">
                  {(["Sale", "Rent"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => set("purpose", p)}
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition
                        ${data.purpose === p ? "border-accent bg-accent text-white" : "border-border bg-white text-foreground/70 hover:border-accent/40"}`}
                    >
                      For {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-foreground">City</label>
                  <Select value={data.city || undefined} onValueChange={(v) => set("city", v)}>
                    <SelectTrigger
                      className={`mt-1.5 rounded-xl px-3.5 py-3 ${errors.city ? "border-rose-400" : ""}`}
                    >
                      <SelectValue placeholder="Select city…" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.city && <p className="mt-1 text-xs text-rose-500">{errors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground">
                    Locality <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={data.locality}
                    onChange={(e) => set("locality", e.target.value)}
                    placeholder="e.g. Koramangala, Sector 18…"
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-foreground">Price (₹)</label>
                  <input
                    type="text"
                    value={data.price}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="e.g. 75 Lakh, 1.2 Cr…"
                    className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.price ? "border-rose-400" : "border-input"}`}
                  />
                  {errors.price && <p className="mt-1 text-xs text-rose-500">{errors.price}</p>}
                </div>
                {data.propertyType === "Plot" ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-foreground">Plot Area</label>
                      <div className="flex rounded-lg border border-input bg-secondary p-0.5">
                        {(["sqft", "sqyd"] as const).map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => set("areaUnit", u)}
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition
                              ${data.areaUnit === u ? "bg-white text-navy shadow-sm" : "text-muted-foreground"}`}
                          >
                            {u === "sqft" ? "Sq.Ft" : "Sq.Yards"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      value={data.area}
                      onChange={(e) => set("area", e.target.value)}
                      placeholder={data.areaUnit === "sqft" ? "e.g. 2400" : "e.g. 267"}
                      className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.area ? "border-rose-400" : "border-input"}`}
                    />
                    {errors.area && <p className="mt-1 text-xs text-rose-500">{errors.area}</p>}
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-foreground">
                        Super Built-up Area (sqft)
                      </label>
                      <input
                        type="number"
                        value={data.area}
                        onChange={(e) => set("area", e.target.value)}
                        placeholder="e.g. 1200"
                        className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.area ? "border-rose-400" : "border-input"}`}
                      />
                      {errors.area && <p className="mt-1 text-xs text-rose-500">{errors.area}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground">
                        Built-up Area (sqft)
                      </label>
                      <input
                        type="number"
                        value={data.builtUpArea}
                        onChange={(e) => set("builtUpArea", e.target.value)}
                        placeholder="e.g. 1080"
                        className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-5">
                <label className="block text-sm font-semibold text-foreground">
                  Configuration / BHK
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BHK_OPTIONS.map((b) => (
                    <button
                      key={b}
                      onClick={() => set("bhk", b)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition
                        ${data.bhk === b ? "border-accent bg-accent text-white" : "border-border bg-white text-foreground/70 hover:border-accent/40 hover:bg-accent/5"}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                {errors.bhk && <p className="mt-1 text-xs text-rose-500">{errors.bhk}</p>}
              </div>
            </>
          )}

          {/* ─── Step 3: About the Property ───────────────────────────────── */}
          {step === 3 && (
            <>
              <div className="text-xs font-bold uppercase tracking-widest text-accent">
                Step 3 of 4
              </div>
              <h1 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
                Describe your property
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                More details lead to faster, better-quality inquiries.
              </p>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-foreground">Listing Title</label>
                <input
                  type="text"
                  value={data.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Spacious 3 BHK Apartment near Metro"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                />
              </div>

              <div className="mt-5">
                <label className="block text-sm font-semibold text-foreground">Description</label>
                <textarea
                  value={data.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={4}
                  placeholder="Describe highlights — view, layout, renovations, neighbourhood…"
                  className={`mt-1.5 w-full resize-none rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.description ? "border-rose-400" : "border-input"}`}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-rose-500">{errors.description}</p>
                )}
              </div>

              <div className="mt-5">
                <label className="block text-sm font-semibold text-foreground">
                  Amenities{" "}
                  <span className="font-normal text-muted-foreground">
                    ({data.amenities.length} selected)
                  </span>
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {AMENITIES.map(({ name, Icon }) => {
                    const on = data.amenities.includes(name);
                    return (
                      <button
                        key={name}
                        onClick={() => toggleAmenity(name)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition
                          ${on ? "border-accent bg-accent/8 font-semibold text-accent" : "border-border bg-white text-foreground/70 hover:border-accent/40"}`}
                      >
                        <div
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition ${on ? "border-accent bg-accent" : "border-border"}`}
                        >
                          {on && <Check size={10} strokeWidth={3} className="text-white" />}
                        </div>
                        <Icon size={14} className="shrink-0 text-accent/80" />
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-foreground">RERA / Authority Number</label>
                  <div className="mt-1.5 flex gap-2">
                    <select
                      value={data.reraLabel}
                      onChange={(e) => set("reraLabel", e.target.value)}
                      className="rounded-xl border border-input bg-background px-2 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                    >
                      <option value="RERA">RERA</option>
                      <option value="TS RERA">TS RERA</option>
                      <option value="KA RERA">KA RERA</option>
                      <option value="TN RERA">TN RERA</option>
                      <option value="MahaRERA">MahaRERA</option>
                      <option value="GujRERA">GujRERA</option>
                      <option value="HMDA">HMDA</option>
                      <option value="DTCP">DTCP</option>
                      <option value="BDA">BDA</option>
                      <option value="CMDA">CMDA</option>
                      <option value="Others">Others</option>
                    </select>
                    <input
                      type="text"
                      value={data.rera}
                      onChange={(e) => set("rera", e.target.value)}
                      placeholder="e.g. P51800000053"
                      className={`flex-1 rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.rera ? "border-rose-400" : "border-input"}`}
                    />
                  </div>
                  {errors.rera && <p className="mt-1 text-xs text-rose-500">{errors.rera}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground">
                    Possession <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={data.possession}
                    onChange={(e) => set("possession", e.target.value)}
                    placeholder="e.g. Ready to Move, Dec 2026"
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-semibold text-foreground">
                  Property Photos{" "}
                  <span className="font-normal text-muted-foreground">({images.length} added)</span>
                </label>
                <p className="mt-1 mb-2 text-xs text-muted-foreground">
                  Listings with photos get up to 5× more inquiries. Add a few clear shots.
                </p>
                <ImageUploader images={images} onChange={setImages} max={10} />
              </div>
            </>
          )}

          {/* ─── Step 4: Contact ───────────────────────────────────────────── */}
          {step === 4 && (
            <>
              <div className="text-xs font-bold uppercase tracking-widest text-accent">
                Step 4 of 4
              </div>
              <h1 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
                How can buyers reach you?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your contact details are kept private and shared only with verified buyers.
              </p>

              {session && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span className="text-xs text-emerald-800">
                    Signed in as <strong>{session.name}</strong> — details are pre-filled below.
                  </span>
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground">Full Name</label>
                  <input
                    type="text"
                    value={data.listerName}
                    onChange={(e) => set("listerName", e.target.value)}
                    placeholder="Your full name"
                    className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.listerName ? "border-rose-400" : "border-input"}`}
                  />
                  {errors.listerName && (
                    <p className="mt-1 text-xs text-rose-500">{errors.listerName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground">Email</label>
                  <input
                    type="email"
                    value={data.listerEmail}
                    onChange={(e) => set("listerEmail", e.target.value)}
                    placeholder="your@email.com"
                    className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.listerEmail ? "border-rose-400" : "border-input"}`}
                  />
                  {errors.listerEmail && (
                    <p className="mt-1 text-xs text-rose-500">{errors.listerEmail}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground">
                    Phone Number
                  </label>
                  <div className="mt-1.5 flex">
                    <span className="flex items-center rounded-l-xl border border-r-0 border-input bg-secondary px-3.5 text-sm font-medium text-foreground/60">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={data.listerPhone}
                      onChange={(e) => set("listerPhone", e.target.value)}
                      placeholder="10-digit mobile"
                      maxLength={10}
                      className={`min-w-0 flex-1 rounded-r-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.listerPhone ? "border-rose-400" : "border-input"}`}
                    />
                  </div>
                  {errors.listerPhone && (
                    <p className="mt-1 text-xs text-rose-500">{errors.listerPhone}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-border bg-secondary/50 p-4 text-xs text-muted-foreground">
                By submitting, you agree to NxtSft.com&apos;s{" "}
                <Link href="/terms" className="font-semibold text-accent hover:underline">
                  Terms of Service
                </Link>
                . Our team will verify your listing within 24 hours before it goes live.
              </div>
            </>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center justify-between gap-4">
            <button
              onClick={() => {
                setErrors({});
                setStep((s) => s - 1);
              }}
              disabled={step === 1}
              className="flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition hover:bg-secondary disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <button
              onClick={next}
              disabled={uploading || createProperty.isPending}
              className="flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:opacity-95 disabled:pointer-events-none disabled:opacity-60"
            >
              {step < 4 ? "Next" : uploading ? "Uploading photos…" : "Submit Property"}
              {step < 4 ? <ChevronRight size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          {["RERA-verified listings", "Free to list", "Dedicated relationship manager"].map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" strokeWidth={2.5} />
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
