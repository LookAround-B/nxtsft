import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { router, protectedProcedure, publicProcedure } from "../server";
import { uploadToR2, isR2Configured, presignUploadUrl, publicUrlFor } from "../r2";

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const CONTENT_TYPE = z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const FOLDER = z.enum(["properties", "avatars", "kyc", "site", "referrals", "interiors", "decor", "bulk-photos"]);

// Confirm the decoded bytes actually start with the magic number for the
// declared content type. The client-supplied `contentType` is untrusted — a
// caller could otherwise store arbitrary bytes (HTML, executables) under an
// image/* content type on a public bucket.
function magicMatches(bytes: Buffer, contentType: string): boolean {
  switch (contentType) {
    case "image/jpeg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return (
        bytes.length >= 8 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
      );
    case "image/webp":
      return (
        bytes.length >= 12 &&
        bytes.toString("ascii", 0, 4) === "RIFF" &&
        bytes.toString("ascii", 8, 12) === "WEBP"
      );
    case "application/pdf":
      return bytes.length >= 5 && bytes.toString("ascii", 0, 5) === "%PDF-";
    default:
      return false;
  }
}

export const mediaRouter = router({
  // Lets the client decide whether to upload to R2 or fall back to a local
  // preview when storage isn't configured (e.g. local dev without creds).
  storageStatus: publicProcedure.query(() => ({ configured: isR2Configured() })),

  // Presign PUT URLs so the browser uploads straight to R2, bypassing this
  // function (no base64 round-trip). One call presigns a whole batch — used by
  // the bulk photo→URL helper and the single-listing form. The client compresses
  // + watermarks before PUTting, so bytes never traverse the API.
  createUploadUrls: protectedProcedure
    .input(
      z.object({
        files: z.array(z.object({ contentType: CONTENT_TYPE })).min(1).max(50),
        folder: FOLDER.default("properties"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!isR2Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Image storage is not configured.",
        });
      }
      const uploads = await Promise.all(
        input.files.map(async (f) => {
          const key = `${input.folder}/${ctx.user.id}/${randomUUID()}.${EXTENSION[f.contentType]}`;
          return {
            uploadUrl: await presignUploadUrl(key, f.contentType),
            publicUrl: publicUrlFor(key),
            key,
          };
        }),
      );
      return { uploads };
    }),

  uploadImage: protectedProcedure
    .input(
      z.object({
        contentType: CONTENT_TYPE,
        data: z.string().min(1).max(8_000_000), // base64-encoded bytes
        folder: FOLDER.default("properties"),
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
      if (!magicMatches(bytes, input.contentType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File contents do not match the declared file type.",
        });
      }

      const key = `${input.folder}/${ctx.user.id}/${randomUUID()}.${EXTENSION[input.contentType]}`;
      const url = await uploadToR2(key, bytes, input.contentType);
      return { url };
    }),
});
