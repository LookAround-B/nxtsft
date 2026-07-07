/**
 * Downscale + re-encode an image file to a compact JPEG data URL. Used to keep
 * listing photo previews small enough to persist (localStorage demo store) and
 * cheap to ship over the wire — the same client-side compression a production
 * upload pipeline would do before pushing to object storage.
 *
 * `watermark: true` stamps the NxtSft brand mark onto the image before
 * encoding — mandatory for listing photos (LA-298) so downloaded/scraped
 * images stay attributed. Off by default: avatars, KYC documents and referral
 * proofs must not be branded.
 */
export async function compressImage(
  file: File,
  maxDim = 1024,
  quality = 0.7,
  opts: { watermark?: boolean } = {},
): Promise<string> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return readAsDataUrl(file); // canvas unsupported — fall back to raw
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap) bitmap.close();

  if (opts.watermark) drawWatermark(ctx, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * "NxtSft.com" bottom-right, sized relative to the image. White fill with a
 * dark shadow keeps it legible on both bright skies and dark interiors.
 */
function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const fontSize = Math.max(14, Math.round(width * 0.035));
  const pad = Math.round(fontSize * 0.75);

  ctx.save();
  ctx.font = `700 ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.globalAlpha = 0.75;
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = fontSize * 0.25;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("NxtSft.com", width - pad, height - pad);
  ctx.restore();
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // some formats fail createImageBitmap — fall through to <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}
