"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Section, Badge } from "@/components/portal/PortalShell";
import { PageHead } from "./shared";

const KB_ARTICLES = [
  { id: "KB-01", title: "How to resolve billing disputes", category: "Billing", views: 142, updated: "2026-05-30" },
  { id: "KB-02", title: "Listing accuracy correction workflow", category: "Listing Accuracy", views: 98, updated: "2026-06-01" },
  { id: "KB-03", title: "Technical troubleshooting — OTP", category: "Technical", views: 87, updated: "2026-06-04" },
  { id: "KB-04", title: "Site visit cancellation process", category: "Site Visit", views: 64, updated: "2026-05-28" },
  { id: "KB-05", title: "RERA compliance verification", category: "Compliance", views: 55, updated: "2026-06-02" },
  { id: "KB-06", title: "Escalation policy and SLA thresholds", category: "Process", views: 211, updated: "2026-06-06" },
  { id: "KB-07", title: "Contact quality standards", category: "Contact Quality", views: 73, updated: "2026-05-25" },
];

export function KnowledgeBaseTab() {
  const [search, setSearch] = useState("");
  const filtered = KB_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <PageHead
        title="Knowledge Base"
        subtitle="SOP articles, troubleshooting guides and escalation policies."
        action={
          <button
            onClick={() => toast.success("New article draft created")}
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
                  onClick={() => toast(`Opening: ${a.title}`)}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  View →
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
