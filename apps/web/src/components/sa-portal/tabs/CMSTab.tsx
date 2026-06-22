"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Section, Badge } from "@/components/portal/PortalShell";
import { TabHeader } from "./shared";
import { trpc } from "@/lib/trpc";

const EMPTY_FORM = { title: "", path: "/", body: "", scheduledAt: "" };

export function CMSTab() {
  const pagesQ = trpc.superAdmin.cmsPages.useQuery();
  const createPage = trpc.superAdmin.createCmsPage.useMutation({
    onSuccess: () => { pagesQ.refetch(); setShowModal(false); setForm({ ...EMPTY_FORM }); toast.success("Page draft created"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const publishPage = trpc.superAdmin.publishCmsPage.useMutation({
    onSuccess: () => { pagesQ.refetch(); toast.success("Page published"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const pages = pagesQ.data ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.path.startsWith("/")) { toast.error("Path must start with /"); return; }
    createPage.mutate({
      title: form.title,
      path: form.path,
      body: form.body || undefined,
      scheduledAt: form.scheduledAt || undefined,
    });
  };

  return (
    <>
      <TabHeader
        title="Content CMS"
        subtitle="Marketing pages, blog and hero content."
        action={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep transition hover:opacity-90"
          >
            <Plus size={13} /> New Page
          </button>
        }
      />
      {pagesQ.isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading pages…</p>
      ) : (
        <Section title="Pages">
          {pages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No pages yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th className="py-2">Title</th>
                    <th>Path</th>
                    <th>Status</th>
                    <th>Editor</th>
                    <th>Updated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p) => (
                    <tr key={p.id}>
                      <td className="font-semibold text-navy">{p.title}</td>
                      <td className="font-mono text-xs">{p.path}</td>
                      <td>
                        <Badge tone={p.status === "published" ? "success" : p.status === "draft" ? "warm" : "new"}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="text-xs">{p.editor.name}</td>
                      <td className="text-xs text-muted-foreground">
                        {new Date(p.updatedAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="text-right">
                        {p.status !== "published" && (
                          <button onClick={() => publishPage.mutate({ id: p.id })} disabled={publishPage.isPending}
                            className="text-xs font-semibold text-accent hover:underline disabled:opacity-40">
                            Publish
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-navy">New Page</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-secondary"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy">Title *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Blog: Mumbai 2027 Outlook" required
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy">Path *</label>
                <input value={form.path} onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
                  placeholder="/blog/my-article" required
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy">Body</label>
                <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Page content…" rows={4}
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy">Schedule Date (optional)</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-navy transition hover:bg-secondary">Cancel</button>
                <button type="submit" disabled={createPage.isPending} className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-bold text-white shadow-sm shadow-accent/30 transition hover:opacity-90 disabled:opacity-50">
                  {createPage.isPending ? "Creating…" : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
