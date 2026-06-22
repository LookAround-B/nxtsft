"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, Search, Clock, Unlock } from "lucide-react";
import { StatCard, Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { downloadCSV } from "@/lib/download-csv";
import { PageHead } from "./PageHead";

type ViewRecord = {
  id: string;
  durationSec: number;
  contactUnlocked: boolean;
  createdAt: string;
  viewer: string;
  property: {
    id: string; slug: string; title: string; bhk: string | null; price: number;
    images: string[]; location: { city: string; locality: string } | null;
  } | null;
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function BuyerActivitySection() {
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const activityQ = trpc.admin.buyerActivity.useQuery({
    search: search.trim() || undefined,
    cursor,
    limit: 25,
  });

  const items = activityQ.data?.items ?? [];

  const fmtDur = (s: number) => {
    if (s === 0) return null;
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <Section title="Home Buyer Activity Feed">
      <p className="mb-3 text-xs text-muted-foreground">
        Every property page viewed by a registered Home Buyer — newest first.
      </p>

      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCursor(undefined); }}
          placeholder="Filter by buyer name or email…"
          className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {activityQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!activityQ.isLoading && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <Eye size={24} className="mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No buyer activity yet.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="divide-y divide-border rounded-xl border border-border">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 px-4 py-3">
              <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                {item.buyer?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-navy">
                    {item.buyer?.name ?? "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.buyer?.email}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                  <Eye size={11} />
                  <span>viewed</span>
                  {item.property ? (
                    <Link
                      href={`/properties/${item.property.slug}`}
                      target="_blank"
                      className="font-semibold text-accent hover:underline"
                    >
                      {item.property.title}
                    </Link>
                  ) : (
                    <span className="italic">deleted property</span>
                  )}
                  {item.property?.location && (
                    <span className="text-muted-foreground/70">
                      · {item.property.location.locality}, {item.property.location.city}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/70">
                  <span>{timeAgo(item.createdAt)}</span>
                  {fmtDur(item.durationSec) && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {fmtDur(item.durationSec)}
                    </span>
                  )}
                  {item.contactUnlocked && (
                    <span className="flex items-center gap-1 font-semibold text-emerald-600">
                      <Unlock size={10} />
                      Contact unlocked
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activityQ.data?.hasMore && (
        <button
          onClick={() => setCursor(activityQ.data.nextCursor ?? undefined)}
          disabled={activityQ.isLoading}
          className="mt-3 w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-accent hover:text-accent disabled:opacity-50"
        >
          Load more
        </button>
      )}
    </Section>
  );
}

export function ViewsTab() {
  const [filter, setFilter] = useState("");
  const viewsQ = trpc.propertyViews.analytics.useQuery({ limit: 200 });
  const views = (viewsQ.data?.items ?? []) as unknown as ViewRecord[];
  const totalViews = viewsQ.data?.totalViews ?? 0;
  const unlockedViews = viewsQ.data?.unlockedViews ?? 0;

  const filtered = filter
    ? views.filter(
        (v) =>
          v.viewer.toLowerCase().includes(filter.toLowerCase()) ||
          (v.property?.title ?? "").toLowerCase().includes(filter.toLowerCase()) ||
          (v.property?.location?.city ?? "").toLowerCase().includes(filter.toLowerCase()),
      )
    : views;

  const fmtDur = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);
  const fmtWhen = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const uniqueUsers = new Set(views.map((v) => v.viewer)).size;
  const unlockRate = totalViews ? Math.round((unlockedViews / totalViews) * 100) : 0;

  const viewsPerProp: Record<string, { title: string; slug: string; count: number }> = {};
  for (const v of views) {
    if (!v.property) continue;
    if (!viewsPerProp[v.property.id])
      viewsPerProp[v.property.id] = { title: v.property.title, slug: v.property.slug, count: 0 };
    viewsPerProp[v.property.id].count++;
  }
  const topProps = Object.entries(viewsPerProp).sort(([, a], [, b]) => b.count - a.count).slice(0, 8);
  const maxCount = topProps.length ? topProps[0][1].count : 1;

  const handleDownloadCSV = () => {
    downloadCSV(
      "property-views.csv",
      ["ID", "Viewer", "Property", "City", "Viewed At", "Duration (s)", "Unlocked"],
      views.map((v) => [
        v.id,
        v.viewer,
        v.property?.title ?? "",
        v.property?.location?.city ?? "",
        fmtWhen(v.createdAt),
        v.durationSec,
        v.contactUnlocked ? "Yes" : "No",
      ]),
    );
  };

  return (
    <>
      <PageHead title="Property Views" subtitle="Who checked which property — full view analytics." />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Views" value={String(totalViews)} sub="all time" />
        <StatCard label="Unique Viewers" value={String(uniqueUsers)} sub="in recent sample" />
        <StatCard label="Unlock Rate" value={`${unlockRate}%`} sub="views → contact unlocked" accent="text-emerald-600" />
        <StatCard label="Contacts Unlocked" value={String(unlockedViews)} sub="total" />
      </div>

      {viewsQ.isLoading ? (
        <Section title="Views by Property"><p className="py-8 text-center text-sm text-muted-foreground">Loading…</p></Section>
      ) : views.length === 0 ? (
        <Section title="View Records"><p className="py-8 text-center text-sm text-muted-foreground">No property views recorded yet.</p></Section>
      ) : (
        <>
          <Section title="Views by Property">
            <div className="space-y-3">
              {topProps.map(([pid, { title, slug, count }]) => {
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={pid} className="flex items-center gap-3">
                    <Link href={`/properties/${slug}`} className="w-52 shrink-0 truncate text-xs font-semibold text-navy hover:text-accent">
                      {title}
                    </Link>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-3 rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right font-mono text-xs font-bold text-navy">{count}</span>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section
            title="All View Records"
            action={
              <div className="flex items-center gap-2">
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search viewer or property…"
                  className="rounded-md border border-border bg-white px-3 py-1.5 text-xs outline-none focus:border-accent"
                />
                <button onClick={handleDownloadCSV} className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-accent">
                  Download CSV
                </button>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Viewer</th>
                    <th>Property</th>
                    <th>City</th>
                    <th>Viewed At</th>
                    <th>Duration</th>
                    <th>Unlocked</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => (
                    <tr key={v.id}>
                      <td className="font-semibold text-navy">{v.viewer}</td>
                      <td className="max-w-50">
                        {v.property ? (
                          <Link href={`/properties/${v.property.slug}`} className="block truncate text-sm font-medium text-navy hover:text-accent">
                            {v.property.title}
                          </Link>
                        ) : <span className="text-xs text-muted-foreground">removed</span>}
                      </td>
                      <td className="text-xs text-muted-foreground">{v.property?.location?.city ?? "—"}</td>
                      <td className="font-mono text-xs text-muted-foreground">{fmtWhen(v.createdAt)}</td>
                      <td className="font-mono text-xs">{v.durationSec > 0 ? fmtDur(v.durationSec) : "—"}</td>
                      <td><Badge tone={v.contactUnlocked ? "success" : "cold"}>{v.contactUnlocked ? "Yes" : "No"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}

      <BuyerActivitySection />
    </>
  );
}
