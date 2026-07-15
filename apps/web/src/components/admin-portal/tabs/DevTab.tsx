"use client";
import { useState } from "react";
import { toast } from "sonner";
import { keepPreviousData } from "@tanstack/react-query";
import { Download, Upload, Loader2, FileSpreadsheet, Search, Check, X as XIcon, FileCode2, RefreshCw, Trash2, ShieldAlert } from "lucide-react";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { Pagination } from "@/components/ui/pagination";
import { normalizeBulkImportMatrix, type BulkImportMatrix } from "@/lib/bulk-import";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth";
import { TableSkeleton } from "@/components/ui/skeleton";
import { validateBulkImportFile } from "@/lib/file-validation";
import { builderRowSchema } from "@/lib/validation";
import { PageHead } from "./PageHead";

type BuilderRow = {
  companyName: string; ownerName: string; mobile: string;
  projectType: string; developmentStatus: string; state: string; district: string; city: string;
};

// Shape returned by admin.users.list (safeUserSelect) — the fields the delete panel shows.
type AdminUser = {
  id: string; name: string; email: string; phone: string | null;
  role: string; city: string; joined: string | Date;
};

const BUILDER_HEADERS = ["Project Name", "Owner Name", "Mobile Number", "Project Type", "Development Status", "State", "District", "City/Town"];
const FIELD_BY_HEADER: Record<string, keyof BuilderRow> = {
  "project name": "companyName", "company name": "companyName",
  "owner name": "ownerName",
  "mobile number": "mobile", mobile: "mobile",
  "project type": "projectType",
  "development status": "developmentStatus", status: "developmentStatus",
  state: "state", district: "district",
  "city/town": "city", city: "city", town: "city",
};

function downloadBuilderTemplate() {
  const example = ["Coastal Homes", "Mohan Goud", "7356771554", "Independent Home", "Ongoing", "Andhra Pradesh", "Kadapa", "Rajampet"];
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
  // Collapse any whitespace run (incl. non-breaking space U+00A0 and BOM,
  // both matched by \s) to one space, so headers copied from Excel/PDF match.
  const header = matrix[0].map((h) => String(h ?? "").replace(/\s+/g, " ").trim().toLowerCase());
  const idx: Partial<Record<keyof BuilderRow, number>> = {};
  header.forEach((h, i) => {
    const f = FIELD_BY_HEADER[h];
    if (f && idx[f] === undefined) idx[f] = i;
  });
  if (idx.companyName === undefined) return { rows: [], error: "Missing required 'Project Name' column. Use the template." };
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
      developmentStatus: cellAt(r, "developmentStatus") || undefined,
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

type XmlBuilderRow = {
  companyName: string; ownerName: string; mobile: string; state: string;
  district: string; city: string; reraNo: string; established?: number;
  website: string; description: string;
  projects: { name: string; city: string; area: string; type: string; status: string;
    reraNo: string; priceMin?: number; priceMax?: number; sftMin?: number; sftMax?: number;
    totalUnits?: number; description: string; amenities: string; }[];
};

function parseXmlBuilders(xmlText: string): { rows: XmlBuilderRow[]; error?: string } {
  try {
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) return { rows: [], error: "Invalid XML: " + parseError.textContent?.slice(0, 120) };
    const builderEls = Array.from(doc.querySelectorAll("builder"));
    if (!builderEls.length) return { rows: [], error: "No <builder> elements found. Check your XML structure." };
    const txt = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() ?? "";
    const rows: XmlBuilderRow[] = builderEls.map((b) => ({
      companyName: txt(b, "companyName"),
      ownerName:   txt(b, "ownerName"),
      mobile:      txt(b, "mobile"),
      state:       txt(b, "state"),
      district:    txt(b, "district"),
      city:        txt(b, "city"),
      reraNo:      txt(b, "reraNo"),
      established: parseInt(txt(b, "established")) || undefined,
      website:     txt(b, "website"),
      description: txt(b, "description"),
      projects: Array.from(b.querySelectorAll("project")).map((p) => ({
        name:        txt(p, "name"),
        city:        txt(p, "city"),
        area:        txt(p, "area"),
        type:        txt(p, "type") || "Apartment",
        status:      txt(p, "status") || "Ongoing",
        reraNo:      txt(p, "reraNo"),
        priceMin:    parseInt(txt(p, "priceMin")) || undefined,
        priceMax:    parseInt(txt(p, "priceMax")) || undefined,
        sftMin:      parseInt(txt(p, "sftMin"))   || undefined,
        sftMax:      parseInt(txt(p, "sftMax"))   || undefined,
        totalUnits:  parseInt(txt(p, "totalUnits")) || undefined,
        description: txt(p, "description"),
        amenities:   txt(p, "amenities"),
      })).filter((p) => p.name && p.city),
    })).filter((b) => b.companyName);
    if (!rows.length) return { rows: [], error: "No valid builders found. Make sure each <builder> has a <companyName>." };
    return { rows };
  } catch {
    return { rows: [], error: "Failed to parse XML." };
  }
}

