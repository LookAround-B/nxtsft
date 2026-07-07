"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Upload, Loader2, FileSpreadsheet, Check, CheckCircle2, AlertTriangle, Pencil, ExternalLink } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { validateBulkImportFile } from "@/lib/file-validation";
import { PageHead } from "./PageHead";

// Admin-only variant of the seller bulk-upload template (apps/web/src/app/list/bulk/page.tsx),
// extended with owner columns so admins can seed dummy listings + dummy owner
// accounts in one file. Kept separate from the seller flow so that page's
// behavior (self as owner, Pending status) is untouched.
type FieldKey =
  | "ownerName" | "ownerPhone" | "ownerEmail"
  | "title" | "description" | "type" | "purpose" | "price" | "area" | "builtUpArea"
  | "bhk" | "bedrooms" | "bathrooms" | "balconies" | "parking" | "furnishing"
  | "facing" | "floors" | "age" | "possession" | "builder" | "reraLabel" | "rera"
  | "city" | "state" | "locality" | "address" | "zipCode" | "latitude" | "longitude"
  | "amenities" | "images" | "virtualTourUrl" | "walkthroughVideoUrl"
  | "pgGender" | "pgOccupancy" | "pgAvailableBeds" | "pgDeposit" | "pgRoomTypes"
  | "pgHouseRules" | "pgFood";

type Row = Partial<Record<FieldKey, string>>;
type FieldDef = { key: FieldKey; header: string; required?: boolean; aliases?: string[]; example: string };

