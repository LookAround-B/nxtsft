"use client";
import { use } from "react";
import Link from "next/link";
import {
  Building2, MapPin, Globe, CheckCircle2, Calendar,
  ArrowLeft, IndianRupee, Maximize2, Home,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
const STATUS_COLOR: Record<string, string> = {
  Ongoing:   "bg-blue-50 text-blue-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Upcoming:  "bg-amber-50 text-amber-700",
};

function fmt(n: bigint | number | null | undefined): string {
  if (n == null) return "";
  const v = typeof n === "bigint" ? Number(n) : n;
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)} Cr`;
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(0)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
}

export default function BuilderProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: builder, isLoading } = trpc.builders.publicGet.useQuery({ slug });

  if (isLoading) {
    return (
      <>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </>
    );
  }

  if (!builder) {
    return (
      <>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <Building2 size={48} className="text-muted-foreground/30" />
          <p className="font-semibold text-navy">Builder not found</p>
          <Link href="/builders" className="text-sm text-accent hover:underline">← Back to directory</Link>
        </div>
      </>
    );
  }

  const ongoing   = builder.projects.filter((p) => p.status === "Ongoing");
  const upcoming  = builder.projects.filter((p) => p.status === "Upcoming");
  const completed = builder.projects.filter((p) => p.status === "Completed");

  return (
    <>
      <main className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <Link href="/builders" className="mb-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-accent">
              <ArrowLeft size={12} /> Back to Builders
            </Link>
            <div className="flex flex-wrap items-start gap-5">
              <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl border border-border bg-accent/10 text-accent">
                {builder.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={builder.logo} alt={builder.companyName} className="h-14 w-14 rounded-xl object-contain" />
                ) : (
                  <Building2 size={28} strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-black text-navy">{builder.companyName}</h1>
                  {builder.verified && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={11} /> Verified Partner
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {(builder.city || builder.state) && (
                    <span className="flex items-center gap-1"><MapPin size={11} />{[builder.city, builder.state].filter(Boolean).join(", ")}</span>
                  )}
                  {builder.established && (
                    <span className="flex items-center gap-1"><Calendar size={11} />Est. {builder.established}</span>
                  )}
                  {builder.website && (
                    <a href={builder.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-accent">
                      <Globe size={11} />{builder.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
                {builder.description && (
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{builder.description}</p>
                )}
              </div>
              {/* Stats */}
              <div className="flex gap-4">
                {[
                  { label: "Total Projects", value: builder._count.projects },
                  { label: "Ongoing",        value: ongoing.length },
                  { label: "Completed",      value: completed.length },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-center">
                    <div className="font-display text-xl font-black text-navy">{value}</div>
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {builder.projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <Home size={32} className="mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No projects listed yet for this builder.</p>
            </div>
          ) : (
            <>
              {[
                { label: "Ongoing Projects",   projects: ongoing },
                { label: "Upcoming Projects",  projects: upcoming },
                { label: "Completed Projects", projects: completed },
              ]
                .filter(({ projects }) => projects.length > 0)
                .map(({ label, projects }) => (
                  <section key={label} className="mb-10">
                    <h2 className="mb-4 font-display text-lg font-bold text-navy">{label}</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
                    </div>
                  </section>
                ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}

type ProjectData = {
  id: string; slug: string; name: string; city: string; area: string | null;
  type: string; status: string; reraNo: string | null;
  priceMin: bigint | null; priceMax: bigint | null;
  sftMin: number | null; sftMax: number | null;
  totalUnits: number | null; amenities: string[]; description: string | null;
};

function ProjectCard({ project: p }: { project: ProjectData }) {
  const priceRange = [fmt(p.priceMin), fmt(p.priceMax)].filter(Boolean).join(" – ");
  const sftRange   = [p.sftMin, p.sftMax].filter(Boolean).join(" – ");

  return (
    <div className="rounded-2xl border border-border bg-white p-5 transition hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold text-navy">{p.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={10} />{[p.area, p.city].filter(Boolean).join(", ")}
          </p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[p.status] ?? "bg-secondary text-navy"}`}>
          {p.status}
        </span>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-navy">{p.type}</span>
        {priceRange && (
          <p className="flex items-center gap-1"><IndianRupee size={10} />{priceRange}</p>
        )}
        {sftRange && (
          <p className="flex items-center gap-1"><Maximize2 size={10} />{sftRange} sq.ft</p>
        )}
        {p.totalUnits != null && (
          <p className="flex items-center gap-1"><Building2 size={10} />{p.totalUnits} units</p>
        )}
      </div>

      {p.amenities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {p.amenities.slice(0, 4).map((a) => (
            <span key={a} className="rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">{a}</span>
          ))}
          {p.amenities.length > 4 && (
            <span className="rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">+{p.amenities.length - 4}</span>
          )}
        </div>
      )}

      {p.reraNo && (
        <p className="mt-3 text-[10px] text-muted-foreground/60">RERA: {p.reraNo}</p>
      )}
    </div>
  );
}
