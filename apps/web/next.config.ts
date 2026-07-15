import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// Next only auto-loads env from this app's directory, but server-only secrets
// (R2_*, DATABASE_URL, etc.) live in the monorepo-root .env. Load any missing
// keys from there so server-side code (tRPC media uploads) sees them. Walks up
// from cwd to find the first .env, mirroring packages/db/client.ts.
(() => {
  try {
    // Find the monorepo root (has pnpm-workspace.yaml) and load its .env.
    let dir = process.cwd();
    while (dir && dir !== path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) break;
      dir = path.dirname(dir);
    }
    const envPath = path.join(dir, ".env");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (!m) continue;
      const key = m[1]!;
      if (process.env[key] !== undefined) continue; // app-local .env wins
      process.env[key] = m[2]!.replace(/^["']|["']$/g, "");
    }
  } catch {
    // best-effort; missing env surfaces as the existing "not configured" errors
  }
})();

// Hostname of the configured R2 public bucket (e.g. media.nxtsft.com or a
// pub-*.r2.dev domain), so next/image and the CSP allow listing photos.
const r2Host = (() => {
  try {
    // Uploads build URLs from R2_PUBLIC_URL (packages/trpc/src/r2.ts); accept
    // the legacy CLOUDFLARE_R2_PUBLIC_URL name too so the allowlist can't
    // drift from the host the stored image URLs actually use.
    const url = process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL;
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
})();
// Files that must never land in a serverless function bundle. Applied to every
// route that pulls in Prisma (the tRPC API + the DB-backed SEO page/route
// handlers), or the .next/cache alone bloats each function past Vercel's 250 MB
// limit:
//  - Non-Postgres Prisma query-engine WASM (we only use Postgres)
//  - Webpack build cache — hundreds of MB, never needed at runtime
//  - Client-side JS/CSS chunks — only the browser needs these
const FUNCTION_TRACING_EXCLUDES = [
  "**/@prisma/client/runtime/query_compiler_bg.mysql.*",
  "**/@prisma/client/runtime/query_compiler_bg.cockroachdb.*",
  "**/@prisma/client/runtime/query_compiler_bg.sqlite.*",
  "**/@prisma/client/runtime/query_compiler_bg.sqlserver.*",
  "**/.next/cache/**",
  "**/.next/static/**",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the file-tracing root to the monorepo root. Vercel "Root Directory =
  // apps/web" otherwise defaults it to apps/web and drops workspace deps that
  // live in the root pnpm store.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@nxtsft/trpc", "@nxtsft/db", "@nxtsft/shared"],
  // Keep these out of the webpack bundle (native/server-only deps).
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "google-auth-library",
    "bcryptjs",
    "aws4fetch",
  ],
  // Trim the bundle for every serverless function. outputFileTracingExcludes
  // keys are picomatch globs, not literal route paths — "[slug]" in a key is a
  // character class ("one of s/l/u/g"), not the dynamic segment, so a key like
  // "/agents/[slug]" silently matches nothing. "**" sidesteps that entirely by
  // applying the same excludes to every function.
  outputFileTracingExcludes: {
    "**": FUNCTION_TRACING_EXCLUDES,
  },
  images: {
    // The dev server's egress to images.unsplash.com is slow (~7s), which trips
    // Next's image-optimizer fetch timeout and yields 504s when several images
    // load at once. Skip the optimizer in dev so the browser fetches originals
    // directly; production (fast egress + CDN cache) keeps optimization on.
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.r2.cloudflarecontent.com" },
      { protocol: "https", hostname: "*.r2.dev" },
      ...(r2Host ? [{ protocol: "https" as const, hostname: r2Host }] : []),
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    // Host of baked (already-watermarked) uploads, so the display-time overlay
    // can skip them and not double-stamp. See WatermarkOverlay.
    NEXT_PUBLIC_R2_HOST: r2Host ?? "",
  },
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // GOL-288: /decor duplicated /interiors — one public directory now, named
  // "Interior Designers". Decor store data + admin tab remain; only the public
  // route folds into /interiors.
  async redirects() {
    return [
      { source: "/decor", destination: "/interiors", permanent: true },
      { source: "/decor/:path*", destination: "/interiors", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Content-Security-Policy is set per-request in middleware.ts instead
          // of here — it needs a fresh nonce on every request for script-src
          // (GOL-268 H3), which a static header can't provide.
        ],
      },
    ];
  },
  // Turbopack (dev: `next dev --turbopack`) resolves `.js` specifiers to their
  // `.ts`/`.tsx` source natively, so no extensionAlias is needed here — this
  // block just acknowledges Turbopack so Next doesn't warn about the webpack
  // config below going unused in dev.
  turbopack: {},
  // Used by `next build` (production still bundles with webpack). Maps `.js`
  // import specifiers (NodeNext-style, used by @nxtsft/trpc) to TS source.
  webpack: (config, { dev }) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    // Disable the persistent filesystem cache for production builds. Its
    // .next/cache/webpack/*.pack files (100s of MB) sit under the monorepo
    // tracing root and get pulled into every serverless function's file trace,
    // pushing them past Vercel's 250 MB limit (agents/[slug] hit 308 MB — all
    // webpack cache). The cache only speeds up local incremental rebuilds;
    // Vercel builds fresh, so there's nothing to gain there.
    if (!dev) config.cache = false;
    return config;
  },
};

export default nextConfig;
