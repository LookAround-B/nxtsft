import type { NextConfig } from "next";
import path from "path";

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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://accounts.google.com",
              // Mapbox GL renders tiles in a blob web worker.
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://*.r2.cloudflarecontent.com https://*.r2.dev https://api.mapbox.com" +
                r2ImgSrc,
              "connect-src 'self' https://accounts.google.com https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com",
              "frame-src https://accounts.google.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
