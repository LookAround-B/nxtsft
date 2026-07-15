"use client";
import { trpc } from "@/lib/trpc";
import { compressImage } from "@/lib/image";

/**
 * Convert a data URL (e.g. from compressImage) to a Blob for direct upload.
 * Decodes the base64 by hand — `fetch(dataUrl)` is blocked by the CSP
 * `connect-src` directive, which doesn't (and shouldn't) allow `data:`.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64 = ""] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

type UploadFolder =
  | "properties" | "avatars" | "kyc" | "site" | "referrals" | "interiors" | "decor" | "bulk-photos";

/**
 * Uploads photos straight to R2 via presigned PUT URLs, bypassing the tRPC
 * function (no base64 round-trip). Each photo is compressed + watermarked
 * client-side first, then PUT directly to the bucket. Returns the public URLs
 * in the same order as the input files. Throws if storage isn't configured or a
 * PUT fails — callers decide how to fall back.
 */
export function usePresignUploader() {
  const createUploadUrls = trpc.media.createUploadUrls.useMutation();

  const upload = async (files: File[], folder: UploadFolder = "properties"): Promise<string[]> => {
    if (files.length === 0) return [];

    // Compress + watermark every photo up front (JPEG data URLs → Blobs).
    const blobs = await Promise.all(
      files.map(async (file) => dataUrlToBlob(await compressImage(file))),
    );

    // One call presigns the whole batch — no bytes traverse the API.
    const { uploads } = await createUploadUrls.mutateAsync({
      files: blobs.map(() => ({ contentType: "image/jpeg" as const })),
      folder,
    });

    // PUT each blob straight to R2 in parallel.
    await Promise.all(
      uploads.map(async (u, i) => {
        const res = await fetch(u.uploadUrl, {
          method: "PUT",
          body: blobs[i]!,
          headers: { "Content-Type": "image/jpeg" },
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      }),
    );

    return uploads.map((u) => u.publicUrl);
  };

  return { upload, isPending: createUploadUrls.isPending };
}
