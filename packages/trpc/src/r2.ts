import { AwsClient } from "aws4fetch";

// Cloudflare R2 is S3-compatible. We sign requests with SigV4 via aws4fetch
// (a ~6KB isomorphic signer) instead of the full AWS SDK to keep serverless
// function bundles small. Credentials come from CLOUDFLARE_R2_* env vars.
const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucket = process.env.CLOUDFLARE_R2_BUCKET;
const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

export function isR2Configured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucket && publicUrl);
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

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
  const res = await getClient().fetch(endpoint, {
    method: "PUT",
    // Node Buffer/Uint8Array is a valid fetch body at runtime; the DOM lib's
    // BodyInit type just doesn't model it, so cast.
    body: body as unknown as BodyInit,
    headers: { "Content-Type": contentType },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`R2 upload failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  return `${publicUrl!.replace(/\/+$/, "")}/${key}`;
}
