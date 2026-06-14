import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
