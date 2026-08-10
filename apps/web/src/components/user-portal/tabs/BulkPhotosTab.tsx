"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Head } from "./shared";
import { BulkPhotoUploader } from "@/components/photo-bulk/BulkPhotoUploader";

// Seller-side twin of the admin "Bulk Photos" tab — same uploader, rendered
// inside the portal shell so it's reachable from the sidebar instead of only
// via a text link buried in /list/bulk. The standalone /list/photos page stays
// for direct/bookmarked links.
export function BulkPhotosTab() {
  return (
    <>
      <Head
        t="Bulk Photos"
        s="Upload photos per property and copy their URLs — paste into the Image URLs column of a bulk listing file."
      />
      <BulkPhotoUploader />
      <p className="mt-5 text-xs text-muted-foreground">
        Got your URLs?{" "}
        <Link href="/list/bulk" className="inline-flex items-center gap-1 font-semibold text-accent underline underline-offset-2">
          Go to bulk listing upload <ArrowRight size={12} />
        </Link>
      </p>
    </>
  );
}
