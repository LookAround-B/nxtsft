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
  // Vercel "Root Directory = apps/web" makes Next default the file-tracing root
  // to apps/web, which drops anything under ../../node_modules (the pnpm store
  // lives at the monorepo root). Pin the root so the Prisma engine include below
  // actually resolves on Vercel — without this, login fails with
  // "Query Engine for runtime rhel-openssl-3.0.x not found".
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@nxtsft/trpc", "@nxtsft/db", "@nxtsft/shared"],
  // Keep these out of the webpack bundle (native/server-only deps).
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "google-auth-library",
    "bcryptjs",
    // isomorphic-dompurify pulls in jsdom, which reads default-stylesheet.css
    // via fs at runtime — bundling breaks that relative path.
    "isomorphic-dompurify",
  ],
  // @prisma/client ships engines for every DB + the Prisma CLI engines (~135MB),
  // blowing past Vercel's 250MB function limit. We only use Postgres on Node, so
  // drop the CLI engines and the non-Postgres WASM engines from the API functions.
  outputFileTracingExcludes: {
    "/api/**": [
      "**/@prisma/engines/**",
      "**/prisma/build/**",
      "**/@prisma/client/runtime/query_engine_bg.mysql.*",
      "**/@prisma/client/runtime/query_engine_bg.cockroachdb.*",
      "**/@prisma/client/runtime/query_engine_bg.sqlite.*",
      "**/@prisma/client/runtime/query_engine_bg.sqlserver.*",
      "**/@prisma/client/runtime/query_engine_bg.react-native.*",
      "**/query_engine-windows.dll.node",
    ],
  },
  // Prisma loads the Postgres query engine (.so.node) via a runtime path that
  // @vercel/nft can't trace statically, so it's never copied into the function
  // bundle → "Query Engine not found" on Vercel. Force-include it. Globs cover
  // both the pnpm virtual store and a hoisted .prisma/client layout; non-matching
  // patterns are harmless.
  outputFileTracingIncludes: {
    // "**/" makes these match regardless of whether the tracing root resolves
    // to apps/web or the monorepo root on Vercel — the brittle "../../" form
    // silently matched nothing when Root Directory = apps/web.
    "/api/**": ["**/.prisma/client/*.so.node", "**/@prisma+client*/**/*.so.node"],
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
