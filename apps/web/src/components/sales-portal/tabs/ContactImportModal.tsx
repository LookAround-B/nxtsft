"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, X, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { parseCsv } from "@/lib/parse-csv";
import { normalizeBulkImportMatrix, type BulkImportMatrix } from "@/lib/bulk-import";
import { validateBulkImportFile } from "@/lib/file-validation";
import { downloadCSV } from "@/lib/download-csv";
import { BULK_IMPORT_MAX_ROWS } from "@nxtsft/shared/constants";

type FieldKey = "name" | "phone" | "email" | "city" | "interest" | "value";

// Single source of truth for the template, the header matcher and the preview —
// same shape as the property bulk import (app/list/bulk/page.tsx).
const FIELDS: { key: FieldKey; header: string; required?: boolean; aliases: string[]; example: string }[] = [
  { key: "name",     header: "Name",     required: true, aliases: ["name", "contact name", "full name", "customer name"], example: "Ramesh Kumar" },
  { key: "phone",    header: "Phone",    required: true, aliases: ["phone", "mobile", "contact", "number", "phone number", "mobile number"], example: "9876543210" },
  { key: "email",    header: "Email",    aliases: ["email", "email id", "e-mail"], example: "ramesh@example.com" },
  { key: "city",     header: "City",     aliases: ["city", "location", "area"], example: "Hyderabad" },
  { key: "interest", header: "Interest", aliases: ["interest", "requirement", "looking for", "notes"], example: "2 BHK Gachibowli" },
  { key: "value",    header: "Value",    aliases: ["value", "budget", "deal value", "amount"], example: "4500000" },
];

const FIELD_BY_HEADER: Record<string, FieldKey> = {};
for (const f of FIELDS) for (const a of f.aliases) FIELD_BY_HEADER[a] = f.key;

const REQUIRED = FIELDS.filter((f) => f.required).map((f) => f.key);

type ParsedRow = { row: number } & Partial<Record<FieldKey, string>>;

function rowsFromMatrix(matrix: BulkImportMatrix): { rows: ParsedRow[]; error?: string; ignored: string[] } {
  if (!matrix.length) return { rows: [], error: "The file is empty.", ignored: [] };

  const header = matrix[0].map((h) => String(h ?? "").trim().toLowerCase());
  const idx: Partial<Record<FieldKey, number>> = {};
  const ignored: string[] = [];
  header.forEach((h, i) => {
    const f = FIELD_BY_HEADER[h];
    if (f && idx[f] === undefined) idx[f] = i;
    else if (!f && h) ignored.push(String(matrix[0]![i] ?? h).trim());
  });

  const missing = REQUIRED.filter((f) => idx[f] === undefined);
  if (missing.length) {
    const labels = missing.map((k) => FIELDS.find((f) => f.key === k)!.header);
    return { rows: [], error: `Missing required column(s): ${labels.join(", ")}. Download the template.`, ignored };
  }

  const cellAt = (r: number, f: FieldKey) =>
    idx[f] !== undefined ? String(matrix[r]?.[idx[f]!] ?? "").trim() : "";

  const rows: ParsedRow[] = [];
  for (let r = 1; r < matrix.length; r++) {
    // Skip blank rows; keep partial ones so the server reports what's wrong.
    if (FIELDS.every((f) => !cellAt(r, f.key))) continue;
    const row: ParsedRow = { row: r + 1 }; // 1-based, +1 for the header row
    for (const f of FIELDS) {
      const v = cellAt(r, f.key);
      if (v) row[f.key] = v;
    }
    rows.push(row);
  }
  return { rows, ignored };
}

export function ContactImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [ignored, setIgnored] = useState<string[]>([]);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: { row: number; message: string }[] } | null>(null);

  const importMut = trpc.repContacts.bulkCreate.useMutation({
    onError: (e) => toast.error(e.message),
  });

  function downloadTemplate() {
    downloadCSV(
      "contacts-template.csv",
      FIELDS.map((f) => f.header),
      [FIELDS.map((f) => f.example)],
    );
  }

  async function onFile(file: File) {
    setResult(null);
    setRows([]);
    setIgnored([]);
    setParseError("");

    const err = validateBulkImportFile(file);
    if (err) { setParseError(err.message); return; }
    setFileName(file.name);

    try {
      let matrix: BulkImportMatrix;
      if (file.name.toLowerCase().endsWith(".csv")) {
        matrix = parseCsv(await file.text());
      } else {
        const readXlsx = (await import("read-excel-file/browser")).default;
        matrix = normalizeBulkImportMatrix(await readXlsx(file));
      }
      const parsed = rowsFromMatrix(matrix);
      if (parsed.error) { setParseError(parsed.error); return; }
      if (parsed.rows.length > BULK_IMPORT_MAX_ROWS) {
        setParseError(`That file has ${parsed.rows.length} rows — the limit is ${BULK_IMPORT_MAX_ROWS} per upload.`);
        return;
      }
      setRows(parsed.rows);
      setIgnored(parsed.ignored);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Could not read that file.");
    }
  }

  async function runImport() {
    const res = await importMut.mutateAsync({
      rows: rows.map((r) => ({
        row: r.row,
        name: r.name ?? "",
        phone: r.phone ?? "",
        email: r.email,
        city: r.city,
        interest: r.interest,
        value: r.value,
      })),
    });
    setResult(res);
    if (res.created > 0) {
      toast.success(`${res.created} contact${res.created === 1 ? "" : "s"} imported`);
      onDone();
    } else {
      toast.error("Nothing imported — check the row errors below.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold text-navy">Import contacts</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              CSV or Excel, up to {BULK_IMPORT_MAX_ROWS.toLocaleString()} rows. Numbers you already have are skipped.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted-foreground hover:bg-secondary">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">
            <Upload size={14} />
            Choose file
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
            />
          </label>
          <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-navy hover:border-accent">
            <Download size={14} />
            Template
          </button>
          {fileName && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <FileSpreadsheet size={14} /> {fileName}
            </span>
          )}
        </div>

        {parseError && (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{parseError}</p>
        )}

        {ignored.length > 0 && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Ignored column{ignored.length === 1 ? "" : "s"}: {ignored.join(", ")}
          </p>
        )}

        {rows.length > 0 && !result && (
          <>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    {FIELDS.map((f) => <th key={f.key} className="px-3 py-2">{f.header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r) => (
                    <tr key={r.row} className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground">{r.row}</td>
                      {FIELDS.map((f) => (
                        <td key={f.key} className={`px-3 py-2 ${f.required && !r[f.key] ? "text-rose-600" : ""}`}>
                          {r[f.key] ?? (f.required ? "missing" : "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {rows.length} row{rows.length === 1 ? "" : "s"} ready{rows.length > 10 ? " (showing first 10)" : ""}.
            </p>
            <button
              onClick={() => void runImport()}
              disabled={importMut.isPending}
              className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {importMut.isPending ? "Importing…" : `Import ${rows.length} contact${rows.length === 1 ? "" : "s"}`}
            </button>
          </>
        )}

        {result && (
          <div className="space-y-3">
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Imported {result.created}. Skipped {result.skipped} duplicate{result.skipped === 1 ? "" : "s"}.
              {result.errors.length > 0 && ` ${result.errors.length} row${result.errors.length === 1 ? "" : "s"} rejected.`}
            </p>
            {result.errors.length > 0 && (
              <ul className="max-h-48 overflow-auto rounded-lg border border-border p-3 text-xs text-muted-foreground">
                {result.errors.map((e) => (
                  <li key={e.row}>Row {e.row}: {e.message}</li>
                ))}
              </ul>
            )}
            <button onClick={onClose} className="rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
