"use client";
import { useState, useMemo } from "react";
import { Star, Trash2, PlusCircle, X, Search } from "lucide-react";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { PageHead } from "./PageHead";

type ReviewRow = {
  id: string;
  rating: number;
  title: string;
  content: string | null;
  helpful: number;
  createdAt: string;
  author: { id: string; name: string; email: string; avatar: string | null } | null;
  property: { id: string; title: string; slug: string } | null;
};

function StarRow({ value, size = 13, onSelect }: { value: number; size?: number; onSelect?: (n: number) => void }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= value;
        const star = (
          <Star
            size={size}
            className={filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}
          />
        );
        return onSelect ? (
          <button key={i} type="button" onClick={() => onSelect(i)} className="cursor-pointer transition hover:scale-110">
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        );
      })}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Post Review Panel ────────────────────────────────────────────────────────
function PostReviewPanel({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [form, setForm] = useState({ propertyId: "", rating: 0, title: "", content: "" });
  const [propSearch, setPropSearch] = useState("");

  const propsQ = trpc.admin.properties.list.useQuery({ limit: 100 });
  const properties = (propsQ.data?.items ?? []) as { id: string; title: string; location: { city: string } | null }[];

  const filtered = useMemo(() => {
    const q = propSearch.toLowerCase().trim();
    if (!q) return properties.slice(0, 12);
    return properties.filter((p) => p.title.toLowerCase().includes(q)).slice(0, 12);
  }, [propSearch, properties]);

  const createMutation = trpc.admin.reviews.create.useMutation({
    onSuccess: () => {
      toast.success("Review posted!");
      onPosted();
      onClose();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const selectedProp = properties.find((p) => p.id === form.propertyId);

  const submit = () => {
    if (!form.propertyId) return toast.error("Select a property.");
    if (form.rating < 1) return toast.error("Pick a star rating.");
    if (form.title.trim().length < 3) return toast.error("Title must be at least 3 characters.");
    createMutation.mutate({
      propertyId: form.propertyId,
      rating: form.rating,
      title: form.title.trim(),
      content: form.content.trim() || undefined,
    });
  };

  return (
    <div className="mb-4 rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-navy">Post a Review (as Admin)</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>

      {/* Property picker */}
      {selectedProp ? (
        <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
          <span className="text-sm font-semibold text-navy truncate">{selectedProp.title}</span>
          <button
            onClick={() => setForm((f) => ({ ...f, propertyId: "" }))}
            className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={propSearch}
            onChange={(e) => setPropSearch(e.target.value)}
            placeholder="Search property…"
            className="w-full rounded-lg border border-border bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-accent"
          />
          {filtered.length > 0 && (
            <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-lg border border-border bg-white shadow-lg max-h-48 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setForm((f) => ({ ...f, propertyId: p.id })); setPropSearch(""); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  <span className="font-semibold text-navy truncate">{p.title}</span>
                  {p.location && (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{p.location.city}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-navy">Rating:</span>
        <StarRow value={form.rating} size={20} onSelect={(n) => setForm((f) => ({ ...f, rating: n }))} />
      </div>

      <input
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        placeholder="Review title (e.g. 'Well-maintained and professional')"
        maxLength={100}
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
      />

      <textarea
        value={form.content}
        onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
        placeholder="Detailed review (optional)"
        rows={3}
        maxLength={1000}
        className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
      />

      <button
        onClick={submit}
        disabled={createMutation.isPending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {createMutation.isPending ? "Posting…" : "Post Review"}
      </button>
    </div>
  );
}

// ─── Main Reviews Tab ─────────────────────────────────────────────────────────
export function ReviewsTab() {
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [showPostForm, setShowPostForm] = useState(false);

  const reviewsQ = trpc.admin.reviews.list.useQuery({ limit: 100, rating: ratingFilter });
  const items = (reviewsQ.data?.items ?? []) as unknown as ReviewRow[];

  const deleteMutation = trpc.admin.reviews.delete.useMutation({
    onSuccess: () => { toast.success("Review deleted."); void reviewsQ.refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const avg = items.length ? +(items.reduce((a, r) => a + r.rating, 0) / items.length).toFixed(1) : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: items.filter((r) => r.rating === s).length,
  }));

  return (
    <>
      <PageHead
        title="Reviews"
        subtitle="Moderate and post property reviews across the platform."
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Reviews" value={String(items.length)} sub="All properties" />
        <StatCard label="Avg Rating" value={avg ? `${avg} ★` : "—"} sub="Platform average" />
        <StatCard
          label="5-Star"
          value={String(dist.find((d) => d.stars === 5)?.count ?? 0)}
          sub="Excellent reviews"
        />
        <StatCard
          label="1–2 Star"
          value={String(dist.filter((d) => d.stars <= 2).reduce((a, d) => a + d.count, 0))}
          sub="Needs attention"
          accent="text-accent"
        />
      </div>

      {/* Rating distribution + actions */}
      <div className="flex flex-wrap items-center gap-2 mt-1">
        <span className="text-xs font-semibold text-muted-foreground">Filter by rating:</span>
        <button
          onClick={() => setRatingFilter(undefined)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${!ratingFilter ? "bg-navy text-white" : "border border-border hover:bg-secondary"}`}
        >
          All
        </button>
        {[5, 4, 3, 2, 1].map((s) => (
          <button
            key={s}
            onClick={() => setRatingFilter(ratingFilter === s ? undefined : s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${ratingFilter === s ? "bg-amber-500 text-white" : "border border-border hover:bg-secondary"}`}
          >
            {s} ★
          </button>
        ))}
        <button
          onClick={() => setShowPostForm((v) => !v)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
        >
          <PlusCircle size={13} />
          Post Review
        </button>
      </div>

      {/* Post form */}
      {showPostForm && (
        <PostReviewPanel onClose={() => setShowPostForm(false)} onPosted={() => void reviewsQ.refetch()} />
      )}

      {/* Reviews table */}
      <Section title={`All Reviews ${items.length > 0 ? `(${items.length})` : ""}`}>
        {reviewsQ.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <Star size={28} className="mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No reviews found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((r) => {
              const initials = (r.author?.name ?? "?")
                .split(" ")
                .map((s) => s[0] ?? "")
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <div key={r.id} className="flex gap-4 py-4 first:pt-0">
                  {/* Author */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-accent text-xs font-black text-white">
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-navy">{r.author?.name ?? "Unknown"}</span>
                          <StarRow value={r.rating} />
                        </div>
                        {r.property && (
                          <a
                            href={`/properties/${r.property.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline truncate"
                          >
                            {r.property.title}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] text-muted-foreground">{fmtDate(r.createdAt)}</span>
                        <button
                          onClick={() => {
                            if (confirm("Delete this review?")) {
                              deleteMutation.mutate({ id: r.id });
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-accent hover:text-accent disabled:opacity-40"
                          title="Delete review"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{r.title}</div>
                    {r.content && <p className="mt-0.5 text-xs text-muted-foreground">{r.content}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <Badge tone="default">👍 {r.helpful} helpful</Badge>
                      <span className="text-[11px] text-muted-foreground">{r.author?.email}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
