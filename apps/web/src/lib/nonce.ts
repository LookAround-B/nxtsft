import { headers } from "next/headers";

/**
 * Reads the per-request CSP nonce middleware.ts generated for this request.
 * Any inline <script> (currently just the JSON-LD tags on detail pages) must
 * pass this as its `nonce` prop or the browser will block it under the
 * nonce-based CSP (GOL-268 H3 — replaces script-src 'unsafe-inline').
 */
export async function getNonce(): Promise<string | undefined> {
  const h = await headers();
  return h.get("x-nonce") ?? undefined;
}
