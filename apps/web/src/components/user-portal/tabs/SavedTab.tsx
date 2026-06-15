"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, X } from "lucide-react";
import { toast } from "sonner";
import { Badge, Section } from "@/components/portal/PortalShell";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Head } from "./shared";

type FavItem = {
  id: string;
  slug: string | null;
  title: string;
  price: number;
  images: string[];
  bhk: string | null;
  location: { city: string; locality: string } | null;
};

export function SavedTab() {
  const { session } = useAuth();
  const [sortBy, setSortBy] = useState<"price" | "date">("date");
  const [filterCity, setFilterCity] = useState("");

  const favQ = trpc.users.favorites.useQuery(undefined, { enabled: !!session });
  const removeFav = trpc.users.removeFavorite.useMutation({ onSuccess: () => favQ.refetch() });

  const items = (favQ.data ?? []) as FavItem[];
  const cityOptions = [...new Set(items.map((p) => p.location?.city ?? ""))].filter(Boolean) as string[];

  const sorted = [...items].sort((a, b) => {
    if (sortBy === "price") return a.price - b.price;
    return 0;
  });

  const filtered = sorted.filter((p) => {
    if (filterCity && p.location?.city !== filterCity) return false;
    return true;
  });

  return (
    <>
      <Head t="Saved Properties" s={`${items.length} home${items.length !== 1 ? "s" : ""} saved.`} />

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Sort:</span>
          {(["date", "price"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${sortBy === s ? "bg-accent text-accent-foreground" : "border border-border hover:border-accent/50"}`}
            >
              {s === "price" ? "Price" : "Date Added"}
            </button>
          ))}
        </div>
        {/* Filter City */}
        <Select value={filterCity || "__all"} onValueChange={(v) => setFilterCity(v === "__all" ? "" : v)}>
          <SelectTrigger size="sm" className="min-w-[7.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Cities</SelectItem>
            {cityOptions.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterCity && (
          <button
            onClick={() => setFilterCity("")}
            className="flex items-center gap-1 text-xs text-accent"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Grid */}
      {favQ.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-lg border border-border bg-white" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 py-16 text-center">
          <Heart size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-muted-foreground">
            {items.length === 0
              ? "No saved properties yet. Browse and save homes you like."
              : "No saved properties match your filters."}
          </p>
          {filterCity && (
            <button
              onClick={() => setFilterCity("")}
              className="mt-2 text-xs text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((p) => {
            const img = p.images?.[0] ?? "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=70";
            const city = p.location?.city ?? "";
            const locality = p.location?.locality ?? "";
            const priceLabel = p.price >= 1e7
              ? `₹${(p.price / 1e7).toFixed(2)} Cr`
              : p.price >= 1e5
              ? `₹${(p.price / 1e5).toFixed(1)} L`
              : `₹${p.price.toLocaleString("en-IN")}`;
            return (
              <div key={p.id} className="overflow-hidden rounded-lg border border-border bg-white">
                <Link href={`/properties/${p.slug ?? p.id}`}>
                  <div className="relative aspect-[4/3]">
                    <Image src={img} alt="" fill className="object-cover" />
                  </div>
                </Link>
                <div className="p-3">
                  <div className="text-xs text-muted-foreground">
                    {locality}{locality && city ? " · " : ""}{city}{p.bhk ? ` · ${p.bhk}` : ""}
                  </div>
                  <div className="text-sm font-semibold text-navy">{p.title}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-display text-base font-bold text-accent">{priceLabel}</span>
                    <button
                      onClick={() => {
                        removeFav.mutate({ propertyId: p.id });
                        toast(`Removed from saved`);
                      }}
                      className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                    >
                      <X size={11} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
