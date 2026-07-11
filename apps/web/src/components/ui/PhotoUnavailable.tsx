import { ImageOff } from "lucide-react";

/**
 * Placeholder slide shown after a listing's real photos when the owner hasn't
 * uploaded more (LA-345). No call-to-action — "Request more info" already lives
 * on the listing page, so this only signals that further photos aren't available.
 *
 * `dark` switches to the on-black styling used inside the full-screen lightbox.
 */
export function PhotoUnavailable({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-2.5 ${
        dark ? "bg-transparent" : "bg-secondary/40"
      } ${className}`}
    >
      <ImageOff
        size={40}
        strokeWidth={1.5}
        className={dark ? "text-white/40" : "text-muted-foreground/50"}
      />
      <div className="text-center">
        <p className={`text-sm font-semibold ${dark ? "text-white/90" : "text-navy"}`}>
          Photo not uploaded
        </p>
        <p className={`text-xs ${dark ? "text-white/50" : "text-muted-foreground"}`}>
          by the advertiser
        </p>
      </div>
    </div>
  );
}
