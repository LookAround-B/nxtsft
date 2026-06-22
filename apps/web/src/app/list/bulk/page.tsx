"use client";
import { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { validateBulkImportFile } from "@/lib/file-validation";

// Order matters: this is both the template header row and the preview columns.
const HEADERS = [
  "Title", "Description", "Type", "Purpose", "Price (INR)", "Area (sqft)",
  "BHK", "Bedrooms", "Bathrooms", "Furnishing", "RERA", "City", "State",
  "Locality", "Address", "Pincode",
] as const;

type Row = {
  title: string; description?: string; type: string; purpose: string;
  price: string; area: string; bhk?: string; bedrooms?: string; bathrooms?: string;
  furnishing?: string; rera: string; city: string; state: string;
  locality: string; address?: string; zipCode?: string;
};

const FIELD_BY_HEADER: Record<string, keyof Row> = {
  title: "title", description: "description", type: "type", purpose: "purpose",
  "price (inr)": "price", price: "price", "area (sqft)": "area", area: "area",
  bhk: "bhk", bedrooms: "bedrooms", bathrooms: "bathrooms", furnishing: "furnishing",
  rera: "rera", "rera number": "rera", city: "city", state: "state",
  locality: "locality", address: "address", pincode: "zipCode", zipcode: "zipCode",
  "zip code": "zipCode",
};

const REQUIRED: (keyof Row)[] = ["title", "type", "purpose", "price", "area", "rera", "city", "state", "locality"];

function downloadTemplate() {
  const example = [
    "Spacious 3 BHK Apartment in Whitefield", "Sun-facing, near metro, gated society",
    "Apartment", "Sale", "9500000", "1450", "3 BHK", "3", "3", "Semi-Furnished",
    "PRM/KA/RERA/1251/446/PR/12345", "Bengaluru", "Karnataka", "Whitefield",
    "12th Main, Whitefield", "560066",
  ];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = `${HEADERS.join(",")}\n${example.map(esc).join(",")}\n`;
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

function rowsFromMatrix(matrix: (string | number | null | boolean)[][]): { rows: Row[]; error?: string } {
  if (!matrix.length) return { rows: [], error: "The file is empty." };
  const header = matrix[0].map((h) => String(h ?? "").trim().toLowerCase());
  const idx: Partial<Record<keyof Row, number>> = {};
  header.forEach((h, i) => {
    const f = FIELD_BY_HEADER[h];
    if (f && idx[f] === undefined) idx[f] = i;
  });
  const missing = REQUIRED.filter((f) => idx[f] === undefined);
  if (missing.length) {
    return { rows: [], error: `Missing required column(s): ${missing.join(", ")}. Download the template.` };
  }
  const cellAt = (r: number, f: keyof Row) =>
    idx[f] !== undefined ? String(matrix[r]?.[idx[f]!] ?? "").trim() : "";

  const rows: Row[] = [];
  for (let r = 1; r < matrix.length; r++) {
    // Skip fully-empty rows; keep partial rows so the server reports their errors.
    if (REQUIRED.every((f) => !cellAt(r, f)) && !cellAt(r, "description")) continue;
    rows.push({
      title: cellAt(r, "title"), description: cellAt(r, "description") || undefined,
      type: cellAt(r, "type"), purpose: cellAt(r, "purpose"),
      price: cellAt(r, "price"), area: cellAt(r, "area"),
      bhk: cellAt(r, "bhk") || undefined, bedrooms: cellAt(r, "bedrooms") || undefined,
      bathrooms: cellAt(r, "bathrooms") || undefined, furnishing: cellAt(r, "furnishing") || undefined,
      rera: cellAt(r, "rera"), city: cellAt(r, "city"), state: cellAt(r, "state"),
      locality: cellAt(r, "locality"), address: cellAt(r, "address") || undefined,
      zipCode: cellAt(r, "zipCode") || undefined,
    });
  }
  return { rows };
}

export default function BulkListPage() {
  const { session } = useAuth();
  const [parsed, setParsed] = useState<Row[] | null>(null);
  const [parseErr, setParseErr] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: number; errors: { row: number; message: string }[] } | null>(null);

  const bulkMut = trpc.properties.bulkCreate.useMutation();

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
      else if (!rows.length) setParseErr("No property rows found in the file.");
      else if (rows.length > 500) setParseErr("Too many rows — upload up to 500 properties at a time.");
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
          if (res.created > 0) toast.success(`${res.created} listing(s) submitted for review.`);
          if (res.failed > 0) toast.warning(`${res.failed} row(s) had errors — see below.`);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  if (session === undefined) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading…</div>;
  }

  if (!session || session.role !== "home-seller") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-white p-10 text-center shadow-sm">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <h2 className="font-display text-xl font-black text-navy">Home Sellers only</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bulk property upload is for Home Seller accounts.
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
          Upload an Excel (.xlsx) or CSV file to list many properties at once. Listings are submitted
          for admin review before going live. You can add photos to each listing afterward from{" "}
          <Link href="/user-portal#listings" className="font-semibold text-accent underline underline-offset-2">My Listings</Link>.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-navy">1 · Get the template</h2>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent"
            >
              <Download size={14} /> Download CSV template
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Required: <strong>Title, Type, Purpose, Price, Area, RERA, City, State, Locality</strong>.
            Type must be one of Apartment · Villa · Studio · Office · Bungalow · Plot · PG.
            Purpose is Sale or Rent. Title needs at least 10 characters. RERA is validated per state.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-base font-bold text-navy">2 · Upload your file</h2>
          <div className="mt-4 rounded-xl border border-dashed border-border bg-secondary/20 p-5">
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
                        <th className="py-1 pr-4">Title</th>
                        <th className="py-1 pr-4">Type</th>
                        <th className="py-1 pr-4">Purpose</th>
                        <th className="py-1 pr-4">Price</th>
                        <th className="py-1 pr-4">City</th>
                        <th className="py-1 pr-4">RERA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-t border-border text-foreground/80">
                          <td className="py-1 pr-4 font-medium text-navy">{r.title || "—"}</td>
                          <td className="py-1 pr-4">{r.type || "—"}</td>
                          <td className="py-1 pr-4">{r.purpose || "—"}</td>
                          <td className="py-1 pr-4">{r.price || "—"}</td>
                          <td className="py-1 pr-4">{r.city || "—"}</td>
                          <td className="py-1 pr-4">{r.rera || "—"}</td>
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
              </h2>
            </div>
            {result.created > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                Submitted listings are pending admin approval. Track them in{" "}
                <Link href="/user-portal#listings" className="font-semibold text-accent underline underline-offset-2">My Listings</Link>.
              </p>
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
