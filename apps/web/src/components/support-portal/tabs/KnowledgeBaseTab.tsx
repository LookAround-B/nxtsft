"use client";
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { PageHead } from "./shared";

type Article = { id: string; title: string; category: string; views: number; updated: string; body?: string };

const KB_ARTICLES: Article[] = [
  { id: "KB-01", title: "How to resolve billing disputes", category: "Billing", views: 142, updated: "2026-05-30" },
  { id: "KB-02", title: "Listing accuracy correction workflow", category: "Listing Accuracy", views: 98, updated: "2026-06-01" },
  { id: "KB-03", title: "Technical troubleshooting — OTP", category: "Technical", views: 87, updated: "2026-06-04" },
  { id: "KB-04", title: "Site visit cancellation process", category: "Site Visit", views: 64, updated: "2026-05-28" },
  { id: "KB-05", title: "RERA compliance verification", category: "Compliance", views: 55, updated: "2026-06-02" },
  { id: "KB-06", title: "Escalation policy and SLA thresholds", category: "Process", views: 211, updated: "2026-06-06" },
  { id: "KB-07", title: "Contact quality standards", category: "Contact Quality", views: 73, updated: "2026-05-25" },
];

// NOTE: these articles are seeded client-side — there is no KnowledgeArticle
// model yet, so a newly authored article lives only for this session. Wire this
// to a real router before relying on persistence.
export function KnowledgeBaseTab() {
  const [search, setSearch] = useState("");
  const [articles, setArticles] = useState<Article[]>(KB_ARTICLES);
  const [reading, setReading] = useState<Article | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({ title: "", category: "", body: "" });

  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase()),
  );

  function saveDraft() {
    const title = draft.title.trim();
    if (!title) return;
    const article: Article = {
      id: `KB-${String(articles.length + 1).padStart(2, "0")}`,
      title,
      category: draft.category.trim() || "General",
      views: 0,
      updated: new Date().toISOString().slice(0, 10),
      body: draft.body.trim() || undefined,
    };
    setArticles((prev) => [article, ...prev]);
    setComposing(false);
    setDraft({ title: "", category: "", body: "" });
    toast.success("Article created");
  }

  return (
    <>
      <PageHead
        title="Knowledge Base"
        subtitle="SOP articles, troubleshooting guides and escalation policies."
        action={
          <button
            onClick={() => setComposing(true)}
            className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition"
          >
            + New Article
          </button>
        }
      />

      <div className="mb-4">
        <input
          placeholder="Search articles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <Section title={`${filtered.length} articles`}>
        <div className="space-y-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0"
            >
              <div>
                <div className="font-semibold text-navy">{a.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {a.category} · {a.views} views · Updated {a.updated}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="new">{a.category}</Badge>
                <button
                  onClick={() => setReading(a)}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  View →
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Reader modal */}
      {reading && (
        <Modal onClose={() => setReading(null)}>
          <div className="mb-1 text-xs font-semibold text-muted-foreground">{reading.category}</div>
          <h2 className="text-lg font-bold text-navy">{reading.title}</h2>
          <div className="mt-1 text-xs text-muted-foreground">
            {reading.views} views · Updated {reading.updated}
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-navy/80">
            {reading.body ?? "This article doesn't have body content yet."}
          </p>
        </Modal>
      )}

      {/* Compose modal */}
      {composing && (
        <Modal onClose={() => setComposing(false)}>
          <h2 className="mb-4 text-lg font-bold text-navy">New Article</h2>
          <div className="space-y-3">
            <input
              autoFocus
              placeholder="Title"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <input
              placeholder="Category"
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <textarea
              placeholder="Write the article…"
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              rows={6}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setComposing(false)}
              className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={saveDraft}
              disabled={!draft.title.trim()}
              className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 disabled:opacity-40"
            >
              Publish
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-navy"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
