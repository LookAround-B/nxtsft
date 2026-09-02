"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Download,
  Upload,
  Loader2,
  FileSpreadsheet,
  Check,
  Building2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ImagePlus,
  ImageOff,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { normalizeBulkImportMatrix, type BulkImportMatrix } from "@/lib/bulk-import";
import { trpc } from "@/lib/trpc";
import { validateBulkImportFile, validateImageFile } from "@/lib/file-validation";
import { parseLatLng } from "@/lib/map";
import { BULK_IMPORT_MAX_ROWS } from "@nxtsft/shared/constants";
import { usePresignUploader } from "@/lib/upload";

const MAX_PHOTOS_PER_ROW = 10;
// Mirrors splitUrlList in packages/trpc/src/routers/properties.ts — a sheet may
// separate URLs with any of comma / newline / semicolon / space, and the
// preview must show exactly what the server will store.
const splitImagesCell = (s: string | undefined): string[] =>
  (s ?? "").replace(/&amp;/gi, "&").split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
const imageCount = (s: string | undefined) => splitImagesCell(s).length;

// Sheet cells hold raw rupees ("9500000"); show them grouped so a mistyped
// price is obvious at review time. Non-numeric cells pass through untouched.
const fmtRowPrice = (v: string | undefined): string => {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  if (!v) return "—";
  if (!Number.isFinite(n) || n <= 0) return v;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.00$/, "")} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.00$/, "")} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

// Single source of truth for the bulk template. List order = template column
// order = preview order. Headers, required set, header-matching, the parser and
// the example row all derive from this, so the template and parser can't drift.
type FieldKey =
  | "ownerName"
  | "title" | "description" | "type" | "purpose" | "price" | "area" | "builtUpArea"
  | "bhk" | "bedrooms" | "bathrooms" | "balconies" | "parking" | "furnishing"
  | "facing" | "floors" | "age" | "possession" | "builder" | "reraLabel" | "rera"
  | "city" | "state" | "locality" | "address" | "zipCode" | "mapsLink" | "latitude" | "longitude"
  | "amenities" | "images" | "virtualTourUrl" | "walkthroughVideoUrl"
  | "pgGender" | "pgOccupancy" | "pgAvailableBeds" | "pgDeposit" | "pgRoomTypes"
  | "pgHouseRules" | "pgFood";

type Row = Partial<Record<FieldKey, string>>;

type FieldDef = { key: FieldKey; header: string; required?: boolean; aliases?: string[]; example: string };

const FIELDS: FieldDef[] = [
  // Optional. Blank shows your own name on the listing. Contact unlock always
  // reveals your number regardless — you're the one handling the lead.
  { key: "ownerName", header: "Owner Name", aliases: ["seller name"], example: "" },
  { key: "title", header: "Title", required: true, example: "Spacious 3 BHK Apartment in Whitefield" },
  { key: "description", header: "Description", example: "Sun-facing, near metro, gated society" },
  { key: "type", header: "Type", required: true, example: "Apartment" },
  { key: "purpose", header: "Purpose", required: true, example: "Sale" },
  { key: "price", header: "Price (INR)", required: true, aliases: ["price"], example: "9500000" },
  { key: "area", header: "Area (sqft)", required: true, aliases: ["area", "super built-up area"], example: "1450" },
  { key: "builtUpArea", header: "Built-up Area (sqft)", aliases: ["built-up area", "builtup area"], example: "1300" },
  { key: "bhk", header: "BHK", example: "3 BHK" },
  { key: "bedrooms", header: "Bedrooms", example: "3" },
  { key: "bathrooms", header: "Bathrooms", example: "3" },
  { key: "balconies", header: "Balconies", example: "2" },
  { key: "parking", header: "Parking", example: "1" },
  { key: "furnishing", header: "Furnishing", example: "Semi-Furnished" },
  { key: "facing", header: "Facing", example: "East" },
  { key: "floors", header: "Floors", example: "12" },
  { key: "age", header: "Age", example: "2 years" },
  { key: "possession", header: "Possession", example: "Ready to Move" },
  { key: "builder", header: "Builder", example: "Prestige Group" },
  { key: "reraLabel", header: "RERA Authority", aliases: ["rera authority", "rera label"], example: "KA RERA" },
  { key: "rera", header: "RERA", required: true, aliases: ["rera number"], example: "PRM/KA/RERA/1251/446/PR/12345" },
  { key: "city", header: "City", required: true, example: "Bengaluru" },
  { key: "state", header: "State", required: true, example: "Karnataka" },
  { key: "locality", header: "Locality", required: true, example: "Whitefield" },
  { key: "address", header: "Address", example: "12th Main, Whitefield" },
  { key: "zipCode", header: "Pincode", aliases: ["zipcode", "zip code", "pin code"], example: "560066" },
  { key: "mapsLink", header: "Google Maps Link", aliases: ["maps link", "google maps", "map link", "location link"], example: "https://www.google.com/maps/place/@12.9698,77.7500,17z" },
  { key: "latitude", header: "Latitude", example: "12.9698" },
  { key: "longitude", header: "Longitude", example: "77.7500" },
  { key: "amenities", header: "Amenities", example: "Swimming Pool, Gym, 24/7 Security" },
  // Wide alias set on purpose: an unmatched header is dropped silently (images
  // is optional), which is exactly how imports went live on placeholder covers.
  { key: "images", header: "Image URLs", aliases: ["images", "image url", "photos", "photo url", "photo urls", "images url", "image link", "image links", "pictures", "property images"], example: "" },
  { key: "virtualTourUrl", header: "Virtual Tour URL", aliases: ["virtual tour"], example: "" },
  { key: "walkthroughVideoUrl", header: "Walkthrough Video URL", aliases: ["walkthrough video", "video url"], example: "" },
  { key: "pgGender", header: "PG Gender", example: "" },
  { key: "pgOccupancy", header: "PG Occupancy", example: "" },
  { key: "pgAvailableBeds", header: "PG Available Beds", example: "" },
  { key: "pgDeposit", header: "PG Deposit", example: "" },
  { key: "pgRoomTypes", header: "PG Room Types", example: "" },
  { key: "pgHouseRules", header: "PG House Rules", example: "" },
  { key: "pgFood", header: "PG Food", example: "" },
];

