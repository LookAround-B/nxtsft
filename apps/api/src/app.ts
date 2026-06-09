import Fastify from "fastify";
import cors from "@fastify/cors";
import compress from "@fastify/compress";
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify";
import { appRouter, type AppRouter } from "@nxtsft/trpc";
import { createContext } from "./context.js";
import { config, isDev } from "./config.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      ...(isDev
        ? {
            transport: {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "HH:MM:ss" },
            },
          }
        : {}),
    },
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  await app.register(compress, { global: true });

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    useWSS: false,
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ path, error }: any) {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          app.log.error({ path }, error.message);
        }
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
  });

  // Health check
  app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

  return app;
}