const FIELDS: FieldDef[] = [
  { key: "ownerName", header: "Owner Name", required: true, example: "Ramesh Kumar" },
  { key: "ownerPhone", header: "Owner Mobile Number", required: true, aliases: ["owner phone", "owner mobile"], example: "9876500000" },
  { key: "ownerEmail", header: "Owner Email", aliases: ["email"], example: "" },

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
  { key: "rera", header: "RERA", aliases: ["rera number"], example: "PRM/KA/RERA/1251/446/PR/12345" },
  { key: "city", header: "City", required: true, example: "Bengaluru" },
  { key: "state", header: "State", required: true, example: "Karnataka" },
  { key: "locality", header: "Locality", required: true, example: "Whitefield" },
  { key: "address", header: "Address", example: "12th Main, Whitefield" },
  { key: "zipCode", header: "Pincode", aliases: ["zipcode", "zip code", "pin code"], example: "560066" },
  { key: "latitude", header: "Latitude", example: "12.9698" },
  { key: "longitude", header: "Longitude", example: "77.7500" },
  { key: "amenities", header: "Amenities", example: "Swimming Pool, Gym, 24/7 Security" },
  { key: "images", header: "Image URLs", aliases: ["images", "image url"], example: "" },
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
  a.download = "admin-bulk-dummy-listings-template.csv";
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

function rowsFromMatrix(matrix: (string | number | null | boolean)[][]): { rows: Row[]; error?: string } {
  if (!matrix.length) return { rows: [], error: "The file is empty." };
  const header = matrix[0].map((h) => String(h ?? "").trim().toLowerCase());
  const idx: Partial<Record<FieldKey, number>> = {};
  header.forEach((h, i) => {
    const f = FIELD_BY_HEADER[h];
    if (f && idx[f] === undefined) idx[f] = i;
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
    if (REQUIRED.every((f) => !cellAt(r, f))) continue;
    const row: Row = {};
    for (const f of FIELDS) {
      const v = cellAt(r, f.key);
      if (v) row[f.key] = v;
    }
    rows.push(row);
  }
  return { rows };
}

// Lets an admin add photos/description to a listing right after a bulk upload,
// since the CSV template has no photo upload step of its own.
function CreatedListingRow({ listing }: { listing: { id: string; slug: string; title: string } }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [imagesText, setImagesText] = useState("");

  const updateMut = trpc.properties.update.useMutation({
    onSuccess: () => {
      toast.success("Listing updated.");
      setOpen(false);
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const save = () => {
    const images = imagesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    updateMut.mutate({
      id: listing.id,
      description: description.trim() || undefined,
      images: images.length ? images : undefined,
    });
  };

  return (
    <div className="border-t border-border py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-navy">{listing.title}</span>
        <div className="flex shrink-0 items-center gap-3">
          <a
            href={`/properties/${listing.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
          >
            <ExternalLink size={12} /> View
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:text-accent"
          >
            <Pencil size={12} /> {open ? "Close" : "Modify"}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-2.5 space-y-2 rounded-lg bg-secondary/30 p-3">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Description (optional)"
            className="w-full resize-none rounded-md border border-border bg-white px-2.5 py-2 text-xs outline-none focus:border-accent"
          />
          <textarea
            value={imagesText}
            onChange={(e) => setImagesText(e.target.value)}
            rows={3}
            placeholder="Image URLs, one per line"
            className="w-full resize-none rounded-md border border-border bg-white px-2.5 py-2 text-xs outline-none focus:border-accent"
          />
          <button
            onClick={save}
            disabled={updateMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground disabled:opacity-60"
          >
            {updateMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Save
          </button>
        </div>
      )}
    </div>
  );
}

export function BulkListingsTab() {
  const [parsed, setParsed] = useState<Row[] | null>(null);
  const [parseErr, setParseErr] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    failed: number;
    errors: { row: number; message: string }[];
    createdListings: { id: string; slug: string; title: string }[];
  } | null>(null);

  const bulkMut = trpc.admin.properties.bulkCreateListings.useMutation();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const vErr = validateBulkImportFile(file);
    if (vErr) { setParseErr(vErr.message); return; }

    setParseErr(""); setParsed(null); setResult(null); setFileName(file.name); setParsing(true);
    try {
      let matrix: (string | number | null | boolean)[][];
      if (file.name.toLowerCase().endsWith(".csv")) {
        matrix = parseCsv(await file.text());
      } else {
        const readXlsxFile = (await import("read-excel-file/browser")).default;
        matrix = (await readXlsxFile(file)) as (string | number | null | boolean)[][];
      }
      const { rows, error } = rowsFromMatrix(matrix);
      if (error) setParseErr(error);
      else if (!rows.length) setParseErr("No listing rows found in the file.");
      else if (rows.length > 500) setParseErr("Too many rows — upload up to 500 listings at a time.");
      else setParsed(rows);
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
          setFileName("");
          if (res.created > 0) toast.success(`${res.created} dummy listing(s) created and live.`);
          if (res.failed > 0) toast.warning(`${res.failed} row(s) had errors — see below.`);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <>
      <PageHead
        title="Bulk Listings (Admin)"
        subtitle="Create dummy listings with dummy owner accounts in one upload — admin only."
      />

      <Section
        title="1 · Get the template"
        action={
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent"
          >
            <Download size={14} /> Download CSV template
          </button>
        }
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          Required: <strong>Owner Name, Owner Mobile Number, Title, Type, Purpose, Price, Area, City, State, Locality</strong>.
          Owner Email is optional — leave it blank to auto-generate a placeholder. If the Owner Mobile Number matches an
          existing account, that account is reused as the owner instead of creating a duplicate. Listings created here go
          live immediately (no pending-review step), since they're admin-created. Every other column follows the same
          rules as the seller bulk template: Type is one of Apartment · Villa · Studio · Office · Bungalow · Plot · PG,
          Purpose is Sale or Rent, Title needs at least 10 characters.
        </p>
      </Section>

      <Section title="2 · Upload your file">
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90">
              {parsing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
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

          {parsed && (
            <div className="mt-4 rounded-lg border border-border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-navy">
                  {parsed.length.toLocaleString("en-IN")} row(s) ready to submit
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setParsed(null); setFileName(""); }}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={bulkMut.isPending}
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground disabled:opacity-60"
                  >
                    {bulkMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Submit {parsed.length.toLocaleString("en-IN")}
                  </button>
                </div>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-4">Owner</th>
                      <th className="py-1 pr-4">Mobile</th>
                      <th className="py-1 pr-4">Title</th>
                      <th className="py-1 pr-4">Type</th>
                      <th className="py-1 pr-4">Price</th>
                      <th className="py-1 pr-4">City</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t border-border text-foreground/80">
                        <td className="py-1 pr-4 font-medium text-navy">{r.ownerName || "—"}</td>
                        <td className="py-1 pr-4">{r.ownerPhone || "—"}</td>
                        <td className="py-1 pr-4">{r.title || "—"}</td>
                        <td className="py-1 pr-4">{r.type || "—"}</td>
                        <td className="py-1 pr-4">{r.price || "—"}</td>
                        <td className="py-1 pr-4">{r.city || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 5 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">…and {(parsed.length - 5).toLocaleString("en-IN")} more</p>
                )}
              </div>
            </div>
          )}
        </div>
      </Section>

      {result && (
        <Section title="Result">
          <div className="flex items-center gap-2">
            {result.failed === 0 ? (
              <CheckCircle2 className="text-emerald-500" size={20} />
            ) : (
              <AlertTriangle className="text-amber-500" size={20} />
            )}
            <h3 className="font-display text-base font-bold text-navy">
              {result.created} created
              {result.failed > 0 && ` · ${result.failed} failed`}
            </h3>
          </div>
          {result.createdListings.length > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-white px-3">
              <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Add photos or details
              </p>
              {result.createdListings.map((l) => (
                <CreatedListingRow key={l.id} listing={l} />
              ))}
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
        </Section>
      )}
    </>
  );
}