const HEADERS = FIELDS.map((f) => f.header);
const REQUIRED = FIELDS.filter((f) => f.required).map((f) => f.key);

// Header text (lowercased) → field key, including aliases, so slightly-renamed
// columns still map.
const FIELD_BY_HEADER: Record<string, FieldKey> = {};
for (const f of FIELDS) {
  FIELD_BY_HEADER[f.header.toLowerCase()] = f.key;
  for (const a of f.aliases ?? []) FIELD_BY_HEADER[a.toLowerCase()] = f.key;
}

function downloadTemplate() {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = `${HEADERS.map(esc).join(",")}\n${FIELDS.map((f) => esc(f.example)).join(",")}\n`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  a.download = "property-bulk-template.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c !== "\r") cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function rowsFromMatrix(matrix: (string | number | null | boolean)[][]): { rows: Row[]; error?: string; ignored?: string[] } {
  if (!matrix.length) return { rows: [], error: "The file is empty." };
  const header = matrix[0].map((h) => String(h ?? "").trim().toLowerCase());
  const idx: Partial<Record<keyof Row, number>> = {};
  // Unrecognised columns are dropped. Only *required* ones raise an error, so a
  // misspelled optional header (famously "Photos" for "Image URLs") used to
  // vanish without a word — report them instead.
  const ignored: string[] = [];
  header.forEach((h, i) => {
    const f = FIELD_BY_HEADER[h];
    if (f && idx[f] === undefined) idx[f] = i;
    else if (!f && h) ignored.push(String(matrix[0]![i] ?? h).trim());
  });
  const missing = REQUIRED.filter((f) => idx[f] === undefined);
  if (missing.length) {
    const labels = missing.map((k) => FIELDS.find((f) => f.key === k)!.header);
    return { rows: [], error: `Missing required column(s): ${labels.join(", ")}. Download the template.` };
  }
  const cellAt = (r: number, f: FieldKey) =>
    idx[f] !== undefined ? String(matrix[r]?.[idx[f]!] ?? "").trim() : "";

  const rows: Row[] = [];
  for (let r = 1; r < matrix.length; r++) {
    // Skip fully-empty rows; keep partial rows so the server reports their errors.
    if (REQUIRED.every((f) => !cellAt(r, f)) && !cellAt(r, "description")) continue;
    // Only carry non-empty cells — empty optional fields stay undefined so the
    // server's .optional() validators hold.
    const row: Row = {};
    for (const f of FIELDS) {
      const v = cellAt(r, f.key);
      if (v) row[f.key] = v;
    }
    // A pasted Google Maps link fills coordinates when the explicit Latitude /
    // Longitude columns are blank — the same convenience the single-listing and
    // edit forms give. Explicit coordinates always win. (Short goo.gl links
    // can't be resolved without a redirect, so those are left for lat/long.)
    if (row.mapsLink && (!row.latitude || !row.longitude)) {
      const pin = parseLatLng(row.mapsLink);
      if (pin) {
        if (!row.latitude) row.latitude = String(pin.lat);
        if (!row.longitude) row.longitude = String(pin.lng);
      }
    }
    delete row.mapsLink; // server schema has no mapsLink field; it consumes lat/long
    rows.push(row);
  }
  return { rows, ignored };
}

