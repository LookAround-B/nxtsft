import type { ImageLoaderProps } from "next/image";

// Custom next/image loader that routes R2-hosted photos through Cloudflare's
// on-the-fly image resizer (/cdn-cgi/image) instead of Vercel's Image
// Optimization (which is metered — 5k transforms/mo on the free tier). R2 lives
// on the same Cloudflare zone as cdn.nxtsft.com, so transforms are free up to
// Cloudflare's own 5k/mo and never touch Vercel's meter.
//
// A custom loader is GLOBAL — Next calls it for every <Image>, and
// images.remotePatterns is ignored. So anything that isn't an R2 image
// (Unsplash dummy data, the fallback, local /public assets) is passed through
// untouched rather than forced through Cloudflare, since Cloudflare would need
// each third-party origin explicitly allow-listed to fetch it.
const R2_HOST = process.env.NEXT_PUBLIC_R2_HOST || "";

export default function cloudflareLoader({ src, width, quality }: ImageLoaderProps): string {
  // Resolve host. Relative srcs (local /public assets) throw against a base
  // and fall through to pass-through.
  let url: URL;
  try {
    url = new URL(src, "https://local.invalid");
  } catch {
    return src;
  }

  // Only R2 (cdn.nxtsft.com) images get transformed; everything else as-is.
  if (!R2_HOST || url.host !== R2_HOST) return src;

  const params = `width=${width},quality=${quality || 70},format=auto`;
  // Source path is relative to the same zone as the transform endpoint.
  const path = url.pathname.replace(/^\/+/, "");
  return `https://${R2_HOST}/cdn-cgi/image/${params}/${path}`;
}
