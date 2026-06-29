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
    return process.env.CLOUDFLARE_R2_PUBLIC_URL
      ? new URL(process.env.CLOUDFLARE_R2_PUBLIC_URL).hostname
      : null;
  } catch {
    return null;
  }
})();
const r2ImgSrc = r2Host ? ` https://${r2Host}` : "";

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
  // Trim files that must not land in serverless function bundles:
  // - Non-Postgres Prisma WASM compilers (we only use Postgres)
  // - Webpack build cache and client-side static chunks (not needed at runtime)
  outputFileTracingExcludes: {
    "/api/**": [
      "**/@prisma/client/runtime/query_compiler_bg.mysql.*",
      "**/@prisma/client/runtime/query_compiler_bg.cockroachdb.*",
      "**/@prisma/client/runtime/query_compiler_bg.sqlite.*",
      "**/@prisma/client/runtime/query_compiler_bg.sqlserver.*",
      // Webpack build cache — can be 100s of MB, never needed at runtime
      "**/.next/cache/**",
      // Client-side JS/CSS chunks — only the browser needs these
      "**/.next/static/**",
    ],
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
  },
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
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
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://accounts.google.com https://checkout.razorpay.com",
              // Mapbox GL renders tiles in a blob web worker.
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://*.r2.cloudflarecontent.com https://*.r2.dev https://api.mapbox.com https://*.razorpay.com" +
                r2ImgSrc,
              "connect-src 'self' https://accounts.google.com https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://*.razorpay.com https://lumberjack.razorpay.com",
              // Razorpay checkout renders its payment UI (cards, UPI, 3DS/OTP) in an iframe.
              "frame-src https://accounts.google.com https://api.razorpay.com https://checkout.razorpay.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  // Turbopack (dev: `next dev --turbopack`) resolves `.js` specifiers to their
  // `.ts`/`.tsx` source natively, so no extensionAlias is needed here — this
  // block just acknowledges Turbopack so Next doesn't warn about the webpack
  // config below going unused in dev.
  turbopack: {
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
  // Used by `next build` (production still bundles with webpack). Maps `.js`
  // import specifiers (NodeNext-style, used by @nxtsft/trpc) to TS source.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
