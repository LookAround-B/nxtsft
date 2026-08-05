import type { ImageLoaderProps } from "next/image";

// Custom next/image loader that serves every image at its ORIGINAL URL, which
// disables Vercel's Image Optimization (metered — 5k transforms/mo on the free
// tier) entirely: with a custom loader configured, Next never routes images
// through /_next/image, it uses whatever URL this returns.
//
// We intentionally do NOT resize R2 photos through Cloudflare's /cdn-cgi/image
// endpoint. Uploads are already downscaled to ~1024px q0.7 JPEG on the client
// (see src/lib/image.ts) and Cloudflare R2 egress is free, so serving the
// stored object directly is cheap and needs no on-the-fly transform. Routing
// through /cdn-cgi/image on the cdn.nxtsft.com R2 custom domain returned
// cf-resized err=9401 for every request, so the original is also the reliable
// path. Unsplash dummy data and local /public assets pass through unchanged.
//
// (Git history keeps the Cloudflare-transform variant, if that resizer is ever
// made to work on the R2 custom-domain hostname.)
export default function passthroughLoader({ src }: ImageLoaderProps): string {
  return src;
}
