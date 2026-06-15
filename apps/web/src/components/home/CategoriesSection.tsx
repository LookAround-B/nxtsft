import Link from "next/link";
import { CATEGORIES } from "@/components/home/homeData";
import { Eyebrow } from "@/components/home/Eyebrow";

export function CategoriesSection() {
  return (
    <section className="px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5" data-reveal>
            <Eyebrow>Browse by Type</Eyebrow>
            <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
              Top Categories
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-6">
            {CATEGORIES.map(({ label, Icon, type }, i) => (
              <Link
                key={label}
                href={`/properties?type=${encodeURIComponent(type)}`}
                data-reveal="scale"
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/40 p-4 text-center transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg sm:gap-3 sm:p-5"
                style={{ transitionDelay: `${i * 55}ms` }}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white sm:h-12 sm:w-12">
                  <Icon size={18} strokeWidth={1.75} className="sm:hidden" />
                  <Icon size={22} strokeWidth={1.75} className="hidden sm:block" />
                </span>
                <span className="font-display text-[11px] font-bold leading-tight text-navy sm:text-sm">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
