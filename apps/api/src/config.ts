function require(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env["PORT"] ?? "3001", 10),
  host: process.env["HOST"] ?? "0.0.0.0",
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  logLevel: process.env["LOG_LEVEL"] ?? "info",

  corsOrigins: (process.env["CORS_ORIGINS"] ?? "http://localhost:3000").split(",").map((s) => s.trim()),

  db: {
    url: require("DATABASE_URL"),
  },
} as const;

export const isDev = config.nodeEnv === "development";
