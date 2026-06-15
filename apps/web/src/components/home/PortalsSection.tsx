import Link from "next/link";
import { portals } from "@/data/static";
import { PORTAL_COLORS } from "@/components/home/homeData";
import { Eyebrow } from "@/components/home/Eyebrow";

function portalInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function PortalsSection() {
  return (
    <section className="px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 text-center" data-reveal>
            <Eyebrow>For Every Stakeholder</Eyebrow>
            <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
              Five purpose-built portals
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              From super-admin command to first-time buyers — everyone gets a dedicated workspace.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {portals.map((p, i) => {
              const colorClass = PORTAL_COLORS[p.accent] ?? "bg-accent/10 text-accent";
              return (
                <Link
                  key={p.path}
                  href={p.path}
                  data-reveal="scale"
                  className={`spotlight group relative overflow-hidden rounded-2xl border border-border bg-secondary/30 p-5 text-center transition hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10
                    ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div
                    className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-sm font-black tracking-tight transition group-hover:scale-110 sm:h-14 sm:w-14 sm:text-base ${colorClass}`}
                  >
                    {portalInitials(p.name)}
                  </div>
                  <div className="mt-3 font-display text-sm font-bold text-navy">{p.name}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {p.role}
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    Enter →
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
