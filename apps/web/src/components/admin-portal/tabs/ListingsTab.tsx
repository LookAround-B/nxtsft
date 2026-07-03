"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Mail, Phone, Star, CheckCircle2, XCircle, ChevronDown, ChevronUp, Rocket, ShieldCheck, Pencil, MapPin } from "lucide-react";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { parseLatLng } from "@/lib/map";
import { getPendingListings, updateListingStatus as persistListingStatus } from "@/lib/listings";
import { PageHead } from "./PageHead";

// Authority labels shown before the registration number (mirrors the /list form).
const RERA_LABELS = ["RERA", "TS RERA", "KA RERA", "TN RERA", "MahaRERA", "GujRERA", "HMDA", "DTCP", "BDA", "CMDA", "Others"];

type ListingItem = {
  id: string;
  title: string;
  image: string;
  builder: string;
  city: string;
  priceLabel: string;
  bhk: string;
  status: "Pending" | "Approved" | "Rejected";
  isUserSubmission?: boolean;
  isDbProperty?: boolean;
  rera?: string | null;
  reraLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locality?: string;
  listerEmail?: string;
  listerPhone?: string;
  submittedAt?: string;
  purpose?: string;
  area?: string;
  interested?: number;
  wishlisted?: number;
  featured?: boolean;
};

type RawProp = {
  id: string;
  title: string;
  images: string[];
  description: string | null;
  amenities: string[];
  owner: { name: string } | null;
  location: { city: string; latitude: number; longitude: number } | null;
  price: number;
  bhk: string | null;
  status: string;
  rera: string | null;
  reraLabel: string | null;
  slug: string;
  featured: boolean;
  _count?: { leads: number; favoritedBy: number };
};

// ─── Promote Checklist ────────────────────────────────────────────────────────
function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${ok ? "text-emerald-700" : "text-muted-foreground"}`}>
      {ok ? <CheckCircle2 size={13} className="text-emerald-500" /> : <XCircle size={13} className="text-muted-foreground/50" />}
      {label}
    </div>
  );
}

function PromoteChecklist({
  it,
  rawProp,
  onPromote,
  onClose,
}: {
  it: ListingItem;
  rawProp: RawProp | undefined;
  onPromote: () => void;
  onClose: () => void;
}) {
  const checks = rawProp
    ? [
        { label: "Has images", ok: (rawProp.images?.length ?? 0) > 0 },
        { label: "Has description", ok: !!rawProp.description },
        { label: "Has RERA number", ok: !!rawProp.rera },
        { label: "Has amenities", ok: (rawProp.amenities?.length ?? 0) > 0 },
        { label: "Has location", ok: !!rawProp.location?.city },
        { label: "Has leads / interest", ok: (rawProp._count?.leads ?? 0) > 0 },
      ]
    : [];
  const score = checks.filter((c) => c.ok).length;
  const ready = score >= 4;

  return (
    <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-navy">Promote Checklist</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>
      <div className="space-y-1">
        {checks.map((c) => <CheckRow key={c.label} label={c.label} ok={c.ok} />)}
      </div>
      <div className={`text-xs font-bold ${ready ? "text-emerald-600" : "text-amber-600"}`}>
        Readiness: {score}/{checks.length} {ready ? "✓ Ready to promote" : "— Complete more items first"}
      </div>
      <button
        onClick={onPromote}
        className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
          it.featured
            ? "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            : "bg-accent text-white hover:opacity-90"
        }`}
      >
        <Rocket size={12} />
        {it.featured ? "Remove from Home Page" : "Promote to Home Page"}
      </button>
    </div>
  );
}

// ─── Seller Edit Requests ─────────────────────────────────────────────────────
// Fields a seller can propose changes to, with human labels + how to render them.
const EDIT_FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  price: "Price (₹)",
  area: "Area (sqft)",
  builtUpArea: "Built-up Area (sqft)",
  bhk: "Configuration",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  balconies: "Balconies",
  parking: "Parking",
  furnishing: "Furnishing",
  facing: "Facing",
  possession: "Possession",
  rera: "RERA Number",
  reraLabel: "RERA Authority",
  amenities: "Amenities",
  images: "Photos",
  locality: "Locality",
  latitude: "Latitude",
  longitude: "Longitude",
};

