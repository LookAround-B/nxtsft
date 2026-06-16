import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@nxtsft/trpc", "@nxtsft/db", "@nxtsft/shared"],
  // Keep these out of the webpack bundle (native/server-only deps).
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "google-auth-library", "bcryptjs"],
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
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.r2.cloudflarecontent.com" },
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://*.r2.cloudflarecontent.com",
              "connect-src 'self' https://accounts.google.com",
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
