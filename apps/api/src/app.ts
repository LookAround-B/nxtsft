import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import compress from "@fastify/compress";
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify";
import { appRouter, type AppRouter } from "@nxtsft/trpc";
import { trustedClientIp } from "@nxtsft/shared";
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

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false, // CSP handled by Next.js for web; API returns JSON only
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: (_req: any, context: any) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Retry in ${Math.ceil(context.ttl / 1000)} seconds.`,
    }),
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

  // Request audit logging
  app.addHook("onResponse", (request, reply, done) => {
    if (request.url !== "/health") {
      app.log.info({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        ip: trustedClientIp(request.headers["x-forwarded-for"] as string, request.ip),
        responseTimeMs: Math.round(reply.elapsedTime),
      }, "request completed");
    }
    done();
  });

  // Health check
  app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

  return app;
}