export function DevTab() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [parsed, setParsed] = useState<BuilderRow[] | null>(null);
  const [parseErr, setParseErr] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);

  // XML import state
  const [xmlParsed,  setXmlParsed]  = useState<XmlBuilderRow[] | null>(null);
  const [xmlErr,     setXmlErr]     = useState("");
  const [xmlFile,    setXmlFile]    = useState("");
  const [xmlParsing, setXmlParsing] = useState(false);

  // Backfill state
  const [backfillTotal,   setBackfillTotal]   = useState(0);
  const [backfillDone,    setBackfillDone]    = useState(0);
  const [backfillRunning, setBackfillRunning] = useState(false);

  const [page, setPage] = useState(1);

  // ── Danger zone: delete a user (super-admin only) ──────────────────────────
  const { session } = useAuth();
  const isSuperAdmin = session?.role === "super-admin";

  const [userQuery, setUserQuery] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");

  const usersQ = trpc.admin.users.list.useQuery(
    { search: userSearch || undefined, limit: 10 },
    { enabled: isSuperAdmin && userSearch.length > 0, placeholderData: keepPreviousData },
  );
  const deleteUserMut = trpc.admin.users.deleteAccount.useMutation();
  const foundUsers = (usersQ.data?.items ?? []) as AdminUser[];

  const confirmMatches =
    !!deleteTarget && confirmEmail.trim().toLowerCase() === deleteTarget.email.toLowerCase();

  const doDeleteUser = () => {
    if (!deleteTarget || !confirmMatches) return;
    deleteUserMut.mutate(
      { userId: deleteTarget.id, confirmEmail: confirmEmail.trim() },
      {
        onSuccess: (res: { name: string }) => {
          toast.success(`Deleted ${res.name}. Their email & phone are free to register again.`);
          setDeleteTarget(null);
          setConfirmEmail("");
          void usersQ.refetch();
        },
        onError: (err: { message: string }) => toast.error(err.message),
      },
    );
  };

  const listQ = trpc.builders.list.useQuery(
    { search: search || undefined, page, limit: 20 },
    { placeholderData: keepPreviousData },
  );
  const statsQ      = trpc.builders.stats.useQuery();
  const importMut   = trpc.builders.bulkImport.useMutation();
  const xmlMut      = trpc.builders.xmlImport.useMutation();
  const backfillMut = trpc.builders.backfillSlugs.useMutation();

  const builders = (listQ.data?.items ?? []) as Array<BuilderRow & { id: string }>;
  const total = listQ.data?.total ?? 0;
  const totalPages = listQ.data?.totalPages ?? 1;

  const goToPage = (p: number) => setPage(p);

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
      let matrix: BulkImportMatrix;
      if (file.name.toLowerCase().endsWith(".csv")) {
        matrix = parseCsv(await file.text());
      } else {
        const readXlsxFile = (await import("read-excel-file/browser")).default;
        matrix = normalizeBulkImportMatrix(await readXlsxFile(file));
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

  const runBackfill = (totalToProcess?: number) => {
    setBackfillRunning(true);
    if (totalToProcess !== undefined) {
      setBackfillTotal(totalToProcess);
      setBackfillDone(0);
    }

    const step = (done: number) => {
      backfillMut.mutate(undefined, {
        onSuccess: (res: { updated: number; remaining: number }) => {
          const newDone = done + res.updated;
          setBackfillDone(newDone);
          if (res.remaining > 0) {
            step(newDone);
          } else {
            setBackfillRunning(false);
            toast.success(`Backfill complete — ${newDone.toLocaleString("en-IN")} builders now visible on public directory.`);
            void statsQ.refetch();
            void listQ.refetch();
          }
        },
        onError: (err: { message: string }) => {
          setBackfillRunning(false);
          toast.error(`Backfill error: ${err.message}`);
        },
      });
    };
    step(totalToProcess !== undefined ? 0 : backfillDone);
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
          if (res.inserted > 0) runBackfill(res.inserted);
        },
        onError: (err: { message: string }) => toast.error(err.message),
      },
    );
  };

  const onXmlFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setXmlErr(""); setXmlParsed(null); setXmlFile(file.name); setXmlParsing(true);
    try {
      const text = await file.text();
      const { rows, error } = parseXmlBuilders(text);
      if (error) setXmlErr(error);
      else setXmlParsed(rows);
    } catch { setXmlErr("Could not read file."); }
    finally { setXmlParsing(false); }
  };

  const doXmlImport = () => {
    if (!xmlParsed) return;
    xmlMut.mutate(
      { builders: xmlParsed },
      {
        onSuccess: (res: { buildersInserted: number; buildersUpdated: number; projectsUpserted: number }) => {
          toast.success(`${res.buildersInserted} builders added · ${res.buildersUpdated} updated · ${res.projectsUpserted} projects upserted.`);
          setXmlParsed(null); setXmlFile("");
          void listQ.refetch(); void statsQ.refetch();
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
        {(statsQ.data?.byState ?? []).map((s) => (
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
            Columns: {BUILDER_HEADERS.join(" · ")}. Only <strong>Project Name</strong> is required.
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

      {/* ── XML Import (builders + projects for public directory) ── */}
      <Section title="XML Import — Builders &amp; Projects directory">
        <p className="mb-3 text-xs text-muted-foreground">
          Upload an XML file to populate the public <strong>/builders</strong> directory.
          Each builder can include nested <code className="rounded bg-secondary px-1">&lt;projects&gt;</code>.
          Import is idempotent — re-uploading updates existing records.
        </p>
        <details className="mb-4 rounded-lg border border-border bg-secondary/20 p-3 text-xs">
          <summary className="cursor-pointer font-semibold text-navy">View expected XML format</summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre text-[11px] text-muted-foreground">{`<builderDirectory>
  <builder>
    <companyName>Prestige Group</companyName>
    <ownerName>Irfan Razack</ownerName>
    <mobile>9876543210</mobile>
    <state>Karnataka</state>
    <district>Bengaluru Urban</district>
    <city>Bengaluru</city>
    <reraNo>PRM/KA/RERA/001</reraNo>
    <established>1986</established>
    <website>https://prestigeconstructions.com</website>
    <description>Leading real estate developer</description>
    <projects>
      <project>
        <name>Prestige Lakeside Habitat</name>
        <city>Bengaluru</city>
        <area>Varthur</area>
        <type>Apartment</type>      <!-- Apartment|HighRise|Villa|Commercial|Plot|Studio|PG|Others -->
        <status>Completed</status>  <!-- Ongoing|Completed|Upcoming -->
        <reraNo>PRM/KA/001</reraNo>
        <priceMin>8500000</priceMin>
        <priceMax>25000000</priceMax>
        <sftMin>1200</sftMin>
        <sftMax>3500</sftMax>
        <totalUnits>3426</totalUnits>
        <description>Premium lakeside complex</description>
        <amenities>Swimming Pool,Gymnasium,Clubhouse</amenities>
      </project>
    </projects>
  </builder>
</builderDirectory>`}</pre>
        </details>

        <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-5">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90">
            {xmlParsing ? <Loader2 size={15} className="animate-spin" /> : <FileCode2 size={15} />}
            {xmlParsing ? "Parsing…" : "Choose .xml file"}
            <input type="file" accept=".xml" onChange={onXmlFile} className="hidden" disabled={xmlParsing} />
          </label>
          {xmlFile && <span className="ml-3 text-xs text-muted-foreground">{xmlFile}</span>}

          {xmlErr && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">{xmlErr}</p>
          )}

          {xmlParsed && (
            <div className="mt-4 rounded-lg border border-border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-navy">
                  {xmlParsed.length} builders · {xmlParsed.reduce((s, b) => s + b.projects.length, 0)} projects ready
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { setXmlParsed(null); setXmlFile(""); }}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">Cancel</button>
                  <button onClick={doXmlImport} disabled={xmlMut.isPending}
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground disabled:opacity-60">
                    {xmlMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Import all
                  </button>
                </div>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr><th className="py-1 pr-4">Company</th><th className="py-1 pr-4">City</th><th className="py-1 pr-4">State</th><th className="py-1 pr-4">Projects</th></tr>
                  </thead>
                  <tbody>
                    {xmlParsed.slice(0, 6).map((b, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-1 pr-4 font-medium text-navy">{b.companyName}</td>
                        <td className="py-1 pr-4">{b.city || "—"}</td>
                        <td className="py-1 pr-4">{b.state || "—"}</td>
                        <td className="py-1 pr-4">{b.projects.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {xmlParsed.length > 6 && <p className="mt-2 text-[11px] text-muted-foreground">…and {xmlParsed.length - 6} more builders</p>}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Public directory backfill ── */}
      <Section title="Public directory visibility">
        <p className="mb-3 text-xs text-muted-foreground">
          Builders imported via CSV/Excel have no public URL slug and are invisible on{" "}
          <strong>/builders</strong>. Run backfill to generate slugs for all of them.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => runBackfill()}
            disabled={backfillRunning}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {backfillRunning
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCw size={14} />}
            {backfillRunning ? "Backfilling…" : "Backfill slugs now"}
          </button>
          {backfillRunning && backfillTotal > 0 && (
            <span className="text-xs text-muted-foreground">
              {backfillDone.toLocaleString("en-IN")} / {backfillTotal.toLocaleString("en-IN")} done
            </span>
          )}
          {!backfillRunning && backfillDone > 0 && (
            <span className="text-xs text-emerald-600 font-semibold">
              ✓ {backfillDone.toLocaleString("en-IN")} slugs generated
            </span>
          )}
        </div>
      </Section>

      <Section title={`${total.toLocaleString("en-IN")} builders`}>
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}
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
            <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}>
              <XIcon size={14} className="text-muted-foreground" />
            </button>
          )}
        </form>

        {listQ.isLoading ? (
          <div className="py-2"><TableSkeleton rows={6} cols={5} /></div>
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
                    <th className="py-2 pr-4">Project</th>
                    <th className="py-2 pr-4">Owner</th>
                    <th className="py-2 pr-4">Mobile</th>
                    <th className="py-2 pr-4">Project Type</th>
                    <th className="py-2 pr-4">Status</th>
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
                      <td className="py-2 pr-4 text-foreground/80">{b.developmentStatus || "—"}</td>
                      <td className="py-2 pr-4 text-foreground/80">{b.city || "—"}</td>
                      <td className="py-2 pr-4 text-foreground/80">{b.state || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}
              total={total}
              noun="builders"
            />
          </>
        )}
      </Section>

      {/* ── Danger zone: permanently delete a user (super-admin only) ── */}
      {isSuperAdmin && (
        <Section title="Delete a user — danger zone">
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5">
            <p className="mb-3 text-xs text-rose-700">
              <strong>Permanent.</strong> Deletes the account and everything tied to it — their
              listings, leads, favorites, site visits, payments, reviews, KYC docs, tickets and
              notifications. Frees the email &amp; phone so the person can register again. Built for
              resetting test accounts. You can&apos;t delete your own account or another super-admin.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); setUserSearch(userQuery.trim()); }}
              className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2"
            >
              <Search size={15} className="text-muted-foreground" />
              <input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search a user by name, email, or phone…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {userQuery && (
                <button type="button" onClick={() => { setUserQuery(""); setUserSearch(""); }}>
                  <XIcon size={14} className="text-muted-foreground" />
                </button>
              )}
            </form>

            {userSearch && (
              usersQ.isLoading ? (
                <p className="mt-4 text-xs text-muted-foreground">Searching…</p>
              ) : foundUsers.length === 0 ? (
                <p className="mt-4 text-xs text-muted-foreground">No users match “{userSearch}”.</p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Joined</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {foundUsers.map((u) => (
                        <tr key={u.id} className="border-t border-border">
                          <td className="px-3 py-2 font-semibold text-navy">{u.name}</td>
                          <td className="px-3 py-2 text-foreground/80">{u.email}</td>
                          <td className="px-3 py-2 font-mono text-xs text-foreground/80">{u.phone ?? "—"}</td>
                          <td className="px-3 py-2"><Badge tone="default">{u.role}</Badge></td>
                          <td className="px-3 py-2 text-foreground/70">{new Date(u.joined).toLocaleDateString("en-IN")}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => { setDeleteTarget(u); setConfirmEmail(""); }}
                              disabled={u.role === "super-admin"}
                              className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-rose-600"
                              title={u.role === "super-admin" ? "Super-admins can't be deleted here" : "Delete permanently"}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </Section>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          onClick={() => { if (!deleteUserMut.isPending) setDeleteTarget(null); }}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-rose-600">
              <ShieldAlert size={14} /> Permanent deletion
            </div>
            <h3 className="font-display text-xl font-bold text-navy">Delete {deleteTarget.name}?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              This wipes the account ({deleteTarget.role}) and all of its data — listings, leads,
              favorites, visits, payments, reviews, KYC docs, tickets and notifications. It cannot be
              undone. The email &amp; phone will be free to register again.
            </p>
            <div className="mt-4">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Type <span className="font-mono text-rose-600">{deleteTarget.email}</span> to confirm
              </label>
              <input
                autoFocus
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={deleteTarget.email}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300/40"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteUserMut.isPending}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-muted-foreground disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={doDeleteUser}
                disabled={!confirmMatches || deleteUserMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteUserMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