/**
 * One photo in the pre-submit review strip. A plain <img> on purpose — SafeImage
 * silently swaps a stock photo in on error, which is exactly what this view
 * exists to expose: a URL that won't load must LOOK broken to the seller.
 */
function RowPhoto({ url, onRemove }: { url: string; onRemove: () => void }) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={`relative inline-block h-16 w-16 shrink-0 overflow-hidden rounded-lg border align-middle sm:h-20 sm:w-20
        ${broken ? "border-rose-200" : "border-border bg-secondary/40"}`}
    >
      {broken ? (
        <span
          title={`This photo won't load: ${url}`}
          className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-rose-50 px-1 text-center text-rose-600"
        >
          <ImageOff size={16} />
          <span className="text-[9px] font-semibold leading-tight">Won&apos;t load</span>
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          title={url}
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      )}
      {/* Always visible, not hover-only: a hover-gated control is unreachable on
          touch, which is most of this audience. */}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove this photo"
        title="Remove this photo"
        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-navy/70 text-white shadow-sm transition hover:bg-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
      >
        <X size={12} />
      </button>
    </span>
  );
}

export default function BulkListPage() {
  const { session } = useAuth();
  const [parsed, setParsed] = useState<Row[] | null>(null);
  const [parseErr, setParseErr] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [ignoredCols, setIgnoredCols] = useState<string[]>([]);
  const [result, setResult] = useState<{
    created: number;
    failed: number;
    errors: { row: number; message: string }[];
    warnings: { row: number; message: string }[];
  } | null>(null);

  const bulkMut = trpc.properties.bulkCreate.useMutation();
  const storage = trpc.media.storageStatus.useQuery();
  const canPhotos = !!storage.data?.configured;

  // Per-row photo attach: one hidden file input, reused for whichever row's
  // "Add photos" was clicked. Photos upload straight to R2 (presigned PUT) and
  // their URLs are appended to that row's `images` cell — so the seller never
  // touches the CSV's Image URLs column.
  const { upload } = usePresignUploader();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const activeRowRef = useRef<number | null>(null);
  const [rowBusy, setRowBusy] = useState<number | null>(null);

  const pickPhotos = (row: number) => {
    activeRowRef.current = row;
    photoInputRef.current?.click();
  };

  // Drop one photo from a row's cell. Only edits the pending upload in memory —
  // nothing is deleted from storage, since the same URL may be used elsewhere.
  const removePhoto = (row: number, url: string) => {
    setParsed((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const kept = splitImagesCell(next[row]?.images).filter((u) => u !== url);
      next[row] = { ...next[row], images: kept.join(", ") };
      return next;
    });
  };

  const onRowPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    const row = activeRowRef.current;
    if (row === null || picked.length === 0 || !parsed) return;

    const existingCount = imageCount(parsed[row]?.images);
    const room = MAX_PHOTOS_PER_ROW - existingCount;
    if (room <= 0) {
      toast.error(`Up to ${MAX_PHOTOS_PER_ROW} photos per property.`);
      return;
    }
    const valid: File[] = [];
    for (const f of picked) {
      if (valid.length >= room) { toast.error(`Only ${room} more photo(s) fit on this property.`); break; }
      const err = validateImageFile(f);
      if (err) { toast.error(`${f.name}: ${err.message}`); continue; }
      valid.push(f);
    }
    if (!valid.length) return;

    setRowBusy(row);
    try {
      const urls = await upload(valid, "properties");
      setParsed((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        // Re-join through the shared splitter so a sheet that used newlines or
        // semicolons is normalised to the comma form on its way back out.
        const merged = [...splitImagesCell(next[row]?.images), ...urls].join(", ");
        next[row] = { ...next[row], images: merged };
        return next;
      });
      toast.success(`${urls.length} photo(s) added to property ${row + 1}`);
    } catch {
      toast.error("Upload failed — check your connection and try again.");
    } finally {
      setRowBusy(null);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const vErr = validateBulkImportFile(file);
    if (vErr) { setParseErr(vErr.message); return; }

    setParseErr(""); setParsed(null); setResult(null); setIgnoredCols([]); setFileName(file.name); setParsing(true);
    try {
      let matrix: BulkImportMatrix;
      if (file.name.toLowerCase().endsWith(".csv")) {
        matrix = parseCsv(await file.text());
      } else {
        const readXlsxFile = (await import("read-excel-file/browser")).default;
        matrix = normalizeBulkImportMatrix(await readXlsxFile(file));
      }
      const { rows, error, ignored } = rowsFromMatrix(matrix);
      if (error) setParseErr(error);
      else if (!rows.length) setParseErr("No property rows found in the file.");
      else if (rows.length > BULK_IMPORT_MAX_ROWS) setParseErr(`Too many rows — upload up to ${BULK_IMPORT_MAX_ROWS} properties at a time.`);
      else { setParsed(rows); setIgnoredCols(ignored ?? []); }
    } catch {
      setParseErr("Couldn't read this file. Make sure it's a valid .xlsx or .csv matching the template.");
    } finally {
      setParsing(false);
    }
  };

  const submit = () => {
    if (!parsed) return;
    bulkMut.mutate(
      { rows: parsed },
      {
        onSuccess: (res) => {
          setResult(res);
          setParsed(null);
          setIgnoredCols([]);
          setFileName("");
          if (res.created > 0) toast.success(`${res.created} listing(s) submitted for review.`);
          if (res.failed > 0) toast.warning(`${res.failed} row(s) had errors — see below.`);
          if (res.warnings.length > 0) toast.warning(`${res.warnings.length} listing(s) have photo issues — see below.`);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  if (session === undefined) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading…</div>;
  }

  if (!session || !["home-seller", "admin", "super-admin"].includes(session.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-white p-10 text-center shadow-sm">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <h2 className="font-display text-xl font-black text-navy">Home Sellers &amp; admins only</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bulk property upload is for Home Seller or admin accounts.
          </p>
          <Link href={session ? "/" : "/register"} className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white transition hover:opacity-90">
            {session ? "Go home" : "Register as Home Seller"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/list" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-accent">
          <ArrowLeft size={15} /> Back to single listing
        </Link>

        <h1 className="mt-4 font-display text-3xl font-black text-navy">Bulk upload properties</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload an Excel (.xlsx) or CSV file to list many properties at once, then attach photos to
          each property right here — no need to host images yourself or fill the Image URLs column.
          Listings are submitted for admin review before going live.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-navy">1 · Get the template</h2>
            <button
              onClick={downloadTemplate}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy transition hover:border-accent hover:bg-accent/5 hover:text-accent"
            >
              <Download size={15} /> Download CSV template
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Required: <strong>Title, Type, Purpose, Price, Area, RERA, City, State, Locality</strong>.
            Every other column is optional — leave blank cells empty. Type must be one of
            Apartment · Villa · Studio · Office · Bungalow · Plot · PG. Purpose is Sale or Rent.
            Title needs at least 10 characters. RERA is validated per state. Comma-separate
            Amenities / Image URLs / PG lists. If you leave <strong>Image URLs</strong> blank, a
            default cover for the property type is used automatically.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Prefer to prepare photos separately?{" "}
            <Link href="/list/photos" className="font-semibold text-accent underline underline-offset-2">
              Bulk-upload photos and get their URLs
            </Link>{" "}
            to paste into the Image URLs column.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-base font-bold text-navy">2 · Upload your file</h2>
          <div className="mt-4 rounded-xl border border-dashed border-border bg-secondary/20 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-accent-foreground transition hover:opacity-90 sm:w-auto">
                {parsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {parsing ? "Reading…" : "Choose .xlsx / .csv"}
                <input type="file" accept=".xlsx,.csv" onChange={onFile} className="hidden" disabled={parsing} />
              </label>
              {fileName && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileSpreadsheet size={14} /> {fileName}
                </span>
              )}
            </div>

            {parseErr && (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">{parseErr}</p>
            )}

            {ignoredCols.length > 0 && (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                <AlertTriangle size={14} className="mt-px shrink-0" />
                <span>
                  Ignored column(s): <strong>{ignoredCols.join(", ")}</strong>. These headers don&apos;t match the
                  template, so their values won&apos;t be imported — check the spelling (photo columns must be titled
                  <strong> Image URLs</strong>).
                </span>
              </p>
            )}

            {parsed && (
              <div className="mt-4 rounded-xl border border-border bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-navy">
                      {parsed.length.toLocaleString("en-IN")} propert{parsed.length === 1 ? "y" : "ies"} ready
                    </p>
                    {canPhotos && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {(() => {
                          const without = parsed.filter((r) => imageCount(r.images) === 0).length;
                          if (without === 0) return "Every property has photos attached.";
                          return `${without} of ${parsed.length} ${without === 1 ? "has" : "have"} no photos yet — those go live on a default cover.`;
                        })()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-1 gap-2 sm:flex-none">
                    <button
                      onClick={() => { setParsed(null); setFileName(""); }}
                      className="min-h-[42px] flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-navy/30 hover:text-navy sm:flex-none"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submit}
                      disabled={bulkMut.isPending || rowBusy !== null}
                      className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                    >
                      {bulkMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                      Submit {parsed.length.toLocaleString("en-IN")}
                    </button>
                  </div>
                </div>

                {canPhotos && (
                  <p className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    Each thumbnail below is exactly what buyers will see. A photo that won&apos;t load
                    shows in red — tap <span className="font-semibold text-navy">✕</span> to remove it.
                    Photos added here are compressed and watermarked automatically.
                  </p>
                )}

                {/* Shared hidden input — reused for whichever row's Add button was clicked. */}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={onRowPhotos}
                />

                {/* One card per row rather than a 6-column table: the page is
                    max-w-3xl, and the photo strip needs full width to be
                    reviewable. Cards also give every control a real tap target. */}
                <div className="mt-4 max-h-[32rem] space-y-2.5 overflow-auto pr-1">
                  {parsed.map((r, i) => {
                    const photos = splitImagesCell(r.images);
                    const count = photos.length;
                    const busy = rowBusy === i;
                    return (
                      <div
                        key={i}
                        className="rounded-xl border border-border bg-white p-3.5 transition hover:border-accent/40 sm:p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold text-muted-foreground">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-navy">{r.title || "Untitled listing"}</p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                              <span>{r.type || "—"}</span>
                              <span aria-hidden>·</span>
                              <span className="font-medium text-foreground/80">{fmtRowPrice(r.price)}</span>
                              <span aria-hidden>·</span>
                              <span>{r.city || "—"}</span>
                            </p>
                          </div>
                        </div>

                        {canPhotos && (
                          <div className="mt-3 border-t border-border/70 pt-3">
                            {count > 0 && (
                              <div className="mb-2.5 flex flex-wrap gap-2">
                                {photos.map((url) => (
                                  <RowPhoto key={url} url={url} onRemove={() => removePhoto(i, url)} />
                                ))}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => pickPhotos(i)}
                                disabled={rowBusy !== null}
                                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50
                                  ${count > 0
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
                                    : "border-border bg-white text-navy hover:border-accent hover:text-accent"}`}
                              >
                                {busy ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : count > 0 ? (
                                  <ImagePlus size={14} />
                                ) : (
                                  <ImagePlus size={14} />
                                )}
                                {busy ? "Uploading…" : count > 0 ? "Add more photos" : "Add photos"}
                              </button>

                              {count > 0 ? (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                                  <Check size={13} /> {count} photo{count > 1 ? "s" : ""} attached
                                </span>
                              ) : (
                                !busy && (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
                                    <AlertTriangle size={13} /> No photos — default cover will be used
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>              </div>
            )}
          </div>
        </div>

        {result && (
          <div className="mt-5 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              {result.failed === 0 ? (
                <CheckCircle2 className="text-emerald-500" size={20} />
              ) : (
                <AlertTriangle className="text-amber-500" size={20} />
              )}
              <h2 className="font-display text-base font-bold text-navy">
                {result.created} submitted for review
                {result.failed > 0 && ` · ${result.failed} failed`}
                {result.warnings.length > 0 && ` · ${result.warnings.length} with photo issues`}
              </h2>
            </div>
            {result.created > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                Submitted listings are pending admin approval. Track them in{" "}
                <Link href="/user-portal#listings" className="font-semibold text-accent underline underline-offset-2">My Listings</Link>.
              </p>
            )}
            {result.warnings.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg border border-amber-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-50 text-[11px] uppercase tracking-wide text-amber-700">
                    <tr><th className="px-3 py-2">Sheet row</th><th className="px-3 py-2">Submitted, but note</th></tr>
                  </thead>
                  <tbody>
                    {result.warnings.map((w, i) => (
                      <tr key={i} className="border-t border-amber-100">
                        <td className="px-3 py-1.5 font-mono">{w.row}</td>
                        <td className="px-3 py-1.5 text-foreground/80">{w.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg border border-rose-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-rose-50 text-[11px] uppercase tracking-wide text-rose-600">
                    <tr><th className="px-3 py-2">Sheet row</th><th className="px-3 py-2">Problem</th></tr>
                  </thead>
                  <tbody>
                    {result.errors.map((er, i) => (
                      <tr key={i} className="border-t border-rose-100">
                        <td className="px-3 py-1.5 font-mono">{er.row}</td>
                        <td className="px-3 py-1.5 text-foreground/80">{er.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
