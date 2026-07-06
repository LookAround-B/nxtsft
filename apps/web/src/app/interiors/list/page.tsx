"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Sofa, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { ImageUploader, type UploadImage } from "@/components/ui/ImageUploader";
import { compressImage } from "@/lib/image";

const CITIES = ["Mumbai", "Bengaluru", "Delhi NCR", "Hyderabad", "Pune", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Noida", "Gurgaon", "Kochi", "Other"];
const DESIGN_STYLES = ["Modern", "Minimal", "Luxury", "Contemporary", "Traditional", "Industrial"];

type FormData = {
  companyName: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  description: string;
  designStyles: string[];
  yearsExperience: string;
  startingBudget: string;
  website: string;
  workingHours: string;
};

const EMPTY: FormData = {
  companyName: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  description: "",
  designStyles: [],
  yearsExperience: "",
  startingBudget: "",
  website: "",
  workingHours: "",
};

export default function ListInteriorBusinessPage() {
  const { session } = useAuth();
  const [data, setData] = useState<FormData>(EMPTY);
  const [images, setImages] = useState<UploadImage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const uploadImage = trpc.media.uploadImage.useMutation();
  const submitDesigner = trpc.interiorDesigners.submit.useMutation();

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  const toggleStyle = (s: string) =>
    setData((d) => ({
      ...d,
      designStyles: d.designStyles.includes(s)
        ? d.designStyles.filter((x) => x !== s)
        : [...d.designStyles, s],
    }));

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Sofa size={32} className="mx-auto mb-3 text-muted-foreground/40" />
        <h1 className="font-display text-xl font-bold text-navy">Sign in to list your business</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create an account or sign in to submit your interior design company for review.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-500" />
        <h1 className="font-display text-xl font-bold text-navy">Submitted for review!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Our team will verify your details and publish your listing on the Home Interiors directory soon.
        </p>
        <Link
          href="/interiors"
          className="mt-5 inline-block rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Back to Home Interiors
        </Link>
      </div>
    );
  }

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (data.companyName.trim().length < 2) e.companyName = "Enter your company name";
    if (!data.city) e.city = "Select a city";
    if (!/^[6-9]\d{9}$/.test(data.phone.replace(/\s/g, ""))) e.phone = "Enter a valid 10-digit mobile number";
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = "Enter a valid email";
    return e;
  };

  const submit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});

    setUploading(true);
    const hostedImages: string[] = [];
    for (const img of images) {
      const dataUrl = await compressImage(img.file, undefined, undefined, { watermark: true });
      try {
        const { url } = await uploadImage.mutateAsync({
          contentType: "image/jpeg",
          data: dataUrl.split(",")[1] ?? "",
          folder: "interiors",
        });
        hostedImages.push(url);
      } catch {
        // storage unavailable — skip from the portfolio set
      }
    }
    setUploading(false);
    if (images.length > 0 && hostedImages.length === 0) {
      toast.warning("Portfolio photos couldn't be uploaded — submitting without them.");
    }

    try {
      await submitDesigner.mutateAsync({
        companyName: data.companyName.trim(),
        city: data.city,
        state: data.state.trim() || undefined,
        phone: data.phone,
        email: data.email.trim() || undefined,
        description: data.description.trim() || undefined,
        designStyles: data.designStyles,
        yearsExperience: data.yearsExperience ? parseInt(data.yearsExperience) || undefined : undefined,
        startingBudget: data.startingBudget ? parseInt(data.startingBudget) || undefined : undefined,
        website: data.website.trim() || undefined,
        workingHours: data.workingHours.trim() || undefined,
        portfolioImages: hostedImages,
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit your listing — please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/interiors" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-accent">
        <ArrowLeft size={15} />
        Back to Home Interiors
      </Link>

      <h1 className="mt-4 font-display text-2xl font-black text-navy">List Your Interior Design Business</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Submit your company for review — once approved, it goes live on the Home Interiors directory.
      </p>

      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <div>
          <label className="block text-sm font-semibold text-foreground">Company name</label>
          <input
            value={data.companyName}
            onChange={set("companyName")}
            placeholder="e.g. Studio Nest Interiors"
            className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.companyName ? "border-rose-400" : "border-input"}`}
          />
          {errors.companyName && <p className="mt-1 text-xs text-rose-500">{errors.companyName}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-foreground">City</label>
            <select
              value={data.city}
              onChange={set("city")}
              className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.city ? "border-rose-400" : "border-input"}`}
            >
              <option value="">Select city</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.city && <p className="mt-1 text-xs text-rose-500">{errors.city}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground">State (optional)</label>
            <input
              value={data.state}
              onChange={set("state")}
              placeholder="e.g. Maharashtra"
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-foreground">Phone</label>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => setData((d) => ({ ...d, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
              placeholder="10-digit mobile"
              className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.phone ? "border-rose-400" : "border-input"}`}
            />
            {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground">Email (optional)</label>
            <input
              type="email"
              value={data.email}
              onChange={set("email")}
              placeholder="you@company.com"
              className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${errors.email ? "border-rose-400" : "border-input"}`}
            />
            {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground">Description (optional)</label>
          <textarea
            value={data.description}
            onChange={set("description")}
            rows={3}
            placeholder="Tell buyers about your design philosophy and specialties…"
            className="mt-1.5 w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground">Design styles</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {DESIGN_STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleStyle(s)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition
                  ${data.designStyles.includes(s) ? "border-accent bg-accent text-white" : "border-border bg-white text-foreground/70 hover:border-accent/40 hover:bg-accent/5"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-foreground">Years of experience (optional)</label>
            <input
              type="number"
              value={data.yearsExperience}
              onChange={set("yearsExperience")}
              placeholder="e.g. 8"
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground">Starting budget (₹, optional)</label>
            <input
              type="number"
              value={data.startingBudget}
              onChange={set("startingBudget")}
              placeholder="e.g. 200000"
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-foreground">Website (optional)</label>
            <input
              value={data.website}
              onChange={set("website")}
              placeholder="https://…"
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground">Working hours (optional)</label>
            <input
              value={data.workingHours}
              onChange={set("workingHours")}
              placeholder="Mon–Sat 10am–7pm"
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground">Portfolio photos (optional)</label>
          <div className="mt-1.5">
            <ImageUploader images={images} onChange={setImages} max={10} />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={uploading || submitDesigner.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-3.5 font-display text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
        >
          {uploading ? "Uploading photos…" : submitDesigner.isPending ? "Submitting…" : "Submit for Review"}
        </button>
      </div>
    </div>
  );
}
