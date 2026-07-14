"use client";
import { trpc } from "@/lib/trpc";
import { compressImage } from "@/lib/image";

/** Convert a data URL (e.g. from compressImage) to a Blob for direct upload. */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

type UploadFolder =
  | "properties" | "avatars" | "kyc" | "site" | "referrals" | "interiors" | "decor";

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
      files.map(async (file) => dataUrlToBlob(await compressImage(file, undefined, undefined, { watermark: true }))),
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
