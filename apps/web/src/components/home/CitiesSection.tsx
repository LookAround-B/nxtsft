import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CITIES } from "@/components/home/homeData";
import { Eyebrow } from "@/components/home/Eyebrow";

export function CitiesSection() {
  return (
    <section className="px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5" data-reveal>
            <Eyebrow>Pan India Coverage</Eyebrow>
            <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
              Explore Real Estate in Popular Cities
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              From metro hubs to emerging markets — find properties wherever you need to be.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {CITIES.map(({ label, Icon, tagline }, i) => (
              <Link
                key={label}
                href={`/properties?city=${encodeURIComponent(label)}`}
                data-reveal="scale"
                className="group flex flex-col items-center rounded-xl border border-border bg-secondary/30 p-4 text-center transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                style={{ transitionDelay: `${i * 40}ms` }}
              >
                <span className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <span className="mb-0.5 text-sm font-bold text-navy">{label}</span>
                <span className="text-[10px] leading-tight text-muted-foreground">{tagline}</span>
              </Link>
            ))}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <Link
              href="/properties"
              className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-all hover:gap-2"
            >
              View all cities <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
