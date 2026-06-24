import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { router, protectedProcedure, publicProcedure } from "../server.js";
import { uploadToR2, isR2Configured } from "../r2.js";

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export const mediaRouter = router({
  // Lets the client decide whether to upload to R2 or fall back to a local
  // preview when storage isn't configured (e.g. local dev without creds).
  storageStatus: publicProcedure.query(() => ({ configured: isR2Configured() })),

  uploadImage: protectedProcedure
    .input(
      z.object({
        contentType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
        data: z.string().min(1).max(8_000_000), // base64-encoded bytes
        folder: z.enum(["properties", "avatars", "kyc", "site"]).default("properties"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!isR2Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Image storage is not configured.",
        });
      }

      const bytes = Buffer.from(input.data, "base64");
      if (bytes.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Empty image file." });
      }
      if (bytes.length > MAX_BYTES) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "File exceeds the 5 MB limit." });
      }

      const key = `${input.folder}/${ctx.user.id}/${randomUUID()}.${EXTENSION[input.contentType]}`;
      const url = await uploadToR2(key, bytes, input.contentType);
      return { url };
    }),
});
