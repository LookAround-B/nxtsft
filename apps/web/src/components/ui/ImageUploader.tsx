"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, X, GripVertical, Star } from "lucide-react";
import { toast } from "sonner";
import { validateImageFile } from "@/lib/file-validation";

export type UploadImage = { id: string; file: File; url: string };

type ImageUploaderProps = {
  images: UploadImage[];
  onChange: (next: UploadImage[]) => void;
  max?: number;
};

/**
 * Multi-image picker with drag-to-reorder. The first image is the cover.
 * Previews use object URLs, revoked when an image is removed or on unmount.
 */
export function ImageUploader({ images, onChange, max = 10 }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Revoke any outstanding object URLs when the component unmounts.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.forEach((img) => URL.revokeObjectURL(img.url)), []);

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const room = max - images.length;
    if (room <= 0) {
      toast.error(`You can upload up to ${max} photos.`);
      return;
    }

    const accepted: UploadImage[] = [];
    for (const file of incoming) {
      if (accepted.length >= room) {
        toast.error(`Only the first ${max} photos were added.`);
        break;
      }
      const err = validateImageFile(file);
      if (err) {
        toast.error(`${file.name}: ${err.message}`);
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
    }
    if (accepted.length) onChange([...images, ...accepted]);
  };

  const removeAt = (id: string) => {
    const target = images.find((img) => img.id === id);
    if (target) URL.revokeObjectURL(target.url);
    onChange(images.filter((img) => img.id !== id));
  };

  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const next = [...images];
    const from = next.findIndex((i) => i.id === fromId);
    const to = next.findIndex((i) => i.id === toId);
    if (from === -1 || to === -1) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    onChange(next);
  };

  return (
    <div>
      {/* Dropzone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition
          ${dragOver ? "border-accent bg-accent/5" : "border-border bg-secondary/30 hover:border-accent/40 hover:bg-accent/5"}`}
      >
        <ImagePlus size={22} className="text-accent" />
        <span className="text-sm font-semibold text-navy">Click to upload or drag photos here</span>
        <span className="text-xs text-muted-foreground">
          JPEG, PNG or WebP · up to 5MB each · {images.length}/{max}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />

      {/* Preview grid */}
      {images.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img, i) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => setDraggingId(img.id)}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggingId) reorder(draggingId, img.id);
                  setDraggingId(null);
                }}
                className={`group relative aspect-[4/3] cursor-grab overflow-hidden rounded-xl border bg-white shadow-sm transition active:cursor-grabbing
                  ${draggingId === img.id ? "opacity-40 ring-2 ring-accent" : "border-border"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />

                {i === 0 && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white shadow">
                    <Star size={10} fill="currentColor" /> Cover
                  </span>
                )}

                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-navy/60 text-white opacity-0 transition group-hover:opacity-100">
                  <GripVertical size={13} />
                </span>

                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() => removeAt(img.id)}
                  className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-rose-500 shadow transition hover:bg-rose-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Drag photos to reorder. The first photo is used as the cover image.
          </p>
        </>
      )}
    </div>
  );
}
