import { defineConfig } from "prisma/config";
import { join } from "path";

try {
  process.loadEnvFile(join(process.cwd(), "../../.env"));
} catch (e) {}

try {
  process.loadEnvFile(join(process.cwd(), ".env"));
} catch (e) {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
