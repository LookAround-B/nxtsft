"use client";
import { useState, useMemo } from "react";
import { Star, Trash2, PlusCircle, X, Search, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { ListSkeleton } from "@/components/ui/skeleton";
import { PageHead } from "./PageHead";

type ReviewRow = {
  id: string;
  rating: number;
  title: string;
  content: string | null;
  helpful: number;
  status: string;
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
  const [statusFilter, setStatusFilter] = useState<"Pending" | "Approved" | "Declined" | undefined>("Pending");
  const [showPostForm, setShowPostForm] = useState(false);

  // limitSchema caps list inputs at 100 — anything higher fails validation with a 400.
  const reviewsQ = trpc.admin.reviews.list.useQuery({ limit: 100, rating: ratingFilter, status: statusFilter });
  const allQ = trpc.admin.reviews.list.useQuery({ limit: 100 });
  const items = (reviewsQ.data?.items ?? []) as unknown as ReviewRow[];
  const allItems = (allQ.data?.items ?? []) as unknown as ReviewRow[];

  const deleteMutation = trpc.admin.reviews.delete.useMutation({
    onSuccess: () => { toast.success("Review deleted."); void reviewsQ.refetch(); void allQ.refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const moderateMutation = trpc.admin.reviews.moderate.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.status === "Approved" ? "Review approved — now live." : "Review declined.");
      void reviewsQ.refetch();
      void allQ.refetch();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const pendingCount = allItems.filter((r) => r.status === "Pending").length;
  const approvedCount = allItems.filter((r) => r.status === "Approved").length;
  const avg = approvedCount
    ? +(allItems.filter((r) => r.status === "Approved").reduce((a, r) => a + r.rating, 0) / approvedCount).toFixed(1)
    : 0;

  return (
    <>
      <PageHead
        title="Reviews"
        subtitle="Approve or decline user reviews before they go live on the site."
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Pending Approval" value={String(pendingCount)} sub="Needs your action" accent={pendingCount > 0 ? "text-amber-600" : undefined} />
        <StatCard label="Approved & Live" value={String(approvedCount)} sub="Visible to buyers" />
        <StatCard label="Avg Rating" value={avg ? `${avg} ★` : "—"} sub="Approved reviews" />
        <StatCard
          label="Declined"
          value={String(allItems.filter((r) => r.status === "Declined").length)}
          sub="Not published"
        />
      </div>

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-2 mt-1">
        <span className="text-xs font-semibold text-muted-foreground">Status:</span>
        {([undefined, "Pending", "Approved", "Declined"] as const).map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${statusFilter === s ? "bg-navy text-white" : "border border-border hover:bg-secondary"}`}
          >
            {s ?? "All"}{s === "Pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
        <span className="mx-1 text-border">|</span>
        <span className="text-xs font-semibold text-muted-foreground">Rating:</span>
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
        <PostReviewPanel onClose={() => setShowPostForm(false)} onPosted={() => { void reviewsQ.refetch(); void allQ.refetch(); }} />
      )}

      {/* Reviews table */}
      <Section title={`${statusFilter ?? "All"} Reviews ${items.length > 0 ? `(${items.length})` : ""}`}>
        {reviewsQ.isLoading ? (
          <ListSkeleton rows={5} />
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <Star size={28} className="mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {statusFilter === "Pending" ? "No pending reviews — all caught up!" : "No reviews found."}
            </p>
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
              const statusColor =
                r.status === "Approved" ? "bg-emerald-100 text-emerald-700"
                : r.status === "Declined" ? "bg-rose-100 text-rose-700"
                : "bg-amber-100 text-amber-700";
              return (
                <div key={r.id} className="flex gap-4 py-4 first:pt-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-accent text-xs font-black text-white">
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-navy">{r.author?.name ?? "Unknown"}</span>
                          <StarRow value={r.rating} />
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>
                            {r.status}
                          </span>
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
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-[11px] text-muted-foreground">{fmtDate(r.createdAt)}</span>
                        {r.status !== "Approved" && (
                          <button
                            onClick={() => moderateMutation.mutate({ id: r.id, status: "Approved" })}
                            disabled={moderateMutation.isPending}
                            className="grid h-7 w-7 place-items-center rounded-lg border border-emerald-200 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-40"
                            title="Approve"
                          >
                            <CheckCircle size={13} />
                          </button>
                        )}
                        {r.status !== "Declined" && (
                          <button
                            onClick={() => moderateMutation.mutate({ id: r.id, status: "Declined" })}
                            disabled={moderateMutation.isPending}
                            className="grid h-7 w-7 place-items-center rounded-lg border border-rose-200 text-rose-500 transition hover:bg-rose-50 disabled:opacity-40"
                            title="Decline"
                          >
                            <XCircle size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm("Delete this review?")) deleteMutation.mutate({ id: r.id }); }}
                          disabled={deleteMutation.isPending}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-accent hover:text-accent disabled:opacity-40"
                          title="Delete"
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
