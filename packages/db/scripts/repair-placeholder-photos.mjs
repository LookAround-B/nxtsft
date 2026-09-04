/**
 * Repair listings that went live on category placeholder artwork because their
 * bulk-import "Image URLs" cell was empty (see the fallback in
 * packages/trpc/src/routers/properties.ts → CATEGORY_IMAGE).
 *
 * Input: a CSV mapping each listing to its real photo URLs. Any ONE of these
 * columns identifies the listing — Property ID, Slug, or Title (+ City to
 * disambiguate). Photo URLs go in "Image URLs", separated by comma / newline /
 * semicolon / space. The bulk photo uploader's own export (Property,Image URLs)
 * works as-is if its Property labels match listing titles.
 *
 *   node --env-file=.env packages/db/scripts/repair-placeholder-photos.mjs map.csv
 *   node --env-file=.env packages/db/scripts/repair-placeholder-photos.mjs map.csv --apply
 *
 * Dry-run by default: prints exactly what it would change and touches nothing.
 * Only ever overwrites listings whose images are ALL placeholders — a listing
 * with real photos is skipped, so this can't clobber good data.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { readFileSync } from "node:fs";

const CATEGORY_IMAGES = [
  "/categories/apartment.png", "/categories/studio.png", "/categories/villa.png",
  "/categories/commercial.png", "/categories/plot.png", "/categories/pg.png",
];

const [, , csvPath, ...flags] = process.argv;
const apply = flags.includes("--apply");
if (!csvPath) {
  console.error("Usage: node --env-file=.env packages/db/scripts/repair-placeholder-photos.mjs <map.csv> [--apply]");
  process.exit(1);
}

// Minimal RFC4180 parse — same shape as the browser parser in BulkListingsTab.
function parseCsv(text) {
  const rows = []; let row = [], cur = "", inQ = false;
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

const isHttpUrl = (u) => { try { return ["http:", "https:"].includes(new URL(u).protocol); } catch { return false; } };
const splitUrls = (cell) => (cell ?? "").replace(/&amp;/gi, "&").split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
const norm = (s) => (s ?? "").trim().toLowerCase();

const matrix = parseCsv(readFileSync(csvPath, "utf8"));
if (!matrix.length) { console.error("Empty CSV."); process.exit(1); }
const header = matrix[0].map((h) => norm(h));
const col = (...names) => { for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; } return -1; };
const iId = col("property id", "id");
const iSlug = col("slug");
const iTitle = col("title", "property", "listing", "property name");
const iCity = col("city");
const iUrls = col("image urls", "images", "image url", "photos", "photo urls", "urls");
if (iUrls < 0) { console.error(`No photo column found. Header seen: ${header.join(" | ")}`); process.exit(1); }
if (iId < 0 && iSlug < 0 && iTitle < 0) { console.error("Need a Property ID, Slug, or Title column."); process.exit(1); }

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 8_000 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const candidates = await prisma.property.findMany({
  where: { deletedAt: null, images: { hasSome: CATEGORY_IMAGES } },
  select: { id: true, slug: true, title: true, images: true, location: { select: { city: true } } },
});
const placeholderOnly = candidates.filter((c) => c.images.every((i) => CATEGORY_IMAGES.includes(i)));

const byId = new Map(placeholderOnly.map((p) => [p.id, p]));
const bySlug = new Map(placeholderOnly.map((p) => [norm(p.slug), p]));
const byTitle = new Map();
for (const p of placeholderOnly) {
  for (const key of [norm(p.title), `${norm(p.title)}|${norm(p.location?.city)}`]) {
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(p);
  }
}

const planned = [];
const problems = [];
for (let r = 1; r < matrix.length; r++) {
  const row = matrix[r];
  if (!row || row.every((c) => !String(c ?? "").trim())) continue;
  const urls = splitUrls(row[iUrls]);
  const good = urls.filter(isHttpUrl);
  const bad = urls.filter((u) => !isHttpUrl(u));
  if (!good.length) { problems.push(`row ${r + 1}: no usable http(s) URLs`); continue; }

  let hit = null;
  if (iId >= 0 && row[iId]?.trim()) hit = byId.get(row[iId].trim()) ?? null;
  if (!hit && iSlug >= 0 && row[iSlug]?.trim()) hit = bySlug.get(norm(row[iSlug])) ?? null;
  if (!hit && iTitle >= 0 && row[iTitle]?.trim()) {
    const withCity = iCity >= 0 && row[iCity]?.trim() ? byTitle.get(`${norm(row[iTitle])}|${norm(row[iCity])}`) : null;
    const list = withCity ?? byTitle.get(norm(row[iTitle]));
    if (list?.length === 1) hit = list[0];
    else if (list?.length > 1) { problems.push(`row ${r + 1}: title "${row[iTitle]}" matches ${list.length} placeholder listings — add a City or Property ID column`); continue; }
  }
  if (!hit) { problems.push(`row ${r + 1}: no placeholder listing matched (already has photos, or not found)`); continue; }
  if (planned.some((p) => p.target.id === hit.id)) { problems.push(`row ${r + 1}: listing ${hit.slug} already claimed by an earlier row`); continue; }

  planned.push({ target: hit, urls: good, dropped: bad });
}

console.log(`Placeholder-only listings in DB: ${placeholderOnly.length}`);
console.log(`CSV rows: ${matrix.length - 1}`);
console.log(`Matched and ready to repair: ${planned.length}`);
console.log(`Unmatched / unusable rows: ${problems.length}\n`);

for (const p of planned.slice(0, 20)) {
  console.log(`  ${p.target.slug.slice(0, 60).padEnd(62)} ← ${p.urls.length} photo(s)${p.dropped.length ? ` (${p.dropped.length} dropped)` : ""}`);
}
if (planned.length > 20) console.log(`  …and ${planned.length - 20} more`);
if (problems.length) {
  console.log("\nProblems:");
  for (const m of problems.slice(0, 25)) console.log(`  ${m}`);
  if (problems.length > 25) console.log(`  …and ${problems.length - 25} more`);
}

if (!apply) {
  console.log("\nDRY RUN — nothing written. Re-run with --apply to commit these changes.");
} else {
  let done = 0;
  for (const p of planned) {
    // Re-check inside the write: only replace if it is still placeholder-only.
    const fresh = await prisma.property.findUnique({ where: { id: p.target.id }, select: { images: true } });
    if (!fresh || !fresh.images.every((i) => CATEGORY_IMAGES.includes(i))) continue;
    await prisma.property.update({ where: { id: p.target.id }, data: { images: p.urls } });
    done++;
  }
  console.log(`\nAPPLIED — ${done} listing(s) updated.`);
}

await prisma.$disconnect();
await pool.end();
