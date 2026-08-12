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
 * in the same order as the input files.
 *
 * The direct PUT is cross-origin, so it only works while the R2 bucket carries a
 * CORS policy allowing PUT from our origin. When that policy is missing (or the
 * network drops mid-batch) the browser rejects the preflight and `fetch` throws
 * an opaque `TypeError` — indistinguishable from "no internet" to the caller. So
 * a failed PUT stage falls back to the base64 `media.uploadImage` route, which
 * is same-origin and always works. Slower and capped at 5 MB per photo, but it
 * keeps uploads working instead of dead-ending on a bucket misconfiguration.
 */
export function usePresignUploader() {
  const createUploadUrls = trpc.media.createUploadUrls.useMutation();
  const uploadImage = trpc.media.uploadImage.useMutation();

  const upload = async (files: File[], folder: UploadFolder = "properties"): Promise<string[]> => {
    if (files.length === 0) return [];

    // Compress + watermark every photo up front (JPEG data URLs → Blobs).
    const dataUrls = await Promise.all(
      files.map((file) => compressImage(file, undefined, undefined, { watermark: true })),
    );
    const blobs = dataUrls.map(dataUrlToBlob);

    // Same-origin fallback: post the already-compressed base64 through the API.
    const viaApi = async () => {
      const urls: string[] = [];
      for (const dataUrl of dataUrls) {
        const { url } = await uploadImage.mutateAsync({
          contentType: "image/jpeg",
          data: dataUrl.slice(dataUrl.indexOf(",") + 1),
          folder,
        });
        urls.push(url);
      }
      return urls;
    };

    // One call presigns the whole batch — no bytes traverse the API.
    const { uploads } = await createUploadUrls.mutateAsync({
      files: blobs.map(() => ({ contentType: "image/jpeg" as const })),
      folder,
    });

    try {
      // PUT each blob straight to R2 in parallel.
      await Promise.all(
        uploads.map(async (u, i) => {
          const res = await fetch(u.uploadUrl, {
            method: "PUT",
            body: blobs[i]!,
            headers: { "Content-Type": "image/jpeg" },
          });
          if (!res.ok) throw new Error(`R2 PUT failed (${res.status})`);
        }),
      );
    } catch (err) {
      console.warn("[upload] direct R2 PUT failed, falling back to API upload", err);
      return viaApi();
    }

    return uploads.map((u) => u.publicUrl);
  };

  return { upload, isPending: createUploadUrls.isPending || uploadImage.isPending };
}
