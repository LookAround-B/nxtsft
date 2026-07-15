"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SafeImage } from "@/components/ui/SafeImage";
import { WatermarkOverlay } from "@/components/ui/WatermarkOverlay";
import { PhotoUnavailable } from "@/components/ui/PhotoUnavailable";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ImageOff } from "lucide-react";

type GalleryLightboxProps = {
  images: string[];
  index: number;
  open: boolean;
  title?: string;
  /** LA-345: append one "Photo not uploaded" slide after the real images and
   *  stop navigation there (no loop-around). */
  trailingPlaceholder?: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

const SWIPE_THRESHOLD = 50;

/** Full-screen image viewer with zoom, swipe, and keyboard navigation. */
export function GalleryLightbox({
  images,
  index,
  open,
  title,
  trailingPlaceholder = false,
  onClose,
  onIndexChange,
}: GalleryLightboxProps) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const touchStartX = useRef<number | null>(null);

  const total = images.length + (trailingPlaceholder ? 1 : 0);
  const onPlaceholder = trailingPlaceholder && index >= images.length;

  const go = useCallback(
    (dir: number) => {
      if (total < 2) return;
      setZoomed(false);
      if (trailingPlaceholder) {
        // Clamp — the placeholder is the last slide and the carousel stops there.
        onIndexChange(Math.min(total - 1, Math.max(0, index + dir)));
      } else {
        onIndexChange((index + dir + images.length) % images.length);
      }
    },
    [images.length, index, onIndexChange, total, trailingPlaceholder],
  );

  // Reset zoom whenever the active image or open-state changes.
  useEffect(() => setZoomed(false), [index, open]);

  // Keyboard navigation + body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, go, onClose]);

  if (!open || images.length === 0) return null;

  const src = images[index] ?? images[0] ?? "";

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title ? `${title} — image gallery` : "Image gallery"}
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white/90"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 text-sm font-medium">
          {title && <span className="truncate">{title} · </span>}
          <span className="font-mono text-white/60">
            {index + 1} / {total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!onPlaceholder && (
            <button
              type="button"
              aria-label={zoomed ? "Zoom out" : "Zoom in"}
              onClick={() => setZoomed((z) => !z)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            >
              {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
            </button>
          )}
          <button
            type="button"
            aria-label="Close gallery"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touchStartX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || zoomed) return;
          const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
          if (Math.abs(delta) > SWIPE_THRESHOLD) go(delta < 0 ? 1 : -1);
          touchStartX.current = null;
        }}
      >
        {total > 1 && (
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => go(-1)}
            disabled={trailingPlaceholder && index === 0}
            className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {onPlaceholder ? (
          <div className="relative h-full w-full max-w-5xl overflow-hidden">
            <PhotoUnavailable dark />
          </div>
        ) : (
          <div
            className={`relative h-full w-full max-w-5xl overflow-hidden ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            onClick={() => setZoomed((z) => !z)}
            onMouseMove={handlePointerMove}
          >
            <SafeImage
              src={src}
              alt={title ?? "Property image"}
              fill
              sizes="100vw"
              className="object-contain transition-transform duration-200"
              style={{
                transform: zoomed ? "scale(2.2)" : "scale(1)",
                transformOrigin: `${origin.x}% ${origin.y}%`,
              }}
              priority
            />
            <WatermarkOverlay src={src} />
          </div>
        )}

        {total > 1 && (
          <button
            type="button"
            aria-label="Next image"
            onClick={() => go(1)}
            disabled={trailingPlaceholder && index === total - 1}
            className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {total > 1 && (
        <div
          className="flex justify-center gap-2 overflow-x-auto px-4 pb-4"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              aria-label={`View image ${i + 1}`}
              onClick={() => {
                setZoomed(false);
                onIndexChange(i);
              }}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${i === index ? "border-accent" : "border-transparent opacity-60 hover:opacity-100"}`}
            >
              <SafeImage src={img} alt="" fill className="object-cover" sizes="80px" />
            </button>
          ))}
          {trailingPlaceholder && (
            <button
              type="button"
              aria-label="Photo not uploaded"
              onClick={() => {
                setZoomed(false);
                onIndexChange(images.length);
              }}
              className={`relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-white/5 transition ${onPlaceholder ? "border-accent" : "border-transparent opacity-60 hover:opacity-100"}`}
            >
              <ImageOff size={18} className="text-white/40" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
