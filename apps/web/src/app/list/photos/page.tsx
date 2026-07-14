"use client";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BulkPhotoUploader } from "@/components/photo-bulk/BulkPhotoUploader";

export default function BulkPhotosPage() {
  const { session } = useAuth();

  if (session === undefined) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading…</div>;
  }

  if (!session || !["home-seller", "admin", "super-admin"].includes(session.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-white p-10 text-center shadow-sm">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <h2 className="font-display text-xl font-black text-navy">Home Sellers &amp; admins only</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bulk photo upload is for Home Seller or admin accounts.
          </p>
          <Link href={session ? "/" : "/register"} className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white transition hover:opacity-90">
            {session ? "Go home" : "Register as Home Seller"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/list/bulk" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-accent">
          <ArrowLeft size={15} /> Back to bulk upload
        </Link>

        <h1 className="mt-4 font-display text-3xl font-black text-navy">Bulk photo upload</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload photos for many properties at once and download their URLs. Paste any
          property&apos;s URLs into the Image URLs column of your bulk listing file — or keep them
          to attach later.
        </p>

        <div className="mt-8">
          <BulkPhotoUploader />
        </div>
      </div>
    </div>
  );
}
