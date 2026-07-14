import { AwsClient } from "aws4fetch";

// Cloudflare R2 is S3-compatible. We sign requests with SigV4 via aws4fetch
// (a ~6KB isomorphic signer) instead of the full AWS SDK to keep serverless
// function bundles small. Credentials come from R2_* env vars (root .env,
// loaded by the API server). R2_ENDPOINT is the account-scoped S3 endpoint,
// e.g. https://<accountid>.r2.cloudflarestorage.com — the bucket is appended
// per request, not baked into the endpoint.
const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
const publicUrl = process.env.R2_PUBLIC_URL;

export function isR2Configured(): boolean {
  return Boolean(endpoint && accessKeyId && secretAccessKey && bucket && publicUrl);
}

let client: AwsClient | null = null;
function getClient(): AwsClient {
  if (!client) {
    client = new AwsClient({
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
      region: "auto",
      service: "s3",
    });
  }
  return client;
}

/** Upload a buffer to R2 and return its public URL. Throws if not configured. */
export async function uploadToR2(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<string> {
  if (!isR2Configured()) throw new Error("R2 storage is not configured.");

  const url = `${endpoint!.replace(/\/+$/, "")}/${bucket}/${key}`;
  const res = await getClient().fetch(url, {
    method: "PUT",
    body: body as any,
    headers: { "Content-Type": contentType, "Content-Length": String(body.length) },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`R2 upload failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  return publicUrlFor(key);
}

/** Public URL for an object key. */
export function publicUrlFor(key: string): string {
  return `${publicUrl!.replace(/\/+$/, "")}/${key}`;
}

/**
 * Presign a PUT URL so the browser can upload straight to R2, skipping the
 * serverless function (no base64 round-trip through our API). Only the host is
 * signed via SigV4 query params, so the client sets its own Content-Type on the
 * PUT. Throws if storage isn't configured.
 */
export async function presignUploadUrl(
  key: string,
  contentType: string,
  expiresSeconds = 300,
): Promise<string> {
  if (!isR2Configured()) throw new Error("R2 storage is not configured.");

  const url = new URL(`${endpoint!.replace(/\/+$/, "")}/${bucket}/${key}`);
  url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
  const signed = await getClient().sign(url.toString(), {
    method: "PUT",
    aws: { signQuery: true },
  });
  return signed.url;
}

/**
 * Object key for one of our public URLs, or null if the URL isn't hosted on our
 * bucket (external URL / default cover). Used to avoid deleting things we don't own.
 */
export function keyFromPublicUrl(url: string): string | null {
  if (!publicUrl) return null;
  const base = `${publicUrl.replace(/\/+$/, "")}/`;
  return url.startsWith(base) ? url.slice(base.length) : null;
}

/** Delete an object from R2. No-ops (returns false) if storage isn't configured. */
export async function deleteFromR2(key: string): Promise<boolean> {
  if (!isR2Configured()) return false;

  const url = `${endpoint!.replace(/\/+$/, "")}/${bucket}/${key}`;
  const res = await getClient().fetch(url, { method: "DELETE" });
  // R2 returns 204 on delete; 404 means it's already gone — both are fine.
  return res.ok || res.status === 404;
}