type EditRequest = {
  id: string;
  changes: Record<string, unknown>;
  createdAt: string;
  owner: { name: string; email: string } | null;
  property: {
    id: string;
    title: string;
    price: number;
    area: number;
    builtUpArea: number | null;
    bhk: string | null;
    description: string | null;
    furnishing: string | null;
    facing: string | null;
    possession: string | null;
    rera: string | null;
    reraLabel: string | null;
    bedrooms: number;
    bathrooms: number;
    balconies: number;
    parking: number;
    amenities: string[];
    images: string[];
    location: { city: string; locality: string | null; latitude: number | null; longitude: number | null } | null;
  };
};

// Show the listing's current value for a field so admins see a before → after diff.
function currentValue(req: EditRequest, key: string): unknown {
  const p = req.property;
  switch (key) {
    case "locality": return p.location?.locality;
    case "latitude": return p.location?.latitude;
    case "longitude": return p.location?.longitude;
    default: return (p as unknown as Record<string, unknown>)[key];
  }
}

function fmtVal(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.length ? `${v.length} item(s): ${v.join(", ")}` : "none";
  return String(v);
}

function EditRequestsSection() {
  const requestsQ = trpc.admin.properties.editRequests.list.useQuery({ limit: 50 });
  const approve = trpc.admin.properties.editRequests.approve.useMutation({
    onSuccess: () => {
      void requestsQ.refetch();
      toast.success("Changes approved and applied to the listing.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const reject = trpc.admin.properties.editRequests.reject.useMutation({
    onSuccess: () => {
      void requestsQ.refetch();
      toast.success("Edit request rejected.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const requests = (requestsQ.data?.items ?? []) as unknown as EditRequest[];
  if (requestsQ.isLoading || requests.length === 0) {
    return (
      <Section title="Seller Edit Requests">
        <p className="py-6 text-center text-sm text-muted-foreground">
          {requestsQ.isLoading ? "Loading…" : "No pending edit requests."}
        </p>
      </Section>
    );
  }

  return (
    <Section title={`Seller Edit Requests (${requests.length})`}>
      <div className="space-y-4">
        {requests.map((req) => {
          const keys = Object.keys(req.changes).filter((k) => k in EDIT_FIELD_LABELS);
          const busy = approve.isPending || reject.isPending;
          return (
            <div key={req.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-navy">{req.property.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {req.owner?.name ?? "Owner"} · {req.owner?.email ?? ""} ·{" "}
                    {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  {keys.length} field(s)
                </span>
              </div>

              <div className="mt-3 overflow-hidden rounded-lg border border-border bg-white">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-1.5 font-semibold">Field</th>
                      <th className="px-3 py-1.5 font-semibold">Current</th>
                      <th className="px-3 py-1.5 font-semibold">Proposed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k} className="border-b border-border last:border-0 align-top">
                        <td className="px-3 py-1.5 font-medium text-navy">{EDIT_FIELD_LABELS[k]}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{fmtVal(currentValue(req, k))}</td>
                        <td className="px-3 py-1.5 font-medium text-emerald-700">{fmtVal(req.changes[k])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => approve.mutate({ id: req.id })}
                  disabled={busy}
                  className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-40"
                >
                  Approve &amp; publish
                </button>
                <button
                  onClick={() => reject.mutate({ id: req.id })}
                  disabled={busy}
                  className="rounded-md border border-border px-3 py-1 text-xs font-semibold transition hover:bg-secondary disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function ListingsTab() {
  const dbListingsQ = trpc.admin.properties.list.useQuery({ limit: 50 });
  const approveMutation = trpc.admin.properties.approve.useMutation({
    onSuccess: () => {
      void dbListingsQ.refetch();
      toast.success("Property approved and set to Active.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const featuredMutation = trpc.properties.toggleFeatured.useMutation({
    onSuccess: (res) => {
      void dbListingsQ.refetch();
      toast.success(res.featured ? "Pushed to home page." : "Removed from home page.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const reraMutation = trpc.properties.update.useMutation({
    onSuccess: () => {
      void dbListingsQ.refetch();
      setReraEditing(null);
      toast.success("RERA details updated.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const coordMutation = trpc.properties.update.useMutation({
    onSuccess: () => {
      void dbListingsQ.refetch();
      setCoordEditing(null);
      toast.success("Location coordinates updated.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const [localItems, setLocalItems] = useState<ListingItem[]>([]);
  const [checklistOpen, setChecklistOpen] = useState<string | null>(null);
  // Property id whose RERA is being edited, plus the working input values.
  const [reraEditing, setReraEditing] = useState<string | null>(null);
  const [reraValue, setReraValue] = useState("");
  const [reraLabelValue, setReraLabelValue] = useState("RERA");

  const openReraEditor = (it: ListingItem) => {
    setReraEditing(it.id);
    setReraValue(it.rera ?? "");
    setReraLabelValue(it.reraLabel ?? "RERA");
  };
  const saveRera = (id: string) => {
    reraMutation.mutate({ id, rera: reraValue.trim(), reraLabel: reraLabelValue });
  };

  // Property id whose coordinates are being edited, plus the working values.
  const [coordEditing, setCoordEditing] = useState<string | null>(null);
  const [latValue, setLatValue] = useState("");
  const [lngValue, setLngValue] = useState("");

  const openCoordEditor = (it: ListingItem) => {
    setCoordEditing(it.id);
    setLatValue(it.latitude != null && it.latitude !== 0 ? String(it.latitude) : "");
    setLngValue(it.longitude != null && it.longitude !== 0 ? String(it.longitude) : "");
  };
  // Paste a Google Maps link / "lat, lng" → fill both fields.
  const pinCoordFromLink = (value: string) => {
    const parsed = parseLatLng(value);
    if (parsed) {
      setLatValue(String(parsed.lat));
      setLngValue(String(parsed.lng));
    } else {
      toast.error("Couldn't read coordinates — paste a full Google Maps URL or 'lat, lng'.");
    }
  };
  const saveCoords = (id: string) => {
    const lat = parseFloat(latValue);
    const lng = parseFloat(lngValue);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error("Enter a valid latitude and longitude.");
      return;
    }
    coordMutation.mutate({ id, latitude: lat, longitude: lng });
  };

  useEffect(() => {
    const userSubs: ListingItem[] = getPendingListings().map((l) => ({
      id: l.id,
      title: l.title || `${l.bhk} ${l.propertyType} in ${l.city}`,
      image: l.images?.[0] ?? "",
      builder: l.listerName,
      city: l.city,
      priceLabel: `₹${l.price}`,
      bhk: l.bhk,
      status:
        l.status === "pending" ? "Pending" : l.status === "approved" ? "Approved" : "Rejected",
      isUserSubmission: true,
      locality: l.locality,
      listerEmail: l.listerEmail,
      listerPhone: l.listerPhone,
      submittedAt: l.submittedAt,
      purpose: l.purpose,
      area: l.area,
    }));
    setLocalItems(userSubs);
  }, []);

  const rawProps = (dbListingsQ.data?.items ?? []) as RawProp[];
  const dbItems: ListingItem[] = rawProps.map((p) => ({
    id: p.id,
    title: p.title,
    image: p.images?.[0] ?? "",
    builder: p.owner?.name ?? "",
    city: p.location?.city ?? "",
    priceLabel:
      p.price >= 1e7
        ? `₹${(p.price / 1e7).toFixed(2)} Cr`
        : p.price >= 1e5
          ? `₹${(p.price / 1e5).toFixed(1)} L`
          : `₹${p.price.toLocaleString("en-IN")}`,
    bhk: p.bhk ?? "",
    status: (p.status === "Active"
      ? "Approved"
      : p.status === "Sold" || p.status === "Rented"
        ? "Approved"
        : "Pending") as "Pending" | "Approved" | "Rejected",
    isDbProperty: true,
    rera: p.rera,
    reraLabel: p.reraLabel,
    latitude: p.location?.latitude,
    longitude: p.location?.longitude,
    interested: p._count?.leads ?? 0,
    wishlisted: p._count?.favoritedBy ?? 0,
    featured: p.featured,
  }));

  const items = [...localItems, ...dbItems];

  const approve = (it: ListingItem) => {
    if (it.isUserSubmission) {
      setLocalItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, status: "Approved" } : x)));
      persistListingStatus(it.id, "approved");
      toast.success(`Approved: ${it.title}`);
    } else {
      approveMutation.mutate({ id: it.id });
    }
  };

  const reject = (it: ListingItem) => {
    if (it.isUserSubmission) {
      setLocalItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, status: "Rejected" } : x)));
      persistListingStatus(it.id, "rejected");
    }
    toast.error(`Rejected: ${it.title}`);
  };

  const counts = {
    pending: items.filter((i) => i.status === "Pending").length,
    approved: items.filter((i) => i.status === "Approved").length,
    rejected: items.filter((i) => i.status === "Rejected").length,
    user: items.filter((i) => i.isUserSubmission).length,
  };

  return (
    <>
      <PageHead
        title="Listings Approvals"
        subtitle="Moderate property submissions before they go live."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Pending"
          value={String(counts.pending)}
          sub="Awaiting review"
          accent="text-amber-600"
        />
        <StatCard label="Approved" value={String(counts.approved)} sub="Live on site" />
        <StatCard
          label="Rejected"
          value={String(counts.rejected)}
          sub="Needs re-submission"
          accent="text-accent"
        />
        <StatCard
          label="User Submissions"
          value={String(counts.user)}
          sub="From /list form"
          accent="text-blue-600"
        />
      </div>
      <EditRequestsSection />
      <Section title="All Submissions">
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <div
              key={it.id}
              className={`rounded-xl border p-4 ${it.isUserSubmission ? "border-blue-200 bg-blue-50/30" : "border-border"}`}
            >
              <div className="flex gap-3">
                {it.image ? (
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg">
                    <Image src={it.image} alt="" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="grid h-20 w-28 shrink-0 place-items-center rounded-lg bg-navy/8 text-xs font-semibold text-navy/40">
                    No image
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-1.5">
                    {it.isUserSubmission && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        User Submission
                      </span>
                    )}
                    <Badge
                      tone={
                        it.status === "Approved"
                          ? "success"
                          : it.status === "Rejected"
                            ? "hot"
                            : "warm"
                      }
                    >
                      {it.status}
                    </Badge>
                    {it.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        <Star size={9} className="fill-current" /> On Home
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-navy">{it.title}</div>
                  <div className="text-xs text-muted-foreground">{it.builder}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-navy">
                      {it.city}
                    </span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-navy">
                      {it.priceLabel}
                    </span>
                    {it.bhk && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-semibold text-navy">
                        {it.bhk}
                      </span>
                    )}
                    {it.purpose && (
                      <span className="rounded bg-accent/10 px-1.5 py-0.5 font-medium text-accent">
                        For {it.purpose}
                      </span>
                    )}
                    {it.isDbProperty && (
                      <>
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">
                          {it.interested ?? 0} interested
                        </span>
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-600">
                          {it.wishlisted ?? 0} wishlisted
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {it.isDbProperty && (
                <div className="mt-3 border-t border-border pt-3">
                  {reraEditing === it.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={reraLabelValue}
                        onChange={(e) => setReraLabelValue(e.target.value)}
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      >
                        {RERA_LABELS.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                      <input
                        value={reraValue}
                        onChange={(e) => setReraValue(e.target.value)}
                        placeholder="Registration number"
                        className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 font-mono text-xs"
                      />
                      <button
                        onClick={() => saveRera(it.id)}
                        disabled={reraMutation.isPending}
                        className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setReraEditing(null)}
                        className="rounded-md border border-border px-3 py-1 text-xs font-semibold transition hover:bg-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      <ShieldCheck
                        size={13}
                        className={it.rera ? "text-emerald-500" : "text-muted-foreground/40"}
                      />
                      {it.rera ? (
                        <span className="font-medium text-navy">
                          {it.reraLabel ?? "RERA"} · <span className="font-mono">{it.rera}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No RERA number</span>
                      )}
                      <button
                        onClick={() => openReraEditor(it)}
                        className="ml-auto inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 font-semibold transition hover:bg-secondary"
                      >
                        <Pencil size={11} /> Edit RERA
                      </button>
                    </div>
                  )}
                </div>
              )}

              {it.isDbProperty && (
                <div className="mt-3 border-t border-border pt-3">
                  {coordEditing === it.id ? (
                    <div className="space-y-2">
                      <input
                        onPaste={(e) => {
                          const text = e.clipboardData.getData("text");
                          if (text) {
                            pinCoordFromLink(text);
                            e.preventDefault();
                          }
                        }}
                        placeholder="Paste Google Maps link or '19.017, 72.812'"
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={latValue}
                          onChange={(e) => setLatValue(e.target.value)}
                          inputMode="decimal"
                          placeholder="Latitude"
                          className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 font-mono text-xs"
                        />
                        <input
                          value={lngValue}
                          onChange={(e) => setLngValue(e.target.value)}
                          inputMode="decimal"
                          placeholder="Longitude"
                          className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 font-mono text-xs"
                        />
                        <button
                          onClick={() => saveCoords(it.id)}
                          disabled={coordMutation.isPending}
                          className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setCoordEditing(null)}
                          className="rounded-md border border-border px-3 py-1 text-xs font-semibold transition hover:bg-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      <MapPin
                        size={13}
                        className={it.latitude && it.longitude ? "text-emerald-500" : "text-muted-foreground/40"}
                      />
                      {it.latitude && it.longitude ? (
                        <span className="font-mono text-navy">
                          {it.latitude.toFixed(5)}, {it.longitude.toFixed(5)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No exact coordinates</span>
                      )}
                      <button
                        onClick={() => openCoordEditor(it)}
                        className="ml-auto inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 font-semibold transition hover:bg-secondary"
                      >
                        <Pencil size={11} /> Edit Location
                      </button>
                    </div>
                  )}
                </div>
              )}

              {it.isUserSubmission && (it.listerEmail || it.listerPhone) && (
                <div className="mt-3 flex flex-wrap gap-3 border-t border-blue-100 pt-3 text-xs text-muted-foreground">
                  {it.listerEmail && (
                    <span className="flex items-center gap-1">
                      <Mail size={11} className="text-accent" />
                      {it.listerEmail}
                    </span>
                  )}
                  {it.listerPhone && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} className="text-accent" />
                      +91 {it.listerPhone}
                    </span>
                  )}
                  {it.submittedAt && (
                    <span className="ml-auto text-[10px]">
                      {new Date(it.submittedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => approve(it)}
                  disabled={it.status === "Approved"}
                  className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  onClick={() => reject(it)}
                  disabled={it.status === "Rejected"}
                  className="rounded-md border border-border px-3 py-1 text-xs font-semibold transition hover:bg-secondary disabled:opacity-40"
                >
                  Reject
                </button>
                {it.isDbProperty && (
                  <button
                    onClick={() => setChecklistOpen(checklistOpen === it.id ? null : it.id)}
                    className={`ml-auto inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition ${
                      it.featured
                        ? "bg-amber-50 text-amber-700 border border-amber-300"
                        : "border border-border hover:bg-secondary"
                    }`}
                  >
                    <Rocket size={11} />
                    Promote
                    {checklistOpen === it.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                )}
              </div>

              {it.isDbProperty && checklistOpen === it.id && (
                <PromoteChecklist
                  it={it}
                  rawProp={rawProps.find((p) => p.id === it.id)}
                  onPromote={() => {
                    featuredMutation.mutate({ id: it.id, featured: !it.featured });
                    setChecklistOpen(null);
                  }}
                  onClose={() => setChecklistOpen(null)}
                />
              )}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
