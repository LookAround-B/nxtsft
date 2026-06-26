// One-off: upload home category images from docs/ to R2 under site/categories/.
// Reads R2_* creds from the monorepo-root .env. Run with:
//   node packages/trpc/scripts/upload-categories.mjs
import { AwsClient } from "aws4fetch";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../../../"); // monorepo root

// Load root .env (only keys not already in the environment).
for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
  if (!m) continue;
  if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const endpoint = process.env.R2_ENDPOINT.replace(/\/+$/, "");
const bucket = process.env.R2_BUCKET;
const publicUrl = process.env.R2_PUBLIC_URL.replace(/\/+$/, "");
const client = new AwsClient({
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  region: "auto",
  service: "s3",
});

// file in docs/  ->  R2 key suffix under site/categories/
const FILES = [
  ["apartment.png", "apartment.png"],
  ["villas.png", "villas.png"],
  ["plots&sites.png", "plots.png"],
  ["commercial.png", "commercial.png"],
  ["pgcolibing.png", "pg.png"],
  ["studio.png", "studio.png"],
];

for (const [src, name] of FILES) {
  const path = join(root, "docs", src);
  if (!existsSync(path)) {
    console.error(`✗ missing: docs/${src}`);
    continue;
  }
  const body = readFileSync(path);
  const key = `site/categories/${name}`;
  const res = await client.fetch(`${endpoint}/${bucket}/${key}`, {
    method: "PUT",
    body,
    headers: { "Content-Type": "image/png", "Content-Length": String(body.length) },
  });
  if (!res.ok) {
    console.error(`✗ ${src} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
    continue;
  }
  console.log(`✓ ${src} -> ${publicUrl}/${key}`);
}
