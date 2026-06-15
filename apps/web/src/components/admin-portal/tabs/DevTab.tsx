"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Upload, Loader2, FileSpreadsheet, Search, Check, X as XIcon } from "lucide-react";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { LoadMore } from "@/components/ui/load-more";
import { trpc } from "@/lib/trpc";
import { validateBulkImportFile } from "@/lib/file-validation";
import { builderRowSchema } from "@/lib/validation";
import { PageHead } from "./PageHead";

type BuilderRow = {
  companyName: string; ownerName: string; mobile: string;
  projectType: string; state: string; district: string; city: string;
};

const BUILDER_HEADERS = ["Company Name", "Owner Name", "Mobile Number", "Project Type", "State", "District", "City/Town"];
const FIELD_BY_HEADER: Record<string, keyof BuilderRow> = {
  "company name": "companyName", "owner name": "ownerName",
  "mobile number": "mobile", mobile: "mobile",
  "project type": "projectType", state: "state", district: "district",
  "city/town": "city", city: "city", town: "city",
};

function downloadBuilderTemplate() {
  const example = ["Coastal Homes", "Mohan Goud", "7356771554", "Independent Home", "Andhra Pradesh", "Kadapa", "Rajampet"];
  const csv = `${BUILDER_HEADERS.join(",")}\n${example.join(",")}\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "builders-template.csv";
  a.click();
  URL.revokeObjectURL(url);
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

function rowsFromMatrix(matrix: (string | number | null | boolean)[][]): { rows: BuilderRow[]; error?: string } {
  if (!matrix.length) return { rows: [], error: "The file is empty." };
  const header = matrix[0].map((h) => String(h ?? "").trim().toLowerCase());
  const idx: Partial<Record<keyof BuilderRow, number>> = {};
  header.forEach((h, i) => {
    const f = FIELD_BY_HEADER[h];
    if (f && idx[f] === undefined) idx[f] = i;
  });
  if (idx.companyName === undefined) return { rows: [], error: "Missing required 'Company Name' column. Use the template." };
  const cellAt = (r: number, f: keyof BuilderRow) =>
    idx[f] !== undefined ? String(matrix[r]?.[idx[f]!] ?? "").trim() : "";
  const rows: BuilderRow[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const companyName = cellAt(r, "companyName");
    if (!companyName) continue;

    // Validate and sanitize row data
    const rowData = {
      companyName,
      ownerName: cellAt(r, "ownerName") || undefined,
      mobile: cellAt(r, "mobile"),
      projectType: cellAt(r, "projectType") || undefined,
      state: cellAt(r, "state") || undefined,
      district: cellAt(r, "district") || undefined,
      city: cellAt(r, "city"),
    };

    const validation = builderRowSchema.safeParse(rowData);
    if (!validation.success) continue; // Skip invalid rows

    rows.push(validation.data as BuilderRow);
  }
  return { rows };
}

export function DevTab() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [parsed, setParsed] = useState<BuilderRow[] | null>(null);
  const [parseErr, setParseErr] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listQ = (trpc.builders.list as any).useInfiniteQuery(
    { search: search || undefined, limit: 20 },
    { initialCursor: undefined as string | undefined, getNextPageParam: (l: { nextCursor: string | null }) => l.nextCursor ?? undefined },
  );
  const statsQ = trpc.builders.stats.useQuery();
  const importMut = trpc.builders.bulkImport.useMutation();

  const builders = (listQ.data?.pages.flatMap((p: { items: BuilderRow[] }) => p.items) ?? []) as Array<BuilderRow & { id: string }>;
  const total = (listQ.data?.pages[0] as { total?: number } | undefined)?.total ?? 0;
  const hasMore = listQ.data?.pages.at(-1)?.hasMore ?? false;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // Validate file before processing
    const validationErr = validateBulkImportFile(file);
    if (validationErr) {
      setParseErr(validationErr.message);
      return;
    }

    setParseErr(""); setParsed(null); setFileName(file.name); setParsing(true);
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
      else if (!rows.length) setParseErr("No builder rows found in the file.");
      else setParsed(rows);
    } catch {
      setParseErr("Couldn't read this file. Make sure it's a valid .xlsx or .csv matching the template.");
    } finally {
      setParsing(false);
    }
  };

  const doImport = () => {
    if (!parsed) return;
    importMut.mutate(
      { rows: parsed },
      {
        onSuccess: (res: { inserted: number; skipped: number }) => {
          toast.success(`Imported ${res.inserted} builders · ${res.skipped} duplicates skipped.`);
          setParsed(null); setFileName("");
          void listQ.refetch();
          void statsQ.refetch();
        },
        onError: (err: { message: string }) => toast.error(err.message),
      },
    );
  };

  return (
    <>
      <PageHead title="Builders / Developers" subtitle="Directory with bulk Excel/CSV upload." />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard value={(statsQ.data?.total ?? 0).toLocaleString("en-IN")} label="Total builders" />
        {(statsQ.data?.byState ?? []).slice(0, 3).map((s) => (
          <StatCard key={s.state} value={s.count.toLocaleString("en-IN")} label={s.state} sub="builders" />
        ))}
      </div>

      <Section
        title="Bulk upload"
        action={
          <button
            onClick={downloadBuilderTemplate}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-accent hover:text-accent"
          >
            <Download size={13} /> Download template
          </button>
        }
      >
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90">
              {parsing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {parsing ? "Reading…" : "Choose .xlsx / .csv"}
              <input type="file" accept=".xlsx,.csv" onChange={onFile} className="hidden" disabled={parsing} />
            </label>
            {fileName && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileSpreadsheet size={13} /> {fileName}</span>}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Columns: {BUILDER_HEADERS.join(" · ")}. Only <strong>Company Name</strong> is required.
          </p>

          {parseErr && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">{parseErr}</p>
          )}

          {parsed && (
            <div className="mt-4 rounded-lg border border-border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-navy">
                  {parsed.length.toLocaleString("en-IN")} valid rows ready to import
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { setParsed(null); setFileName(""); }} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    Cancel
                  </button>
                  <button
                    onClick={doImport}
                    disabled={importMut.isPending}
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground disabled:opacity-60"
                  >
                    {importMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Import {parsed.length.toLocaleString("en-IN")}
                  </button>
                </div>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>{BUILDER_HEADERS.map((h) => <th key={h} className="py-1 pr-4">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t border-border text-foreground/80">
                        <td className="py-1 pr-4 font-medium text-navy">{r.companyName}</td>
                        <td className="py-1 pr-4">{r.ownerName}</td>
                        <td className="py-1 pr-4">{r.mobile}</td>
                        <td className="py-1 pr-4">{r.projectType}</td>
                        <td className="py-1 pr-4">{r.state}</td>
                        <td className="py-1 pr-4">{r.district}</td>
                        <td className="py-1 pr-4">{r.city}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 5 && <p className="mt-2 text-[11px] text-muted-foreground">…and {(parsed.length - 5).toLocaleString("en-IN")} more</p>}
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title={`${total.toLocaleString("en-IN")} builders`}>
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }}
          className="mb-4 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2"
        >
          <Search size={15} className="text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by company, owner, city, district, or mobile…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {searchInput && (
            <button type="button" onClick={() => { setSearchInput(""); setSearch(""); }}>
              <XIcon size={14} className="text-muted-foreground" />
            </button>
          )}
        </form>

        {listQ.isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading builders…</div>
        ) : builders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            No builders found. Upload a file above to get started.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Company</th>
                    <th className="py-2 pr-4">Owner</th>
                    <th className="py-2 pr-4">Mobile</th>
                    <th className="py-2 pr-4">Project Type</th>
                    <th className="py-2 pr-4">City</th>
                    <th className="py-2 pr-4">State</th>
                  </tr>
                </thead>
                <tbody>
                  {builders.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="py-2 pr-4 font-semibold text-navy">{b.companyName}</td>
                      <td className="py-2 pr-4 text-foreground/80">{b.ownerName || "—"}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-foreground/80">{b.mobile || "—"}</td>
                      <td className="py-2 pr-4">{b.projectType ? <Badge tone="default">{b.projectType}</Badge> : "—"}</td>
                      <td className="py-2 pr-4 text-foreground/80">{b.city || "—"}</td>
                      <td className="py-2 pr-4 text-foreground/80">{b.state || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <LoadMore
              onClick={() => listQ.fetchNextPage()}
              isLoading={listQ.isFetchingNextPage}
              hasMore={hasMore}
              shown={builders.length}
              total={total}
              noun="builders"
            />
          </>
        )}
      </Section>
    </>
  );
}
